"use client";

import { whatsappHref } from "@/lib/money";
import { computeEstimate, pretty } from "@/lib/dates";
import { useBooking, useContent } from "@/lib/booking";

/**
 * Landing "What a stay costs" + "Getting around" footer band. The unit being
 * priced is chosen with the button row (shared via BookingProvider with the
 * Inside carousel and the hold form); the term follows the calendar dates. Reuses
 * computeEstimate so figures match the unit page. Styled as the deep-blue
 * two-column band from the redesign mockup.
 */
export default function CostEstimator() {
  const { currency, start, end, selectedSlug, setSelected } = useBooking();
  const content = useContent();
  const { location } = content;
  const unit = content.units.find((u) => u.slug === selectedSlug) ?? content.units[0];
  const est = computeEstimate(unit, start, end, currency, content);

  const term =
    est.mode === "nightly"
      ? `${est.nights} night${est.nights > 1 ? "s" : ""}`
      : `${est.months} month${est.months > 1 ? "s" : ""}`;
  const note = start !== null && end !== null ? `${pretty(start)} to ${pretty(end)}` : undefined;

  return (
    <section id="estimate" className="mt-16 scroll-mt-28 bg-deep text-page md:mt-[88px]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-2">
        {/* What a stay costs */}
        <div className="border-b border-hairblue px-7 py-14 lg:border-b-0 lg:border-r lg:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">What a stay costs</p>
          <h3 className="mt-4 text-[clamp(26px,3.2vw,32px)] font-semibold leading-[1.15] tracking-[-0.02em]">
            {unit.name} · {term}
          </h3>

          {/* Unit picker — the stay being priced */}
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Choose apartment to price">
            {content.units.map((u) => {
              const on = u.slug === unit.slug;
              return (
                <button
                  key={u.slug}
                  type="button"
                  onClick={() => setSelected(u.slug)}
                  aria-pressed={on}
                  className={`rounded-[8px] border px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                    on
                      ? "border-page bg-page text-ink"
                      : "border-hairblue text-page/80 hover:border-page hover:text-page"
                  }`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex flex-col" aria-live="polite">
            {est.lines.map((r) => (
              <div key={r.key} className="flex justify-between gap-5 border-t border-hairblue-soft py-[15px]">
                <span className="text-[15px] text-page/80">{r.label}</span>
                <span className={r.teal ? "text-[15px] font-semibold text-sand2" : "font-mono text-sm text-page"}>
                  {r.value}
                </span>
              </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between gap-5 border-t-2 border-sand2 pt-[22px]">
              <span className="text-base font-bold">Estimated total</span>
              <span className="font-mono text-[30px] font-medium tracking-[-0.02em] text-sand2">
                {est.totalDisplay}
              </span>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-page/60">
              Power is metered and varies with AC use; the estimate is what tenants actually paid last year.
            </p>
          </div>
        </div>

        {/* Getting around */}
        <div id="location" className="scroll-mt-28 px-7 py-14 lg:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">{location.heading}</p>
          <h3 className="mt-4 text-[clamp(26px,3.2vw,32px)] font-semibold tracking-[-0.02em]">
            {location.addressLine}
          </h3>
          <div className="mt-6 h-[210px] overflow-hidden rounded-xl border border-hairblue">
            <iframe
              title="Map of El Batey, Sosúa"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-70.5250%2C19.7450%2C-70.4920%2C19.7620&layer=mapnik&marker=19.7530%2C-70.5085"
            />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {location.distances.map((d) => (
              <div
                key={d.label}
                className="flex justify-between gap-3 rounded-[9px] bg-white/[0.06] px-[15px] py-3.5"
              >
                <span className="text-sm text-page/85">{d.label}</span>
                <span className="font-mono text-[13px] text-sand2">{d.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <a
              href={whatsappHref(content, { unit, note })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-[9px] bg-olive px-4 py-4 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Check dates on WhatsApp
            </a>
            <a
              href={whatsappHref(content, { unit, note: "I'd like to ask about 6-month terms" })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-[9px] border border-hairblue px-4 py-4 text-center text-sm font-semibold text-page transition-colors hover:border-page"
            >
              Ask about 6-month terms
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
