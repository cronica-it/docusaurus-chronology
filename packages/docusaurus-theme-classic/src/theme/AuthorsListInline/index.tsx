/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
// import logger from '@docusaurus/logger';
import Author from '@theme/Author';
import type {Props} from '@theme/AuthorsListInline';

import styles from './styles.module.css';

// authors are from the data model.
export default function AuthorsListInline({authors}: Props): JSX.Element {
  // authors.forEach((a) => { logger.info(a) })
  return (
    <>
      <b>
        <Translate
          id="theme.authors.authorsListLabel"
          description="The label alongside a author list">
          Authors:
        </Translate>
      </b>
      <ul className={clsx(styles.authors, 'padding--none', 'margin-left--sm')}>
        {authors.map(({name, permalink: authorPermalink}) => (
          <li key={authorPermalink} className={styles.author}>
            <Author name={name} permalink={authorPermalink} />
          </li>
        ))}
      </ul>
    </>
  );
}
