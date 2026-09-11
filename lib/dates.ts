import type { Currency } from "@/lib/money";
import { display } from "@/lib/money";
import type { SiteContent, Unit } from "@/lib/content";

export const DAY = 86_400_000;
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DOW = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

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

/** Stays of this many nights or more are billed monthly; shorter ones nightly. */
export const MONTHLY_FROM_NIGHTS = 28;

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
    const lines: EstimateLine[] = [
      { key: "rent", label: `${n} night${n > 1 ? "s" : ""} × ${d(unit.priceNightlyUsd)}`, value: d(rent) },
      { key: "utilities", label: "Power, water & 200 Mbps fibre", value: "Included", teal: true },
    ];
    return { nights: n, months: 0, mode: "nightly", total: rent, lines, totalDisplay: d(rent) };
  }

  // ── Long stay (or no dates yet) → monthly ──
  const months = n ? Math.max(1, Math.ceil(n / 30.4)) : 1;
  const rent = unit.priceUsd * months;
  const power = content.power.baseUsd * months;
  const pct = content.discounts
    .filter((dd) => months >= dd.months)
    .reduce((best, dd) => Math.max(best, dd.pct), 0);
  const discount = Math.round(rent * pct);
  const total = rent + power + unit.priceUsd - discount;

  const lines: EstimateLine[] = [
    { key: "rent", label: `Rent, ${months} × ${d(unit.priceUsd)}`, value: d(rent) },
    { key: "power", label: "Electricity, metered estimate", value: d(power) },
    { key: "utilities", label: "Water, garbage, 200 Mbps fibre", value: "Included", teal: true },
    { key: "deposit", label: "Deposit (refundable)", value: d(unit.priceUsd) },
  ];
  if (discount > 0) {
    lines.push({
      key: "discount",
      label: `Long-stay discount, ${content.discounts[0].months} mo+`,
      value: `− ${d(discount)}`,
      teal: true,
    });
  }

  return { nights: n, months, mode: "monthly", total, lines, totalDisplay: d(total) };
}
