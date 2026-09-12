import type { Currency } from "@/lib/money";
import { display } from "@/lib/money";
import type { SiteContent, Unit } from "@/lib/content";

export const DAY = 86_400_000;
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** Weekday names in getUTCDay() order (Sunday first). */
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Calendar column headers — weeks start on Monday. */
export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const utc = (y: number, m: number, d: number) => Date.UTC(y, m, d);

/** Today at UTC midnight (matches the calendar's day granularity). */
export const today = (() => {
  const d = new Date();
  return utc(d.getFullYear(), d.getMonth(), d.getDate());
})();

/** "5 Sep 2026" */
export function pretty(t: number): string {
  const d = new Date(t);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/** "Mon 14 Sep", or "Mon 14 Sep 2026" — written out, so there's no dd/mm vs mm/dd to decode. */
export function dayLabel(t: number, withYear = false): string {
  const d = new Date(t);
  const label = `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
  return withYear ? `${label} ${d.getUTCFullYear()}` : label;
}

/** "Monday 14 September 2026" — the spoken label for a calendar day. */
export function fullDay(t: number): string {
  const d = new Date(t);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The same day k months later, clamped to that month's length (31 Jan + 1 → 28 Feb). */
export function addMonths(t: number, k: number): number {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + k;
  const len = new Date(utc(y, m + 1, 0)).getUTCDate();
  return utc(y, m, Math.min(d.getUTCDate(), len));
}

/** "1 night", "3 nights" */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Four" for 4 — spelled out up to ten, digits after that. */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** "At RD$61 / US$1 · rate as of 1 Sep 2026" — printed beside every currency toggle. */
export function fxRateNote(content: SiteContent): string {
  const asOf = content.fxRateAsOf ? ` · rate as of ${pretty(fromIso(content.fxRateAsOf))}` : "";
  return `At RD$${content.fxRate} / US$1${asOf}`;
}

/** ISO yyyy-mm-dd from a UTC timestamp. */
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** UTC timestamp from an ISO yyyy-mm-dd string. */
export function fromIso(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return utc(y, m - 1, d);
}

/** Number of nights between a start/end range (0 when incomplete). */
export function nights(start: number | null, end: number | null): number {
  return start !== null && end !== null ? Math.round((end - start) / DAY) : 0;
}

export interface EstimateLine {
  key: string;
  label: string;
  value: string;
  teal?: boolean;
}

export interface Estimate {
  nights: number;
  months: number;
  mode: "nightly" | "monthly";
  total: number;
  lines: EstimateLine[];
  totalDisplay: string;
}

/**
 * The refundable deposit for a stay of `months` whole months (0 for a short
 * nightly stay): the row with the highest `fromMonths` the stay reaches.
 * No matching row — or an amount of 0 — means no deposit.
 */
export function depositFor(unit: Unit, months: number): number {
  const tier = (unit.deposits ?? [])
    .filter((t) => months >= t.fromMonths)
    .reduce<{ fromMonths: number; amountUsd: number } | null>(
      (best, t) => (!best || t.fromMonths > best.fromMonths ? t : best),
      null,
    );
  return Math.max(0, tier?.amountUsd ?? 0);
}

/** Stays of this many nights or more are billed monthly; shorter ones nightly. */
export const MONTHLY_FROM_NIGHTS = 28;

/** "billed nightly" / "billed as 2 months" — the same split computeEstimate uses. */
export function billingLabel(n: number): string {
  if (n < MONTHLY_FROM_NIGHTS) return "billed nightly";
  return `billed as ${plural(Math.max(1, Math.ceil(n / 30.4)), "month")}`;
}

/** Date-range cost estimate. Short stays bill by the night (utilities included);
 *  long stays bill by whole months + metered power + deposit, less the long-stay
 *  discount. Months are billed from nights (30.4/mo). */
export function computeEstimate(
  unit: Unit,
  start: number | null,
  end: number | null,
  currency: Currency,
  content: SiteContent,
): Estimate {
  const n = nights(start, end);
  const d = (usd: number) => display(usd, currency, content.fxRate);

  // ── Short / vacation stay → nightly ──
  if (n > 0 && n < MONTHLY_FROM_NIGHTS) {
    const rent = unit.priceNightlyUsd * n;
    const deposit = depositFor(unit, 0);
    const lines: EstimateLine[] = [
      { key: "rent", label: `${n} night${n > 1 ? "s" : ""} × ${d(unit.priceNightlyUsd)}`, value: d(rent) },
      { key: "utilities", label: "Power, water & 200 Mbps fibre", value: "Included", teal: true },
    ];
    if (deposit > 0) lines.push({ key: "deposit", label: "Deposit (refundable)", value: d(deposit) });
    const total = rent + deposit;
    return { nights: n, months: 0, mode: "nightly", total, lines, totalDisplay: d(total) };
  }

  // ── Long stay (or no dates yet) → monthly ──
  const months = n ? Math.max(1, Math.ceil(n / 30.4)) : 1;
  const rent = unit.priceUsd * months;
  const power = content.power.baseUsd * months;
  // The biggest discount this many months qualifies for.
  const tier = content.discounts
    .filter((dd) => months >= dd.months)
    .reduce<SiteContent["discounts"][number] | null>((best, dd) => (!best || dd.pct > best.pct ? dd : best), null);
  const discount = Math.round(rent * (tier?.pct ?? 0));
  const deposit = depositFor(unit, months);
  const total = rent + power + deposit - discount;

  const lines: EstimateLine[] = [
    { key: "rent", label: `Rent, ${months} × ${d(unit.priceUsd)}`, value: d(rent) },
    { key: "power", label: "Electricity, metered estimate", value: d(power) },
    { key: "utilities", label: "Water, garbage, 200 Mbps fibre", value: "Included", teal: true },
  ];
  if (deposit > 0) lines.push({ key: "deposit", label: "Deposit (refundable)", value: d(deposit) });
  if (tier && discount > 0) {
    lines.push({
      key: "discount",
      label: `Long-stay discount, ${tier.months} mo+`,
      value: `− ${d(discount)}`,
      teal: true,
    });
  }

  return { nights: n, months, mode: "monthly", total, lines, totalDisplay: d(total) };
}
