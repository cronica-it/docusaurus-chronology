/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import _ from 'lodash';
import {normalizeUrl} from './urlUtils';

/** What the user configures. Only named authors. */
export type NamedAuthor = {
  /** User name */
  name: string;
  /** Permalink to this author's page, without the `/authors/` base path. */
  permalink: string;
};

/** What the authors list page should know about each author. */
export type NamedAuthorsListItem = NamedAuthor & {
  /** Number of posts/docs with this author. */
  count: number;
};

/** What the author's own page should know about the author. */
export type NamedAuthorModule = NamedAuthorsListItem & {
  /** The authors list page's permalink. */
  allAuthorsPath: string;
  /** Is this author unlisted? (when it only contains unlisted items) */
  unlisted: boolean;
};

export type FrontMatterNamedAuthor = string | NamedAuthor;

/**
 * Generate an URL from an author name.
 * Remove diacritics and change spaces to dashes.
 * @param name
 * @returns A string that, if not empty, can be used as URL part
 */
export function makePermalinkFromAuthorName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll(/[-_.,:;]/g, ' ') // preserve as separators
    .replaceAll(/[^a-z\d ]/g, '') // remove other non alphanumeric
    .trim()
    .replaceAll(/ /g, '-')
    .replaceAll(/-+/g, '-') // squash multiple dashes
    .replace(/~-/, '') // remove leading dash
    .replace(/-$/, ''); // remove trailing dash
}

function normalizeFrontMatterAuthor(
  authorsPath: string,
  frontMatterNamedAuthor: FrontMatterNamedAuthor,
): NamedAuthor {
  function toNamedAuthorObject(authorString: string): NamedAuthor {
    return {
      name: authorString,
      permalink: makePermalinkFromAuthorName(authorString),
    };
  }

  // TODO maybe make ensure the permalink is valid url path?
  function normalizeAuthorPermalink(permalink: string): string {
    // Note: we always apply authorsPath on purpose. For versioned docs,
    // v1/doc.md and v2/doc.md authors with custom permalinks don't lead
    // to the same created page.
    // authorsPath is different for each doc version
    return normalizeUrl([authorsPath, permalink]);
  }

  const author: NamedAuthor =
    typeof frontMatterNamedAuthor === 'string'
      ? toNamedAuthorObject(frontMatterNamedAuthor)
      : frontMatterNamedAuthor;

  return {
    name: author.name,
    permalink: normalizeAuthorPermalink(author.permalink),
  };
}

/**
 * Takes author objects as they are defined in front matter, and normalizes each
 * into a standard author object. The permalink is created by appending the
 * sluggified label to `authorsPath`. Front matter authors already containing
 * permalinks would still have `authorsPath` prepended.
 *
 * The result will always be unique by permalinks. The behavior with colliding
 * permalinks is undetermined.
 */
export function normalizeFrontMatterNamedAuthors(
  /** Base path to append the author permalinks to. */
  authorsPath: string,
  /** Can be `undefined`, so that we can directly pipe in
   * `frontMatter.authors`. */
  frontMatterNamedAuthors: FrontMatterNamedAuthor[] | undefined = [],
): NamedAuthor[] {
  const authors = frontMatterNamedAuthors.map((author) =>
    normalizeFrontMatterAuthor(authorsPath, author),
  );

  return _.uniqBy(authors, (author) => author.permalink);
}

type AuthoredItemGroup<Item> = {
  author: NamedAuthor;
  items: Item[];
};

/**
 * Permits to group docs/blog posts by author (provided by front matter).
 *
 * @returns a map from author permalink to the items and other relevant author
 * data.
 * The record is indexed by permalink, because routes must be unique in the end.
 * Labels may vary on 2 MD files but they are normalized. Docs with
 * label='some label' and label='some-label' should end up in the same page.
 */
export function groupAuthoredItems<Item>(
  items: readonly Item[],
  /**
   * A callback telling me how to get the authors list of the current item.
   * Usually simply getting it from some metadata of the current item.
   */
  getItemNamedAuthors: (item: Item) => readonly NamedAuthor[],
): {[permalink: string]: AuthoredItemGroup<Item>} {
  const result: {[permalink: string]: AuthoredItemGroup<Item>} = {};

  items.forEach((item) => {
    getItemNamedAuthors(item).forEach((author) => {
      // Init missing author groups
      // TODO: it's not really clear what should be the behavior if 2
      // authors have the same permalink but the label is different for each
      // For now, the first author found wins
      result[author.permalink] ??= {
        author,
        items: [],
      };

      // Add item to group
      result[author.permalink]!.items.push(item);
    });
  });

  // If user add twice the same author to a md doc (weird but possible),
  // we don't want the item to appear twice in the list...
  Object.values(result).forEach((group) => {
    group.items = _.uniq(group.items);
  });

  return result;
}

/**
 * Permits to get the "author visibility" (hard to find a better name)
 * IE, is this author listed or unlisted
 * And which items should be listed when this author is browsed
 */
export function getAuthorVisibility<Item>({
  items,
  isUnlisted,
}: {
  items: Item[];
  isUnlisted: (item: Item) => boolean;
}): {
  unlisted: boolean;
  listedItems: Item[];
} {
  const allItemsUnlisted = items.every(isUnlisted);
  // When a author is full of unlisted items, we display all the items
  // when author is browsed, but we mark the author as unlisted
  if (allItemsUnlisted) {
    return {unlisted: true, listedItems: items};
  }
  // When a author has some listed items, the author remains listed
  // but we filter its unlisted items
  return {
    unlisted: false,
    listedItems: items.filter((item) => !isUnlisted(item)),
  };
}