/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import logger from '@docusaurus/logger';
import {
  normalizeUrl,
  docuHash,
  aliasedSitePath,
  getPluginI18nPath,
  posixPath,
  addTrailingPathSeparator,
  createAbsoluteFilePathMatcher,
  getContentPathList,
  getDataFilePath,
  DEFAULT_PLUGIN_ID,
} from '@docusaurus/utils';
import {
  generateBlogPosts,
  getSourceToPermalink,
  getBlogTags,
  getBlogNamedAuthors,
  paginateBlogPosts,
  shouldBeListed,
} from './blogUtils';
import footnoteIDFixer from './remark/footnoteIDFixer';
import {translateContent, getTranslationFiles} from './translations';
import {createBlogFeedFiles} from './feed';

import {
  toNamedAuthorsProp,
  toNamedAuthorProp,
  toTagProp,
  toTagsProp,
} from './props';
import {blogDateNewestComparator} from './blogDateComparators';
import type {BlogContentPaths, BlogMarkdownLoaderOptions} from './types';
import type {LoadContext, Plugin, HtmlTags} from '@docusaurus/types';
import type {
  PluginOptions,
  BlogPostFrontMatter,
  BlogPostMetadata,
  Assets,
  BlogTag,
  BlogTags,
  BlogNamedAuthor,
  BlogNamedAuthors,
  BlogContent,
  BlogPaginated,
  ChronologyRecord,
} from '@docusaurus/plugin-content-blog';

