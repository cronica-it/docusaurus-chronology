/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// import logger from '@docusaurus/logger';
import type {
  BlogPostFrontMatter,
  PluginOptions,
} from '@docusaurus/plugin-content-blog';
import type {I18n, LoadContext} from '@docusaurus/types';

// If month/day are not present, extend with defaults.
// Note: It does not accept negative years.
const parseEventDate = ({
  frontMatterEventDate,
}: {
  frontMatterEventDate: string;
}): Date => {
  // For weird reasons, 2 digit years are considered relative to epoch.
  // To allow dates in the antiquity, set explicitly.
  const year: number = parseInt(frontMatterEventDate.replace(/-.*/, ''), 10);

  // Expect YYYY-MM-DD, YYYY-MM, YYYY
  const dateParts: number[] = frontMatterEventDate
    .split('-')
    .map((str) => Number(str));
  let date;
  if (
    dateParts.length === 3 &&
    Number.isInteger(dateParts[0]) &&
    Number.isInteger(dateParts[1]) &&
    Number.isInteger(dateParts[2])
  ) {
    date = new Date(
      dateParts[0] as number,
      dateParts[1] as number,
      dateParts[2],
    );
  } else if (
    dateParts.length === 2 &&
    Number.isInteger(dateParts[0]) &&
    Number.isInteger(dateParts[1])
  ) {
    date = new Date(dateParts[0] as number, dateParts[1] as number, 15);
    date.setFullYear(year);
  } else if (dateParts.length === 1 && Number.isInteger(dateParts[0])) {
    date = new Date(dateParts[0] as number, 7, 1);
  } else {
    // Last resort, try to parse as standard date.
    date = new Date(frontMatterEventDate);
  }

  date.setFullYear(year);
  return date;
};

const formatEventDate = ({
  frontMatterEventDate,
  eventDate,
  i18n,
  hideYear,
}: {
  frontMatterEventDate: string;
  eventDate: Date;
  i18n: I18n;
  hideYear?: boolean;
}): string => {
  const locale = i18n.currentLocale;
  const {calendar} = i18n.localeConfigs[i18n.currentLocale]!;

  // Expect YYYY-MM-DD, YYYY-MM, YYYY
  const dateParts: number[] = frontMatterEventDate
    .split('-')
    .map((str) => Number(str));

  let formattedDate;
  if (
    dateParts.length === 3 &&
    Number.isInteger(dateParts[0]) &&
    Number.isInteger(dateParts[1]) &&
    Number.isInteger(dateParts[2])
  ) {
    // YYYY-MM-DD
    formattedDate = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: hideYear ? undefined : 'numeric',
      timeZone: 'UTC',
      calendar,
    }).format(eventDate);
  } else if (
    dateParts.length === 2 &&
    Number.isInteger(dateParts[0]) &&
    Number.isInteger(dateParts[1])
  ) {
    // YYYY-MM
    formattedDate = new Intl.DateTimeFormat(locale, {
      // day: 'numeric',
      month: 'long',
      year: hideYear ? undefined : 'numeric',
      timeZone: 'UTC',
      calendar,
    }).format(eventDate);
  } else if (dateParts.length === 1 && Number.isInteger(dateParts[0])) {
    // YYYY
    formattedDate = hideYear
      ? ''
      : new Intl.DateTimeFormat(locale, {
          // day: 'numeric',
          // month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
          calendar,
        }).format(eventDate);
  } else {
    // Last resort, try to parse as standard date.
    formattedDate = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: hideYear ? undefined : 'numeric',
      timeZone: 'UTC',
      calendar,
    }).format(eventDate);
  }

  return formattedDate;
};

