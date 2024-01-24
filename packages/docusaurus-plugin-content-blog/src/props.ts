/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// import logger from '@docusaurus/logger';
import type {
  TagsListItem,
  TagModule,
  NamedAuthorsListItem,
  NamedAuthorModule,
} from '@docusaurus/utils';
import type {
  BlogTag,
  BlogTags,
  BlogNamedAuthor,
  BlogNamedAuthors,
} from '@docusaurus/plugin-content-blog';

export function toTagsProp({blogTags}: {blogTags: BlogTags}): TagsListItem[] {
  return Object.values(blogTags)
    .filter((tag) => !tag.unlisted)
    .map((tag) => ({
      label: tag.label,
      permalink: tag.permalink,
      count: tag.items.length,
    }));
}

export function toTagProp({
  blogTagsListPath,
  tag,
}: {
  blogTagsListPath: string;
  tag: BlogTag;
}): TagModule {
  return {
    label: tag.label,
    permalink: tag.permalink,
    allTagsPath: blogTagsListPath,
    count: tag.items.length,
    unlisted: tag.unlisted,
  };
}

export function toNamedAuthorsProp({
  blogNamedAuthors,
}: {
  blogNamedAuthors: BlogNamedAuthors;
}): NamedAuthorsListItem[] {
  return Object.values(blogNamedAuthors)
    .filter((author: BlogNamedAuthor) => !author.unlisted)
    .map((author: BlogNamedAuthor) => ({
      name: author.name,
      permalink: author.permalink,
      count: author.items.length,
    }));
}

export function toNamedAuthorProp({
  blogAuthorsListPath,
  author,
}: {
  blogAuthorsListPath: string;
  author: BlogNamedAuthor;
}): NamedAuthorModule {
  return {
    name: author.name,
    permalink: author.permalink,
    allAuthorsPath: blogAuthorsListPath,
    count: author.items.length,
    unlisted: author.unlisted,
  };
}
