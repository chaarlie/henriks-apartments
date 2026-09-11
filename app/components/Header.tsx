"use client";

import Link from "next/link";
import { type Unit } from "@/lib/content";
import { whatsappHref } from "@/lib/money";
import { dayLabel, plural, today } from "@/lib/dates";
import { availableForDates, blockedFor, freeAgainFrom, scopeUnits } from "@/lib/availability";
import { useBooking, useContent } from "@/lib/booking";
import { CalendarIcon, ChatIcon } from "@/app/components/icons";

export default function Header({
  mode,
  unit,
}: {
  mode: "landing" | "unit";
  unit?: Unit;
}) {
  const { start, end, scope, openPicker } = useBooking();
  const content = useContent();

  const links =
    mode === "landing"
      ? [
          { label: "Apartments", href: "#units" },
          { label: "Inside", href: "#inside" },
          { label: "Amenities", href: "#amenities" },
          { label: "Location", href: "#location" },
        ]
      : [
          { label: "Apartments", href: "/#units" },
          { label: "Amenities", href: "#amenities" },
          { label: "Details", href: "#details" },
        ];

  const dates =
    start !== null && end !== null
      ? `${dayLabel(start)} → ${dayLabel(end)}`
      : start !== null
        ? `${dayLabel(start)} → add leaving day`
        : "Add dates";

  let count: string;
  if (mode === "unit" && unit) {
    // Checks real bookings, not just the unit's opening date.
    if (start === null) {
      count = blockedFor(content, unit.slug)(today)
        ? `Free from ${dayLabel(freeAgainFrom(content, unit, today, today))}`
        : "Free now";
    } else if (availableForDates(content, unit, start, end)) {
      count = end === null ? `Free from ${dayLabel(start)}` : "Free for your dates";
    } else {
      count = `Booked for your dates · free again ${dayLabel(freeAgainFrom(content, unit, start, end ?? start))}`;
    }
  } else {
    // Neutral inventory until dates are picked — "4 of 4 free" read as "nobody stays here".
    const free = scopeUnits(content, scope).filter((u) => availableForDates(content, u, start, end)).length;
    count =
      start === null
        ? plural(content.units.length, "furnished apartment")
        : end === null
          ? `${plural(free, "apartment")} free from ${dayLabel(start)}`
          : free
            ? `${plural(free, "apartment")} free for these dates`
            : "No apartments free for these dates";
  }

  return (
    <div className="sticky top-0 z-[60]">
      {/* Header row */}
      <header className="border-b border-hair bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-7">
          <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap text-ink">
            <span className="h-6 w-6 rounded-[7px] bg-deep" aria-hidden />
            <span className="text-lg font-bold tracking-[-0.015em] sm:text-xl">{content.property.name}</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 md:gap-[22px]">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hidden text-[15px] font-medium text-copy transition-colors hover:text-ink md:inline"
              >
                {l.label}
              </a>
            ))}
            <button
              type="button"
              onClick={openPicker}
              aria-label="Check dates"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full border-[1.5px] border-deep px-3 text-sm font-bold text-deep transition-colors hover:bg-deep hover:text-white sm:px-4"
            >
              <CalendarIcon />
              <span className="hidden sm:inline">Check dates</span>
            </button>
            <a
              href={whatsappHref(content, unit ? { unit } : undefined)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Henrik"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[10px] bg-olive px-3 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:px-4"
            >
              <ChatIcon />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Persistent stay strip — the dates open the picker */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-[9px] text-sm sm:px-7">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-sky">
            <span className="h-[7px] w-[7px] rounded-full bg-pool shadow-[0_0_0_3px_rgba(21,174,191,0.25)]" />
            {mode === "unit" ? "This unit" : "Your stay"}
          </span>
          <button
            type="button"
            onClick={openPicker}
            className="font-bold underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-white"
          >
            {dates}
          </button>
          <span className="hidden text-white/30 sm:inline">·</span>
          <span className="hidden text-white/[0.78] sm:inline" aria-live="polite">{count}</span>
        </div>
      </div>
    </div>
  );
}
