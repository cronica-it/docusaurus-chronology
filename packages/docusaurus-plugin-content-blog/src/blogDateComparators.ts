/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {BlogPost} from '@docusaurus/plugin-content-blog';

// Compare the number of milliseconds, with the most recent posts at the top.
const compareDates = (aDate: Date, bDate: Date): number =>
  bDate.getTime() - aDate.getTime();

// If available, prefer the lastUpdatedAt, otherwise fall back to post date.
export const blogDateNewestComparator = (a: BlogPost, b: BlogPost): number => {
  if (a.metadata.lastUpdatedAt || b.metadata.lastUpdatedAt) {
    const aDate = a.metadata.lastUpdatedAt
      ? new Date(a.metadata.lastUpdatedAt * 1000)
      : a.metadata.date;
    const bDate = b.metadata.lastUpdatedAt
      ? new Date(b.metadata.lastUpdatedAt * 1000)
      : b.metadata.date;

    const value: number = compareDates(aDate, bDate);
    if (value !== 0) {
      return value;
    }
    // If they are the same, fall through and compare posts dates.
  }

  return compareDates(a.metadata.date, b.metadata.date);
};
