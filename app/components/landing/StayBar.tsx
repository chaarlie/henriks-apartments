"use client";

import { dayLabel, nights, plural } from "@/lib/dates";
import { availableForDates, scopeUnits } from "@/lib/availability";
import { useBooking, useContent } from "@/lib/booking";
import { CalendarIcon, ChevronIcon, InfoIcon } from "@/app/components/icons";

/**
 * The one place to start: dates (opens the StayPicker dialog), apartment (the
 * shared scope), and a button to the matching apartments. Overlaps the hero.
 */
export default function StayBar() {
  const { start, end, scope, setScope, notice, openPicker } = useBooking();
  const content = useContent();

  const free = scopeUnits(content, scope).filter((u) => availableForDates(content, u, start, end)).length;
  const dates =
    start === null
      ? null
      : end === null
        ? `${dayLabel(start)} → add leaving day`
        : `${dayLabel(start)} → ${dayLabel(end)} · ${plural(nights(start, end), "night")}`;

  const label = "font-mono text-xs uppercase tracking-[0.1em] text-muted";

  return (
    <div id="search" className="relative z-[5] mx-auto -mt-[66px] max-w-[1200px] px-4 sm:px-7">
      <div className="grid overflow-hidden rounded-[18px] border-[1.5px] border-line-card bg-surface shadow-[0_30px_60px_-36px_rgba(6,43,68,0.55)] md:grid-cols-[1.7fr_1fr_auto]">
        <button
          type="button"
          onClick={openPicker}
          className="flex flex-col justify-center gap-[3px] border-b border-hair px-[22px] py-3.5 text-left transition-colors hover:bg-tint md:border-b-0 md:border-r"
        >
          <span className={label}>Dates</span>
          <span className={`flex items-center gap-[9px] text-[17px] ${dates ? "font-bold text-ink" : "font-semibold text-copy"}`}>
            <CalendarIcon className="h-[18px] w-[18px] text-deep" />
            {dates ?? "Add dates"}
          </span>
        </button>

        <div className="flex flex-col justify-center gap-[3px] border-b border-hair px-[22px] py-3.5 md:border-b-0 md:border-r">
          <label htmlFor="stayUnit" className={label}>
            Apartment
          </label>
          <div className="relative">
            <select
              id="stayUnit"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full cursor-pointer appearance-none border-0 bg-transparent pr-7 text-[17px] font-bold text-ink"
            >
              <option value="any">Any apartment</option>
              {content.units.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.name}
                </option>
              ))}
            </select>
            <ChevronIcon dir="down" className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          </div>
        </div>

        <a
          href="#units"
          className="m-3 flex min-h-[58px] items-center justify-center whitespace-nowrap rounded-xl bg-olive px-7 text-base font-extrabold text-white transition-opacity hover:opacity-90 md:m-2.5"
        >
          {free ? `Show ${plural(free, "apartment")}` : "No free apartments"}
        </a>
      </div>

      {notice && (
        <p role="status" className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-sand-soft px-3.5 py-[11px] text-[15px] text-ink">
          <InfoIcon className="mt-[3px] h-4 w-4 text-olive" />
          {notice}
        </p>
      )}
      <p className="mx-1 mt-3 text-sm text-copy">
        One set of dates for the whole page — the apartments, prices and the hold form all follow it.
      </p>
    </div>
  );
}
