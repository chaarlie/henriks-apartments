"use client";

import { type Unit } from "@/lib/content";
import { display, whatsappHref, type Currency } from "@/lib/money";
import { billingLabel, computeEstimate, dayLabel, fxRateNote, plural, pretty } from "@/lib/dates";
import { availableForDates, freeAgainFrom } from "@/lib/availability";
import { unitFacts } from "@/lib/unit";
import { useBooking, useContent } from "@/lib/booking";
import { CalendarIcon, ChatIcon, InfoIcon } from "@/app/components/icons";

const PRIMARY =
  "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-extrabold text-white transition-colors";
const LINE_BTN =
  "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-line-card bg-surface text-[15px] font-bold text-ink transition-colors hover:border-ink hover:bg-tint";

/**
 * Unit page booking card, in the v3 card language: monthly rent first in a sand
 * panel, the chosen dates, the estimated total, and one clear next step — pick
 * dates, or hold them in the form further down (#reserve).
 */
export default function BookingCard({ unit }: { unit: Unit }) {
  const { currency, setCurrency, start, end, openPicker } = useBooking();
  const content = useContent();
  const money = (usd: number) => display(usd, currency, content.fxRate);

  const est = computeEstimate(unit, start, end, currency, content);
  const hasDates = start !== null && end !== null;
  const free = availableForDates(content, unit, start, end);
  const againFrom = start !== null && !free ? freeAgainFrom(content, unit, start, end ?? start) : null;
  const note = hasDates ? `${pretty(start)} to ${pretty(end)}` : undefined;

  return (
    <div
      id="book"
      className="scroll-mt-[130px] rounded-[20px] border-[1.5px] border-line-card bg-surface p-5 shadow-[0_18px_44px_-28px_rgba(6,43,68,0.4)] lg:sticky lg:top-[120px]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">{unit.code}</span>
        <div className="inline-flex gap-[3px] rounded-[10px] bg-sand p-[3px]" role="group" aria-label="Currency">
          {(["USD", "DOP"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              aria-pressed={currency === c}
              className={`rounded-[8px] px-3.5 py-1.5 text-sm font-bold transition-colors ${
                currency === c ? "bg-deep text-white" : "text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-right font-mono text-xs text-copy">{fxRateNote(content)}</p>

      {/* The facts that decide it */}
      <div className="mt-3.5 rounded-xl bg-sand px-4 pb-[13px] pt-3.5">
        <p className="flex items-baseline gap-1.5">
          <b className="text-[31px] font-extrabold leading-[1.1] tracking-[-0.03em]">{money(unit.priceUsd)}</b>
          <span className="text-[15px] font-semibold text-dense">per month</span>
        </p>
        <p className="mt-0.5 text-[15px] text-dense">
          or <b className="text-ink">{money(unit.priceNightlyUsd)}</b> a night for short stays
        </p>
        <dl className="mt-3 grid grid-cols-3 border-t border-sand2 pt-[11px]">
          {unitFacts(unit).map(([k, v], i) => (
            <div key={k} className={i ? "border-l border-sand2 pl-3" : ""}>
              <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-dense">{k}</dt>
              <dd className="text-[17px] font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-[15px] leading-[1.55] text-copy">
        Monthly: water, garbage and 200 Mbps fibre included, power metered. Nightly stays include everything.
      </p>

      {/* Dates */}
      <p className="mb-2 mt-5 font-mono text-xs uppercase tracking-[0.1em] text-muted">Your dates</p>
      <button
        type="button"
        onClick={openPicker}
        className="grid w-full grid-cols-2 overflow-hidden rounded-xl border-[1.5px] border-line-card text-left transition-colors hover:bg-tint"
      >
        <span className="flex flex-col gap-px px-4 py-2.5">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Arrive</span>
          <span className={`text-base ${start === null ? "font-semibold text-copy" : "font-bold text-ink"}`}>
            {start === null ? "Choose a day" : dayLabel(start, true)}
          </span>
        </span>
        <span className="flex flex-col gap-px border-l border-hair-strong px-4 py-2.5">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Leave</span>
          <span className={`text-base ${end === null ? "font-semibold text-copy" : "font-bold text-ink"}`}>
            {end === null ? "Choose a day" : dayLabel(end, true)}
          </span>
        </span>
      </button>

      {againFrom !== null ? (
        <p className="mt-3 flex items-start gap-2.5 rounded-[10px] bg-page bg-hatch px-3 py-2.5 text-[15px] leading-[1.45] shadow-[inset_0_0_0_1px_var(--color-hair)]">
          <InfoIcon className="mt-0.5 h-4 w-4 text-dense" />
          <span>
            Booked during your dates. Free again from <b>{dayLabel(againFrom)}</b>.
          </span>
        </p>
      ) : hasDates ? (
        <div aria-live="polite" className="mt-3">
          <div className="flex items-baseline justify-between gap-4 rounded-xl bg-deep px-4 py-3.5 text-white">
            <span className="font-bold">Estimated total</span>
            <span className="font-mono text-2xl font-medium tracking-[-0.02em]">{est.totalDisplay}</span>
          </div>
          <p className="mt-1.5 text-sm text-copy">
            {plural(est.nights, "night")}, {billingLabel(est.nights)} ·{" "}
            <a href="#reserve" className="font-bold text-lagoon underline underline-offset-[3px]">
              See the breakdown
            </a>
          </p>
        </div>
      ) : (
        <p className="mt-2.5 text-[15px] text-copy">Pick your dates to see the exact total.</p>
      )}

      <div className="mt-4 grid gap-2">
        {hasDates && free ? (
          <a href="#reserve" className={`${PRIMARY} bg-olive hover:opacity-90`}>
            Hold these dates
          </a>
        ) : (
          <button type="button" onClick={openPicker} className={`${PRIMARY} bg-ink hover:bg-ink-hover`}>
            <CalendarIcon className="h-[18px] w-[18px]" />
            {hasDates ? "Choose other dates" : "Check dates"}
          </button>
        )}
        <a href={whatsappHref(content, { unit, note })} target="_blank" rel="noopener noreferrer" className={LINE_BTN}>
          <ChatIcon className="h-4 w-4 text-deep" />
          Ask Henrik on WhatsApp
        </a>
      </div>
      <p className="mt-2.5 text-center text-sm text-copy">A hold is free and never charges you.</p>
    </div>
  );
}