export default async function pluginContentBlog(
  context: LoadContext,
  options: PluginOptions,
): Promise<Plugin<BlogContent>> {
  const {
    siteDir,
    siteConfig,
    generatedFilesDir,
    localizationDir,
    i18n: {currentLocale},
  } = context;
  const {onBrokenMarkdownLinks, baseUrl} = siteConfig;

  const contentPaths: BlogContentPaths = {
    contentPath: path.resolve(siteDir, options.path),
    contentPathLocalized: getPluginI18nPath({
      localizationDir,
      pluginName: 'docusaurus-plugin-content-blog',
      pluginId: options.id,
    }),
  };
  const pluginId = options.id ?? DEFAULT_PLUGIN_ID;

  const pluginDataDirRoot = path.join(
    generatedFilesDir,
    'docusaurus-plugin-content-blog',
  );
  const dataDir = path.join(pluginDataDirRoot, pluginId);
  const aliasedSource = (source: string) =>
    `~blog/${posixPath(path.relative(pluginDataDirRoot, source))}`;

  const authorsMapFilePath = await getDataFilePath({
    filePath: options.authorsMapPath,
    contentPaths,
  });

  return {
    name: 'docusaurus-plugin-content-blog',

    getPathsToWatch() {
      const {include} = options;
      const contentMarkdownGlobs = getContentPathList(contentPaths).flatMap(
        (contentPath) => include.map((pattern) => `${contentPath}/${pattern}`),
      );

      return [authorsMapFilePath, ...contentMarkdownGlobs].filter(
        Boolean,
      ) as string[];
    },

    getTranslationFiles() {
      return getTranslationFiles(options);
    },

    // Fetches blog contents and returns metadata for the necessary routes.
    async loadContent() {
      const {
        postsPerPage: postsPerPageOption,
        routeBasePath,
        tagsBasePath,
        authorsBasePath,
        blogDescription,
        blogTitle,
        blogSidebarTitle,
        pageBasePath,
      } = options;

      const baseBlogUrl = normalizeUrl([baseUrl, routeBasePath]);
      const blogTagsListPath = normalizeUrl([baseBlogUrl, tagsBasePath]);
      // logger.info(`authorsBasePath ${authorsBasePath}`);
      const blogAuthorsListPath = normalizeUrl([baseBlogUrl, authorsBasePath]);
      // logger.info(`blogAuthorsListPath ${blogAuthorsListPath}`);
      const blogPosts = await generateBlogPosts(contentPaths, context, options);
      const listedBlogPosts = blogPosts.filter(shouldBeListed);

      if (!blogPosts.length) {
        return {
          blogSidebarTitle,
          blogPosts: [],
          blogPostsNewest: [],
          blogListPaginated: [],
          blogTags: {},
          blogTagsListPath,
          blogTagsPaginated: [],
          blogNamedAuthors: {},
          blogAuthorsListPath,
          blogAuthorsPaginated: [],
        };
      }

      // Create a new array with the entries sorted by creation/modification
      // date, to be used in feeds and in a separate web page.
      const blogPostsNewest = [...blogPosts].sort(blogDateNewestComparator);

      // Collocate next and prev metadata.
      listedBlogPosts.forEach((blogPost, index) => {
        const prevItem = index > 0 ? listedBlogPosts[index - 1] : null;
        if (prevItem) {
          blogPost.metadata.prevItem = {
            title: prevItem.metadata.title,
            permalink: prevItem.metadata.permalink,
          };
        }

        const nextItem =
          index < listedBlogPosts.length - 1
            ? listedBlogPosts[index + 1]
            : null;
        if (nextItem) {
          blogPost.metadata.nextItem = {
            title: nextItem.metadata.title,
            permalink: nextItem.metadata.permalink,
          };
        }
      });

      const blogListPaginated: BlogPaginated[] = paginateBlogPosts({
        blogPosts: listedBlogPosts,
        blogTitle,
        blogDescription,
        postsPerPageOption,
        basePageUrl: baseBlogUrl,
        pageBasePath,
      });

      const blogTags: BlogTags = getBlogTags({
        blogPosts,
        postsPerPageOption,
        blogDescription,
        blogTitle,
        pageBasePath,
      });

      const blogNamedAuthors: BlogNamedAuthors = options.generateAuthorsPages
        ? getBlogNamedAuthors({
            blogPosts,
            postsPerPageOption,
            blogDescription,
            blogTitle,
            pageBasePath,
          })
        : {};

      // if (options.generateAuthorsPages) {
      //   logger.info(
      //     `blogNamedAuthors ${options.id} ${options.routeBasePath} `+
      //     `${options.path} '${options.blogDescription}'`,
      //   );
      //   Object.keys(blogNamedAuthors).forEach((key) => {
      //     logger.info(blogNamedAuthors[key]);
      //   });
      // }

      return {
        blogSidebarTitle,
        blogPosts,
        blogPostsNewest,
        blogListPaginated,
        blogTags,
        blogTagsListPath,
        blogNamedAuthors,
        blogAuthorsListPath,
      };
    },

    async contentLoaded({content: blogContents, actions}) {
      const {
        blogListComponent,
        blogPostComponent,
        blogTagsListComponent,
        blogTagsPostsComponent,
        blogAuthorsListComponent,
        blogAuthorsPostsComponent,
        blogArchiveComponent,
        routeBasePath,
        archiveBasePath,
      } = options;

      const {addRoute, createData, setGlobalData} = actions;
      const {
        blogSidebarTitle,
        blogPosts,
        blogListPaginated,
        blogTags,
        blogTagsListPath,
        blogNamedAuthors,
        blogAuthorsListPath,
      } = blogContents;

      const listedBlogPosts = blogPosts.filter(shouldBeListed);

      const blogItemsToMetadata: {[postId: string]: BlogPostMetadata} = {};

      const sidebarBlogPosts =
        options.blogSidebarCount === 'ALL'
          ? blogPosts
          : blogPosts.slice(0, options.blogSidebarCount);

      function blogPostItemsModule(items: string[]) {
        return items.map((postId) => {
          const blogPostMetadata = blogItemsToMetadata[postId]!;
          return {
            content: {
              __import: true,
              path: blogPostMetadata.source,
              query: {
                truncated: true,
              },
            },
          };
        });
      }

      if (archiveBasePath && listedBlogPosts.length) {
        const archiveUrl = normalizeUrl([
          baseUrl,
          routeBasePath,
          archiveBasePath,
        ]);
        // Create a blog archive route
        const archiveProp = await createData(
          `${docuHash(archiveUrl)}.json`,
          JSON.stringify({blogPosts: listedBlogPosts}, null, 2),
        );
        addRoute({
          path: archiveUrl,
          component: blogArchiveComponent,
          exact: true,
          modules: {
            archive: aliasedSource(archiveProp),
          },
        });
      }

      // This prop is useful to provide the blog list sidebar
      const sidebarProp = await createData(
        // Note that this created data path must be in sync with
        // metadataPath provided to mdx-loader.
        `blog-post-list-prop-${pluginId}.json`,
        JSON.stringify(
          {
            title: blogSidebarTitle,
            items: sidebarBlogPosts.map((blogPost) => ({
              title: blogPost.metadata.title,
              permalink: blogPost.metadata.permalink,
              unlisted: blogPost.metadata.unlisted,
            })),
          },
          null,
          2,
        ),
      );

      // Create routes for blog entries.
      await Promise.all(
        blogPosts.map(async (blogPost) => {
          const {id, metadata} = blogPost;
          await createData(
            // Note that this created data path must be in sync with
            // metadataPath provided to mdx-loader.
            `${docuHash(metadata.source)}.json`,
            JSON.stringify(metadata, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: blogPostComponent,
            exact: true,
            modules: {
              sidebar: aliasedSource(sidebarProp),
              content: metadata.source,
            },
          });

          blogItemsToMetadata[id] = metadata;
        }),
      );

      // Create routes for blog's paginated list entries.
      await Promise.all(
        blogListPaginated.map(async (listPage) => {
          const {metadata, items} = listPage;
          const {permalink} = metadata;
          const pageMetadataPath = await createData(
            `${docuHash(permalink)}.json`,
            JSON.stringify(metadata, null, 2),
          );

          addRoute({
            path: permalink,
            component: blogListComponent,
            exact: true,
            modules: {
              sidebar: aliasedSource(sidebarProp),
              items: blogPostItemsModule(items),
              metadata: aliasedSource(pageMetadataPath),
            },
          });
        }),
      );

      const chronologyRecords: ChronologyRecord[] = [];
      blogPosts.forEach((post) => {
        if (post.metadata.eventRangeFormatted) {
          chronologyRecords.push({
            interval: post.metadata.eventRangeFormatted,
            title: post.metadata.title,
            permalink: post.metadata.permalink,
            isInternational:
              post.metadata.frontMatter?.tags?.includes('international') ||
              false,
          });
        }
      });

      chronologyRecords.forEach((record) => logger.info(record));

      setGlobalData({
        chronologyRecords,
      });

      // ----------------------------------------------------------------------

      // Tags.
      async function createTagsListPage() {
        const tagsPropPath = await createData(
          `${docuHash(`${blogTagsListPath}-tags`)}.json`,
          JSON.stringify(toTagsProp({blogTags}), null, 2),
        );
        addRoute({
          path: blogTagsListPath,
          component: blogTagsListComponent,
          exact: true,
          modules: {
            sidebar: aliasedSource(sidebarProp),
            tags: aliasedSource(tagsPropPath),
          },
        });
      }

      async function createTagPostsListPage(tag: BlogTag): Promise<void> {
        await Promise.all(
          tag.pages.map(async (blogPaginated) => {
            const {metadata, items} = blogPaginated;
            const tagPropPath = await createData(
              `${docuHash(metadata.permalink)}.json`,
              JSON.stringify(toTagProp({tag, blogTagsListPath}), null, 2),
            );

            // logger.info('createTagPostsListPage metadata');
            // logger.info(metadata);

            const listMetadataPath = await createData(
              `${docuHash(metadata.permalink)}-list.json`,
              JSON.stringify(metadata, null, 2),
            );

            addRoute({
              path: metadata.permalink,
              component: blogTagsPostsComponent,
              exact: true,
              modules: {
                sidebar: aliasedSource(sidebarProp),
                items: blogPostItemsModule(items),
                tag: aliasedSource(tagPropPath),
                listMetadata: aliasedSource(listMetadataPath),
              },
            });
          }),
        );
      }

      if (Object.keys(blogTags).length > 0) {
        await createTagsListPage();
        await Promise.all(Object.values(blogTags).map(createTagPostsListPage));
      }

      // ----------------------------------------------------------------------

      // Authors.

      async function createNamedAuthorsListPage() {
        const authorsPropPath = await createData(
          `${docuHash(`${blogAuthorsListPath}-authors`)}.json`,
          JSON.stringify(toNamedAuthorsProp({blogNamedAuthors}), null, 2),
        );
        addRoute({
          path: blogAuthorsListPath,
          component: blogAuthorsListComponent,
          exact: true,
          modules: {
            sidebar: aliasedSource(sidebarProp),
            authors: aliasedSource(authorsPropPath),
          },
        });
      }

      async function createNamedAuthorPostsListPage(
        author: BlogNamedAuthor,
      ): Promise<void> {
        // assert(author.name)
        // assert(author.permalink)
        await Promise.all(
          author.pages.map(async (blogPage: BlogPaginated) => {
            const {metadata, items} = blogPage;
            // logger.info('createAuthorPostsListPage author');
            // logger.info(toNamedAuthorProp({author, blogAuthorsListPath}));
            const authorPropPath = await createData(
              `${docuHash(metadata.permalink)}.json`,
              JSON.stringify(
                toNamedAuthorProp({author, blogAuthorsListPath}),
                null,
                2,
              ),
            );

            // logger.info('createAuthorPostsListPage metadata');
            // logger.info(metadata);

            const listMetadataPath = await createData(
              `${docuHash(metadata.permalink)}-list.json`,
              JSON.stringify(metadata, null, 2),
            );

            addRoute({
              path: metadata.permalink,
              component: blogAuthorsPostsComponent,
              exact: true,
              modules: {
                sidebar: aliasedSource(sidebarProp),
                items: blogPostItemsModule(items),
                author: aliasedSource(authorPropPath),
                listMetadata: aliasedSource(listMetadataPath),
              },
            });
          }),
        );
      }

      if (
        options.generateAuthorsPages &&
        Object.keys(blogNamedAuthors).length > 0
      ) {
        await createNamedAuthorsListPage();
        await Promise.all(
          Object.values(blogNamedAuthors).map(createNamedAuthorPostsListPage),
        );
      }
    },

    translateContent({content, translationFiles}) {
      return translateContent(content, translationFiles);
    },

    configureWebpack(_config, isServer, utils, content) {
      const {
        admonitions,
        rehypePlugins,
        remarkPlugins,
        truncateMarker,
        beforeDefaultRemarkPlugins,
        beforeDefaultRehypePlugins,
      } = options;

      const markdownLoaderOptions: BlogMarkdownLoaderOptions = {
        siteDir,
        contentPaths,
        truncateMarker,
        sourceToPermalink: getSourceToPermalink(content.blogPosts),
        onBrokenMarkdownLink: (brokenMarkdownLink) => {
          if (onBrokenMarkdownLinks === 'ignore') {
            return;
          }
          logger.report(
            onBrokenMarkdownLinks,
          )`Blog markdown link couldn't be resolved: (url=${brokenMarkdownLink.link}) in path=${brokenMarkdownLink.filePath}`;
        },
      };

      const contentDirs = getContentPathList(contentPaths);
      return {
        resolve: {
          alias: {
            '~blog': pluginDataDirRoot,
          },
        },
        module: {
          rules: [
            {
              test: /\.mdx?$/i,
              include: contentDirs
                // Trailing slash is important, see https://github.com/facebook/docusaurus/pull/3970
                .map(addTrailingPathSeparator),
              use: [
                {
                  loader: require.resolve('@docusaurus/mdx-loader'),
                  options: {
                    admonitions,
                    remarkPlugins,
                    rehypePlugins,
                    beforeDefaultRemarkPlugins: [
                      footnoteIDFixer,
                      ...beforeDefaultRemarkPlugins,
                    ],
                    beforeDefaultRehypePlugins,
                    staticDirs: siteConfig.staticDirectories.map((dir) =>
                      path.resolve(siteDir, dir),
                    ),
                    siteDir,
                    isMDXPartial: createAbsoluteFilePathMatcher(
                      options.exclude,
                      contentDirs,
                    ),
                    metadataPath: (mdxPath: string) => {
                      // Note that metadataPath must be the same/in-sync as
                      // the path from createData for each MDX.
                      const aliasedPath = aliasedSitePath(mdxPath, siteDir);
                      return path.join(
                        dataDir,
                        `${docuHash(aliasedPath)}.json`,
                      );
                    },
                    // For blog posts a title in markdown is always removed
                    // Blog posts title are rendered separately
                    removeContentTitle: true,

                    // Assets allow to convert some relative images paths to
                    // require() calls
                    createAssets: ({
                      frontMatter,
                      metadata,
                    }: {
                      frontMatter: BlogPostFrontMatter;
                      metadata: BlogPostMetadata;
                    }): Assets => ({
                      image: frontMatter.image,
                      authorsImageUrls: metadata.authors.map(
                        (author) => author.imageURL,
                      ),
                    }),
                    markdownConfig: siteConfig.markdown,
                  },
                },
                {
                  loader: path.resolve(__dirname, './markdownLoader.js'),
                  options: markdownLoaderOptions,
                },
              ].filter(Boolean),
            },
          ],
        },
      };
    },

    async postBuild({outDir, content}) {
      if (!options.feedOptions.type) {
        return;
      }
      const {blogPostsNewest} = content;
      if (!blogPostsNewest.length) {
        return;
      }
      await createBlogFeedFiles({
        blogPostsNewest,
        options,
        outDir,
        siteConfig,
        locale: currentLocale,
      });
    },

    injectHtmlTags({content}) {
      if (!content.blogPosts.length || !options.feedOptions.type) {
        return {};
      }

      const feedTypes = options.feedOptions.type;
      const feedTitle = options.feedOptions.title ?? context.siteConfig.title;
      const feedsConfig = {
        rss: {
          type: 'application/rss+xml',
          path: 'rss.xml',
          title: `${feedTitle} RSS Feed`,
        },
        atom: {
          type: 'application/atom+xml',
          path: 'atom.xml',
          title: `${feedTitle} Atom Feed`,
        },
        json: {
          type: 'application/json',
          path: 'feed.json',
          title: `${feedTitle} JSON Feed`,
        },
      };
      const headTags: HtmlTags = [];

      feedTypes.forEach((feedType) => {
        const {
          type,
          path: feedConfigPath,
          title: feedConfigTitle,
        } = feedsConfig[feedType];

        headTags.push({
          tagName: 'link',
          attributes: {
            rel: 'alternate',
            type,
            href: normalizeUrl([
              baseUrl,
              options.routeBasePath,
              feedConfigPath,
            ]),
            title: feedConfigTitle,
          },
        });
      });

      return {
        headTags,
      };
    },
  };
}

export {validateOptions} from './options';
