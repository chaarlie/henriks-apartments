"use client";

import SiteLink from "@/app/components/SiteLink";
import { usePathname } from "next/navigation";
import { type Unit } from "@/lib/content";
import { localePath, splitLocale } from "@/lib/locales";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";
import { whatsappHref } from "@/lib/money";
import { today } from "@/lib/dates";
import { useDates } from "@/lib/i18n/dates";
import { useUi } from "@/lib/i18n/client";
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
  // Which language this page is being read in. Every link that leaves the page
  // has to carry it, or a Spanish reader is quietly returned to English.
  const { locale } = splitLocale(usePathname());
  const home = localePath(locale, "/");
  const t = useUi();
  const { dayLabel } = useDates();

  const links =
    mode === "landing"
      ? [
          { label: t.navApartments, href: "#units" },
          { label: t.navInside, href: "#inside" },
          { label: t.navAmenities, href: "#amenities" },
          { label: t.navLocation, href: "#location" },
        ]
      : [
          { label: t.navApartments, href: `${home}#units` },
          { label: t.navAmenities, href: "#amenities" },
          { label: t.navDetails, href: "#details" },
        ];

  const dates =
    start !== null && end !== null
      ? `${dayLabel(start)} → ${dayLabel(end)}`
      : start !== null
        ? `${dayLabel(start)} → ${t.addLeavingDay}`
        : t.addDates;

  let count: string;
  if (mode === "unit" && unit) {
    // Checks real bookings, not just the unit's opening date.
    if (start === null) {
      count = blockedFor(content, unit.slug)(today)
        ? t.freeFrom(dayLabel(freeAgainFrom(content, unit, today, today)))
        : t.freeNow;
    } else if (availableForDates(content, unit, start, end)) {
      count = end === null ? t.freeFrom(dayLabel(start)) : t.freeForYourDates;
    } else {
      count = t.bookedFreeAgain(dayLabel(freeAgainFrom(content, unit, start, end ?? start)));
    }
  } else {
    // Neutral inventory until dates are picked — "4 of 4 free" read as "nobody stays here".
    const free = scopeUnits(content, scope).filter((u) => availableForDates(content, u, start, end)).length;
    count =
      start === null
        ? t.furnishedApartments(content.units.length)
        : end === null
          ? t.apartmentsFreeFrom(free, dayLabel(start))
          : free
            ? t.apartmentsFreeForDates(free)
            : t.noApartmentsForDates;
  }

  return (
    <div className="sticky top-0 z-[60]">
      {/* Header row */}
      <header className="border-b border-hair bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-7">
          {/* SiteLink, not Link: `home` is "/" in English, which a client-side
              navigation cannot reach under the locale rewrite. */}
          <SiteLink href={home} className="flex items-center gap-2.5 whitespace-nowrap text-ink">
            <span className="h-6 w-6 rounded-[7px] bg-deep" aria-hidden />
            <span className="text-lg font-bold tracking-[-0.015em] sm:text-xl">{content.property.name}</span>
          </SiteLink>
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
            <LocaleSwitcher />
            <button
              type="button"
              onClick={openPicker}
              aria-label={t.checkDates}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full border-[1.5px] border-deep px-3 text-sm font-bold text-deep transition-colors hover:bg-deep hover:text-white sm:px-4"
            >
              <CalendarIcon />
              <span className="hidden sm:inline">{t.checkDates}</span>
            </button>
            <a
              href={whatsappHref(content, unit ? { unit } : undefined)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.whatsappHenrik}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[10px] bg-olive px-3 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:px-4"
            >
              <ChatIcon />
              <span className="hidden sm:inline">{t.whatsapp}</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Persistent stay strip — the dates open the picker */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-[9px] text-sm sm:px-7">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-sky">
            <span className="h-[7px] w-[7px] rounded-full bg-pool shadow-[0_0_0_3px_rgba(21,174,191,0.25)]" />
            {mode === "unit" ? t.thisUnit : t.yourStay}
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