// The code is a bit tricky; it cannot simply use formatRange()
// because the date may not be present and it must not be shown
// as 15.
const formatEventRange = ({
  frontMatterEventDate,
  eventDate,
  frontMatterEventEndDate,
  eventEndDate,
  i18n,
}: {
  frontMatterEventDate: string;
  eventDate: Date;
  frontMatterEventEndDate: string;
  eventEndDate: Date;
  i18n: I18n;
}): string => {
  const locale = i18n.currentLocale;
  const {calendar} = i18n.localeConfigs[i18n.currentLocale]!;

  const dateParts = frontMatterEventDate
    .split('-')
    .map((str) => parseInt(str, 10));

  const endDateParts: number[] = frontMatterEventEndDate
    .split('-')
    .map((str) => parseInt(str, 10));

  let range = '';
  if (dateParts[0] === endDateParts[0]) {
    // Same year.
    if (
      dateParts.length === 3 &&
      endDateParts.length === 3 &&
      dateParts[1] === endDateParts[1]
    ) {
      // YYYY-MM-DDbegin YYYY-MM-DDend
      // Both have days, same month, format as '1 - 4 November 1993'.
      range = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
        calendar,
      }).formatRange(eventDate, eventEndDate);
    } else if (
      dateParts.length === 2 &&
      endDateParts.length === 2 &&
      dateParts[1] !== endDateParts[1]
    ) {
      // YYYY-MMbegin YYYY-MMend
      // No days, different months, format as 'October - November 1993'.
      range = new Intl.DateTimeFormat(locale, {
        // day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
        calendar,
      }).formatRange(eventDate, eventEndDate);
    } else {
      // No optimizations possible, cannot use formatRange() since the
      // days may not be present and the extrapolated 15 must not be shown.
      const from = new Intl.DateTimeFormat(locale, {
        day: dateParts.length > 2 ? 'numeric' : undefined,
        month: 'long',
        // year: 'numeric',
        timeZone: 'UTC',
        calendar,
      }).format(eventDate);
      const to = new Intl.DateTimeFormat(locale, {
        day: endDateParts.length > 2 ? 'numeric' : undefined,
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
        calendar,
      }).format(eventDate);

      range = `${from} - ${to}`;
    }
  } else {
    // Different years. Manually compose the range.
    const from = formatEventDate({frontMatterEventDate, eventDate, i18n});
    const to = formatEventDate({
      frontMatterEventDate: frontMatterEventEndDate,
      eventDate: eventEndDate,
      i18n,
    });

    range = `${from} - ${to}`;
  }
  return range;
};

// ----------------------------------------------------------------------------

export type ParsedEventDates = {
  eventDate?: Date;
  eventEndDate?: Date;
  eventDateFormatted?: string;
  eventDateFormattedForArchive?: string;
  eventRangeFormatted?: string;
  eventRangeFormattedForArchive?: string;
};

export const parseFrontMatterEventDates = ({
  frontMatter,
  context,
  options,
}: {
  frontMatter: BlogPostFrontMatter;
  context: LoadContext;
  options: PluginOptions;
}): ParsedEventDates => {
  const {i18n} = context;

  const result: ParsedEventDates = {};

  if (frontMatter.event_date) {
    result.eventDate = parseEventDate({
      frontMatterEventDate: frontMatter.event_date,
    });
    result.eventDateFormatted = formatEventDate({
      frontMatterEventDate: frontMatter.event_date,
      eventDate: result.eventDate,
      i18n,
    });
    result.eventDateFormattedForArchive = formatEventDate({
      frontMatterEventDate: frontMatter.event_date,
      eventDate: result.eventDate,
      i18n,
      hideYear: options.hidePostYearInArchive,
    });

    if (frontMatter.event_end_date) {
      result.eventEndDate = parseEventDate({
        frontMatterEventDate: frontMatter.event_end_date,
      });
      result.eventRangeFormatted = formatEventRange({
        frontMatterEventDate: frontMatter.event_date,
        eventDate: result.eventDate,
        frontMatterEventEndDate: frontMatter.event_end_date,
        eventEndDate: result.eventEndDate,
        i18n,
      });
    } else {
      // Actually not a range, only the begin date.
      result.eventRangeFormatted = result.eventDateFormatted;
    }
  }
  // logger.info(result);
  return result;
};
