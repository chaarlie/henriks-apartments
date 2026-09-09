"use client";

import Link from "next/link";
import { type Unit } from "@/lib/content";
import { whatsappHref } from "@/lib/money";
import { pretty, today } from "@/lib/dates";
import { availableFrom, availableForDates, matchesFilters } from "@/lib/filter";
import { useBooking, useContent } from "@/lib/booking";

function scrollToCalendar() {
  const el = document.getElementById("availability");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const card = el.querySelector<HTMLElement>("[data-cal-card]");
  card?.animate?.(
    [
      { boxShadow: "0 0 0 0 rgba(21,174,191,0.55)" },
      { boxShadow: "0 0 0 8px rgba(21,174,191,0)" },
    ],
    { duration: 1000, easing: "ease-out" },
  );
}

function CalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-[15px] w-[15px]"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export default function Header({
  mode,
  unit,
}: {
  mode: "landing" | "unit";
  unit?: Unit;
}) {
  const { start, end, kw, layout, maxRent } = useBooking();
  const content = useContent();

  const links =
    mode === "landing"
      ? [
          { label: "Apartments", href: "#units" },
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
      ? `${pretty(start)} → ${pretty(end)}`
      : start !== null
        ? `${pretty(start)} → pick move-out`
        : "Any dates";

  let count: string;
  if (mode === "unit" && unit) {
    count =
      start !== null
        ? start >= availableFrom(unit)
          ? "Available for your dates"
          : `Free from ${pretty(availableFrom(unit))}`
        : availableFrom(unit) <= today
          ? "Free now"
          : `Free ${pretty(availableFrom(unit))}`;
  } else {
    const avail = content.units.filter(
      (u) =>
        matchesFilters(u, kw, layout, maxRent) && availableForDates(u, start),
    ).length;
    count = `${avail} of ${content.units.length} apartments free`;
  }

  return (
    <div className="sticky top-0 z-[60]">
      {/* Header row */}
      <header className="border-b border-hair bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-7 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <span className="h-6 w-6 rounded-[7px] bg-deep" aria-hidden />
            <span className="text-[21px] font-bold">
              {content.property.name}
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-6">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hidden text-sm text-copy transition-colors hover:text-ink md:inline"
              >
                {l.label}
              </a>
            ))}
            <button
              type="button"
              onClick={scrollToCalendar}
              className="inline-flex items-center gap-2 rounded-full border border-deep px-[15px] py-[9px] text-[13px] font-bold text-deep transition-colors hover:bg-deep hover:text-white"
            >
              <CalIcon />
              Availability
            </button>
            <a
              href={whatsappHref(content, unit ? { unit } : undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-olive px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              WhatsApp
            </a>
          </nav>
        </div>
      </header>

      {/* Persistent availability strip */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-7 py-2.5 text-[13px]">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#9cc6d6]">
            <span className="h-[7px] w-[7px] rounded-full bg-pool shadow-[0_0_0_3px_rgba(21,174,191,0.25)]" />
            {mode === "unit" ? "This unit" : "Live availability"}
          </span>
          <span className="font-bold" aria-live="polite">{dates}</span>
          <span className="text-white/30">·</span>
          <span className="hidden text-white/70 sm:inline" aria-live="polite">{count}</span>
        </div>
      </div>
    </div>
  );
}
