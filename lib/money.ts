import type { SiteContent, Unit } from "@/lib/content";

export type Currency = "USD" | "DOP";
export type Term = 1 | 3 | 6 | 12;

/** Format a USD amount into the chosen currency with a thousands separator. */
export function display(usd: number, currency: Currency, fxRate: number): string {
  if (currency === "USD") {
    return `$${Math.round(usd).toLocaleString("en-US")}`;
  }
  return `RD$${Math.round(usd * fxRate).toLocaleString("en-US")}`;
}

/** Discount fraction for a term, from the content's discount tiers. */
export function discountFor(term: Term, discounts: SiteContent["discounts"]): number {
  // highest-eligible tier wins
  return discounts
    .filter((d) => term >= d.months)
    .reduce((best, d) => Math.max(best, d.pct), 0);
}

export interface EstimateLine {
  key: string;
  label: string;
  /** rendered value (may be text like "Included" or "from 6 months") */
  value: string;
  emphasise?: boolean;
}

export interface Estimate {
  discount: number;
  lines: EstimateLine[];
  totalUsd: number;
  totalDisplay: string;
}

/** The live cost estimate — rent + metered power + refundable deposit, with the
 *  long-stay discount applied. Mirrors the derived-values block in the handoff. */
export function computeEstimate(
  unit: Unit,
  term: Term,
  currency: Currency,
  content: SiteContent,
): Estimate {
  const { fxRate, power, discounts } = content;
  const discount = discountFor(term, discounts);

  const monthlyRent = unit.priceUsd * (1 - discount);
  const rentTotal = monthlyRent * term;
  const rentDiscountAmount = unit.priceUsd * term - rentTotal;

  const powerPerMonth =
    power.baseUsd * (unit.priceUsd > power.highThresholdUsd ? power.highMultiplier : 1);
  const powerTotal = powerPerMonth * term;

  const deposit = unit.priceUsd; // one month, refundable
  const totalUsd = rentTotal + powerTotal + deposit;

  const d = (usd: number) => display(usd, currency, fxRate);

  const lines: EstimateLine[] = [
    {
      key: "rent",
      label: `Rent, ${term} × ${d(unit.priceUsd)}`,
      value: d(rentTotal),
    },
    {
      key: "discount",
      label: discount > 0 ? `Long-stay discount (${Math.round(discount * 100)}%)` : "Long-stay discount",
      value: discount > 0 ? `− ${d(rentDiscountAmount)}` : "from 6 months",
    },
    {
      key: "power",
      label: "Electricity, metered estimate",
      value: d(powerTotal),
    },
    {
      key: "utilities",
      label: "Water, garbage, 200 Mbps fibre",
      value: "Included",
    },
    {
      key: "deposit",
      label: "Deposit (refundable)",
      value: d(deposit),
    },
  ];

  return {
    discount,
    lines,
    totalUsd,
    totalDisplay: d(totalUsd),
  };
}

/** wa.me deep link with a prefilled message. Optionally scoped to a unit/term. */
export function whatsappHref(
  content: SiteContent,
  opts?: { unit?: Unit; term?: Term },
): string {
  const { whatsappNumber, whatsappMessage } = content.property;
  let message = whatsappMessage;
  if (opts?.unit) {
    const termText = opts.term ? ` for ${opts.term} month${opts.term > 1 ? "s" : ""}` : "";
    message = `Hi Henrik — I'm interested in the ${opts.unit.name}${termText}. Is it available for my dates?`;
  }
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
