/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {translate} from '@docusaurus/Translate';
// import logger from '@docusaurus/logger';
import type {NamedAuthorsListItem} from '@docusaurus/utils';

export const translateAuthorsPageTitle = (): string =>
  translate({
    id: 'theme.authors.authorsPageTitle',
    message: 'Authors',
    description: 'The title of the author list page',
  });

export type AuthorLetterEntry = {
  letter: string;
  authors: NamedAuthorsListItem[];
};

function getAuthorLetter(author: string): string {
  // logger.info(`getAuthorLetter ${author} ${author[0]}`)
  return author[0]!.toUpperCase();
}

/**
 * Takes a list of authors (as provided by the content plugins),
 * and groups them by their initials.
 */
export function listAuthorsByLetters(
  authors: readonly NamedAuthorsListItem[],
): AuthorLetterEntry[] {
  const groups: {[initial: string]: NamedAuthorsListItem[]} = {};
  Object.values(authors).forEach((author) => {
    // logger.info(Object.keys(author))
    if (author.name) {
      const initial = getAuthorLetter(author.name);
      groups[initial] ??= [];
      groups[initial]!.push(author);
    }
  });

  // logger.info(Object.keys(groups))

  return (
    Object.entries(groups)
      // Sort letters
      .sort(([letter1], [letter2]) => letter1.localeCompare(letter2))
      .map(([letter, letterAuthors]) => {
        // Sort authors inside a letter
        const sortedAuthors = letterAuthors.sort((author1, author2) =>
          (author1.name as string).localeCompare(author2.name as string),
        );
        return {letter, authors: sortedAuthors};
      })
  );
}
