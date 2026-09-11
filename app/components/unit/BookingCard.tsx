"use client";

import { type Unit } from "@/lib/content";
import { display, whatsappHref, type Currency } from "@/lib/money";
import { computeEstimate, dayLabel, fxRateNote, pretty } from "@/lib/dates";
import { useBooking, useContent } from "@/lib/booking";

export default function BookingCard({ unit }: { unit: Unit }) {
  const { currency, setCurrency, start, end, openPicker } = useBooking();
  const content = useContent();
  const est = computeEstimate(unit, start, end, currency, content);

  const note =
    start !== null && end !== null ? `${pretty(start)} to ${pretty(end)}` : undefined;
  const rangeSub = !est.nights
    ? "Pick your dates for an exact estimate."
    : est.mode === "nightly"
      ? `${est.nights} night${est.nights > 1 ? "s" : ""} · billed nightly`
      : `${est.nights} nights · billed as ${est.months} month${est.months > 1 ? "s" : ""}`;

  return (
    <div id="book" className="sticky top-[116px] scroll-mt-[130px] rounded-2xl border border-hair bg-surface p-[22px] shadow-[0_18px_44px_-28px_rgba(6,43,68,0.4)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-lagoon">{unit.code}</span>
        <span className="inline-flex gap-[3px] rounded-[7px] bg-page p-[3px]">
          {(["USD", "DOP"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              aria-pressed={currency === c}
              className={`rounded-[5px] px-2.5 py-1.5 font-mono text-[11px] tracking-[0.08em] ${
                currency === c ? "bg-ink text-white" : "text-copy"
              }`}
            >
              {c}
            </button>
          ))}
        </span>
      </div>
      <p className="mt-1.5 text-right font-mono text-[11px] text-copy">{fxRateNote(content)}</p>

      <div className="mt-3.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="flex items-baseline gap-1.5">
          <b className="font-mono text-[30px] font-medium tracking-[-0.03em]">
            {display(unit.priceNightlyUsd, currency, content.fxRate)}
          </b>
          <span className="text-sm text-copy">/ night</span>
        </span>
        <span className="flex items-baseline gap-1.5 text-copy">
          <b className="font-mono text-lg font-medium tracking-[-0.02em] text-ink">
            {display(unit.priceUsd, currency, content.fxRate)}
          </b>
          <span className="text-sm">/ month</span>
        </span>
      </div>
      <p className="mt-1 text-sm leading-[1.6] text-copy">
        Nightly stays include everything. Monthly: water, garbage &amp; 200 Mbps fibre included, power metered.
      </p>

      <div className="my-5 h-px bg-hair-soft" />

      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-copy">Your dates</div>
      <button
        type="button"
        onClick={openPicker}
        className="mt-2 grid w-full grid-cols-2 overflow-hidden rounded-[10px] border border-hair-strong text-left transition-colors hover:bg-tint"
      >
        <div className="px-3.5 py-2.5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">Arrive</div>
          <div className={`mt-0.5 text-sm font-semibold ${start === null ? "font-medium text-muted" : "text-ink"}`}>
            {start !== null ? dayLabel(start, true) : "Add date"}
          </div>
        </div>
        <div className="border-l border-hair-strong px-3.5 py-2.5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">Leave</div>
          <div className={`mt-0.5 text-sm font-semibold ${end === null ? "font-medium text-muted" : "text-ink"}`}>
            {end !== null ? dayLabel(end, true) : "Add date"}
          </div>
        </div>
      </button>
      <p className="mt-2 text-sm leading-[1.6] text-copy">{rangeSub}</p>

      <div className="my-5 h-px bg-hair-soft" />

      <div aria-live="polite">
        <div>
          {est.lines.map((r) => (
            <div key={r.key} className="flex justify-between gap-4 py-[7px]">
              <span className="text-sm text-copy">{r.label}</span>
              <span className={r.teal ? "text-sm font-semibold text-olive" : "font-mono text-sm text-ink"}>
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3.5 flex items-baseline justify-between gap-4 rounded-[10px] bg-deep px-4 py-3.5 text-white">
          <span className="text-sm font-bold">Estimated total</span>
          <span className="font-mono text-[22px] font-medium tracking-[-0.02em]">{est.totalDisplay}</span>
        </div>
      </div>

      <a
        href={whatsappHref(content, { unit, note })}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block rounded-[10px] bg-olive py-3.5 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
      >
        Ask Henrik about these dates
      </a>
    </div>
  );
}
