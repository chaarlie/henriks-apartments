"use client";

import * as dates from "@/lib/dates";
import { useLocale } from "./client";

/** Bind display helpers to the page language without changing date arithmetic. */
export function useDates() {
  const locale = useLocale();
  return {
    ...dates.calendarLabels(locale),
    pretty: (t: number) => dates.pretty(t, locale),
    dayLabel: (t: number, withYear = false) => dates.dayLabel(t, withYear, locale),
    fullDay: (t: number) => dates.fullDay(t, locale),
    billingLabel: (n: number) => dates.billingLabel(n, locale),
    fxRateNote: (content: Parameters<typeof dates.fxRateNote>[0]) => dates.fxRateNote(content, locale),
    computeEstimate: (...[unit, start, end, currency, content]: Parameters<typeof dates.computeEstimate>) => dates.computeEstimate(unit, start, end, currency, content, locale),
  };
}
