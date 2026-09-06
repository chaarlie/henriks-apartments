import type { SiteContent, Unit } from "@/lib/content";

export type Currency = "USD" | "DOP";

/** Format a USD amount into the chosen currency with a thousands separator. */
export function display(usd: number, currency: Currency, fxRate: number): string {
  if (currency === "USD") {
    return `$${Math.round(usd).toLocaleString("en-US")}`;
  }
  return `RD$${Math.round(usd * fxRate).toLocaleString("en-US")}`;
}

/** wa.me deep link with a prefilled message. Optionally scoped to a unit + note. */
export function whatsappHref(
  content: SiteContent,
  opts?: { unit?: Unit; note?: string },
): string {
  const { whatsappNumber, whatsappMessage } = content.property;
  let message = whatsappMessage;
  if (opts?.unit) {
    message = `Hi Henrik — I'm interested in the ${opts.unit.name} (${opts.unit.code})${
      opts.note ? `, ${opts.note}` : ""
    }. Is it available?`;
  }
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
