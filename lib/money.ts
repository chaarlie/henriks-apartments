import { ui } from "@/lib/i18n/ui";
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
  opts?: { unit?: Unit; note?: string; sale?: boolean },
): string {
  const { whatsappNumber, whatsappMessage } = content.property;
  const t = ui(content.locale ?? "en");
  let message = content.locale && content.locale !== "en" ? t.whatsappDefault : whatsappMessage;
  if (opts?.sale) {
    message = t.whatsappSale(content.property.name, opts.unit?.name);
  } else if (opts?.unit) {
    message = t.whatsappUnit(opts.unit.name, opts.unit.code, opts.note);
  }
  if (!opts?.unit && !opts?.sale && opts?.note) message += ` ${opts.note}`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
