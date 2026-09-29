"use client";

import { whatsappHref } from "@/lib/money";
import { useDates } from "@/lib/i18n/dates";
import { useBooking, useContent } from "@/lib/booking";
import { useUi } from "@/lib/i18n/client";
import { useState } from "react";
import { directionsHref, fullAddress, mapSrc } from "@/lib/map";

/**
 * Landing closing band, deep blue and two columns: "What a stay costs" and
 * "Getting around". The columns are separate <section>s (#estimate, #location)
 * so the nav "Location" link lands on the location itself. The unit being priced
 * is chosen with the button row (shared via BookingProvider with the Inside band
 * and the hold form); the term follows the calendar dates.
 */
export default function CostEstimator() {
  const { currency, start, end, selectedSlug, setSelected } = useBooking();
  const content = useContent();
  const t = useUi();
  const { computeEstimate, pretty } = useDates();
  const { location } = content;
  const unit = content.units.find((u) => u.slug === selectedSlug) ?? content.units[0];
  const est = computeEstimate(unit, start, end, currency, content);

  /*
    One line, built from the parts each of which is edited in its own place: the
    street in Getting around, the city and region in Property details.
  */
  const address = fullAddress({
    building: content.property.buildingName,
    addressLine: location.addressLine,
    city: content.property.city,
    region: content.property.region,
  });

  const [copied, setCopied] = useState(false);
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      /*
        Clipboard access is refused without a secure context or a gesture the
        browser trusts. The address is `select-all`, so a tap already selects the
        whole line — say nothing and let the guest copy it themselves rather than
        claim a copy that did not happen.
      */
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  const term = est.mode === "nightly" ? t.nightsCount(est.nights) : t.monthsCount(est.months);
  const note =
    start !== null && end !== null ? t.dateRangeNote(pretty(start), pretty(end)) : undefined;

  return (
    <div className="mt-16 bg-deep text-page md:mt-[88px]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-2">
        {/* What a stay costs */}
        <section
          id="estimate"
          aria-labelledby="estimate-title"
          className="scroll-mt-28 border-b border-hairblue px-7 py-14 lg:border-b-0 lg:border-r lg:px-12"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">{t.whatAStayCosts}</p>
          <h2 id="estimate-title" className="mt-4 text-[clamp(26px,3.2vw,32px)] font-semibold leading-[1.15] tracking-[-0.02em]">
            {unit.name} · {term}
          </h2>

          {/* Unit picker — the stay being priced */}
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t.chooseApartmentToPrice}>
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
              <span className="text-base font-bold">{t.estimatedTotal}</span>
              <span className="font-mono text-[30px] font-medium tracking-[-0.02em] text-sand2">
                {est.totalDisplay}
              </span>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-page/60">{t.powerNote}</p>
          </div>
        </section>

        {/* Getting around */}
        <section id="location" aria-labelledby="location-title" className="scroll-mt-28 px-7 py-14 lg:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">{location.heading}</p>
          <h2 id="location-title" className="mt-4 text-[clamp(26px,3.2vw,32px)] font-semibold tracking-[-0.02em]">
            {location.addressLine}
          </h2>

          {/*
            For guests arriving by car.

            The full address is a real <address> element, on its own line, in a
            panel of its own — not folded into the heading — because somebody
            halfway from Puerto Plata needs to read it out or paste it, not admire
            it. `select-all` makes one tap select the whole thing on a phone, which
            is the fallback when the clipboard API is unavailable.

            Directions go to the COORDINATES rather than this text; see
            directionsHref() for why that matters on a street with patchy
            numbering.
          */}
          <div className="mt-6 rounded-xl border border-hairblue bg-white/[0.06] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">
              {t.fullAddressLabel}
            </p>
            <address className="mt-2 select-all text-[19px] font-semibold not-italic leading-[1.45] text-page">
              {address}
            </address>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={copyAddress}
                className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-white px-[18px] text-[15px] font-extrabold text-ink transition-colors hover:bg-sand"
              >
                {copied ? t.addressCopied : t.copyAddress}
              </button>
              <a
                href={directionsHref(location.lat, location.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border-[1.5px] border-page/30 px-[18px] text-[15px] font-bold text-page transition-colors hover:border-page"
              >
                {t.getDirections}
              </a>
            </div>
            <p className="mt-3 text-[14px] leading-[1.5] text-page/70">{t.drivingNote}</p>
          </div>

          <div className="mt-6 h-[210px] overflow-hidden rounded-xl border border-hairblue">
            <iframe
              title={t.mapTitle}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full"
              src={mapSrc(location.lat, location.lng)}
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
              {t.checkDatesOnWhatsapp}
            </a>
            <a
              href={whatsappHref(content, { unit, note: t.sixMonthMessage })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-[9px] border border-hairblue px-4 py-4 text-center text-sm font-semibold text-page transition-colors hover:border-page"
            >
              {t.askAboutSixMonths}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
