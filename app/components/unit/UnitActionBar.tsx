"use client";

import { useEffect, useState } from "react";
import { type Unit } from "@/lib/content";
import { display } from "@/lib/money";
import { useDates } from "@/lib/i18n/dates";
import { availableForDates } from "@/lib/availability";
import { useBooking, useContent } from "@/lib/booking";
import { useUi } from "@/lib/i18n/client";

/** Sections that carry their own actions; the bar steps aside while they're on screen. */
const OWN_ACTIONS = ["book", "availability", "reserve"];

/**
 * Phone-only bar pinned to the bottom of a unit page: the price (or the total for
 * the chosen dates) and the next step, so it's never a long scroll away.
 */
export default function UnitActionBar({ unit }: { unit: Unit }) {
  const { currency, start, end, openPicker } = useBooking();
  const content = useContent();
  const t = useUi();
  const { computeEstimate, dayLabel } = useDates();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const visible = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      }
      setHidden(visible.size > 0);
    });
    for (const id of OWN_ACTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const money = (usd: number) => display(usd, currency, content.fxRate);
  const hasDates = start !== null && end !== null;
  const free = availableForDates(content, unit, start, end);
  const est = computeEstimate(unit, start, end, currency, content);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-hair bg-surface/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_30px_-20px_rgba(6,43,68,0.45)] backdrop-blur-md transition-transform duration-200 lg:hidden ${
        hidden ? "pointer-events-none translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {hasDates ? (
            <>
              <p className="text-[17px] font-extrabold leading-tight">{free ? est.totalDisplay : t.bookedForYourDates}</p>
              <p className="truncate text-sm text-copy">
                {dayLabel(start)} → {dayLabel(end)} · {t.nightsCount(est.nights)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[17px] font-extrabold leading-tight">
                {money(unit.priceUsd)} <span className="text-sm font-semibold text-dense">{t.perMonth}</span>
              </p>
              <p className="truncate text-sm text-copy">
                {t.nightlyBefore}
                {money(unit.priceNightlyUsd)}
                {t.nightlyAfter}
              </p>
            </>
          )}
        </div>
        {hasDates && free ? (
          <a
            href="#reserve"
            tabIndex={hidden ? -1 : undefined}
            className="flex min-h-[50px] flex-none items-center rounded-xl bg-olive px-5 text-base font-extrabold text-white"
          >
            {t.holdDates}
          </a>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            tabIndex={hidden ? -1 : undefined}
            className="flex min-h-[50px] flex-none items-center rounded-xl bg-ink px-5 text-base font-extrabold text-white"
          >
            {hasDates ? t.otherDates : t.checkDates}
          </button>
        )}
      </div>
    </div>
  );
}
