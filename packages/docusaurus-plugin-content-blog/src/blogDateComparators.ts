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

export const blogDateComparator = (a: BlogPost, b: BlogPost): number => {
  // If event dates are available, prefer them over post creation dates.
  if (a.metadata.eventDate || b.metadata.eventDate) {
    let aDate: Date = a.metadata.eventDate
      ? a.metadata.eventDate
      : a.metadata.date;
    let bDate: Date = b.metadata.eventDate
      ? b.metadata.eventDate
      : b.metadata.date;

    let value: number = compareDates(aDate, bDate);
    if (value !== 0) {
      return value;
    }

    // For identical event dates, use event end dates if available,
    // use them as secondary criteria.
    if (a.metadata.eventEndDate || b.metadata.eventEndDate) {
      if (a.metadata.eventEndDate) {
        aDate = a.metadata.eventEndDate;
      }
      if (b.metadata.eventEndDate) {
        bDate = b.metadata.eventEndDate;
      }

      value = compareDates(aDate, bDate);
      if (value !== 0) {
        return value;
      }
    }
    // If all are the same, fall through and compare posts creation dates.
  }

  return compareDates(a.metadata.date, b.metadata.date);
};
