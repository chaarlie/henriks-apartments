"use client";

import { useState } from "react";
import Image from "next/image";
import { content } from "@/lib/content";
import {
  computeEstimate,
  display,
  whatsappHref,
  type Currency,
  type Term,
} from "@/lib/money";
import Tour from "@/app/components/tour/Tour";
import Gallery from "./Gallery";

const TERMS: Term[] = [1, 3, 6, 12];

export default function Apartments() {
  const { units, fxRate, location } = content;
  const [currency, setCurrency] = useState<Currency>("USD");
  const [selectedId, setSelectedId] = useState(units[0]._id);
  const [term, setTerm] = useState<Term>(3);

  const selected = units.find((u) => u._id === selectedId) ?? units[0];
  const estimate = computeEstimate(selected, term, currency, content);

  return (
    <>
      {/* ── Apartment picker ───────────────────────────────────────────────── */}
      <section id="units" className="bg-page px-5 pb-16 pt-16 sm:px-8 lg:px-12 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">
                Choose an apartment
              </p>
              <h2 className="mt-2 text-[26px] font-bold tracking-[-0.025em] text-ink sm:text-[34px]">
                Apartments &amp; monthly rates
              </h2>
            </div>
            {/* Currency toggle */}
            <div
              className="inline-flex gap-[3px] self-start rounded-[9px] bg-sand p-[3px]"
              role="group"
              aria-label="Currency"
            >
              {(["USD", "DOP"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                  className={`rounded-[7px] px-[18px] py-[9px] text-[13px] font-semibold transition-colors ${
                    currency === c ? "bg-deep text-white" : "text-copy"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {units.map((unit) => {
              const isSelected = unit._id === selectedId;
              return (
                <article
                  key={unit._id}
                  className={`overflow-hidden rounded-[14px] border bg-surface transition-colors ${
                    isSelected ? "border-olive ring-1 ring-olive" : "border-hair"
                  }`}
                >
                  <div className="relative h-[210px]">
                    <Image
                      src={unit.image.url}
                      alt={unit.image.alt}
                      fill
                      sizes="(min-width: 768px) 30vw, 100vw"
                      className="object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-md bg-surface/95 px-[11px] py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                      {unit.availability}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[19px] font-bold text-ink">{unit.name}</h3>
                      <span className="text-[19px] font-bold text-ink">
                        {display(unit.priceUsd, currency, fxRate)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <span className="text-xs text-muted">{unit.spec}</span>
                      <span className="font-mono text-[11px] text-muted">per month</span>
                    </div>

                    <ul className="mt-4 flex flex-col gap-2 border-t border-hair-soft pt-4">
                      {unit.includes.map((item) => (
                        <li key={item} className="flex items-center gap-2.5 text-[13px] text-dense">
                          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-lagoon" aria-hidden />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => setSelectedId(unit._id)}
                      aria-pressed={isSelected}
                      className={`mt-[18px] w-full rounded-lg py-3 text-[13px] font-semibold transition-colors ${
                        isSelected ? "bg-olive text-white" : "bg-sand text-ink hover:bg-sand2"
                      }`}
                    >
                      {isSelected ? "Showing tour & photos below ↓" : "View 360° tour & price"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Selected apartment: tour + gallery (remount on change) ──────────── */}
      <Tour key={`tour-${selected._id}`} nodes={selected.tour} unitName={selected.name} />
      <Gallery key={`gallery-${selected._id}`} images={selected.gallery} unitName={selected.name} />

      {/* ── Cost estimate + location ───────────────────────────────────────── */}
      <section id="estimate" className="bg-deep text-page">
        <div className="mx-auto grid max-w-[1440px] gap-0 lg:grid-cols-2">
          {/* Left: live estimate */}
          <div className="border-hairblue-soft px-5 py-14 sm:px-8 lg:border-r lg:py-16 lg:pl-12 lg:pr-11">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">
              What a stay costs
            </p>
            <h2 className="mt-3 text-[26px] font-bold tracking-[-0.025em] sm:text-[32px]">
              {selected.name} · {term} month{term > 1 ? "s" : ""}
            </h2>

            {/* Term selector */}
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Length of stay">
              {TERMS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  aria-pressed={term === t}
                  className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                    term === t
                      ? "border border-page bg-page text-ink"
                      : "border border-page/25 text-page/80 hover:border-page/50"
                  }`}
                >
                  {t} mo
                </button>
              ))}
            </div>

            {/* Line items */}
            <dl className="mt-8">
              {estimate.lines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center justify-between gap-4 border-t border-hairblue-soft py-[15px]"
                >
                  <dt className="text-[15px] text-page/80">{line.label}</dt>
                  <dd className="font-mono text-sm text-page">{line.value}</dd>
                </div>
              ))}
            </dl>

            {/* Total */}
            <div className="mt-2 flex items-center justify-between gap-4 border-t-2 border-sand2 pt-[22px]">
              <span className="text-base font-semibold">Estimated total</span>
              <span className="text-[30px] font-bold tracking-[-0.02em] text-sand2">
                {estimate.totalDisplay}
              </span>
            </div>

            <p className="mt-4 text-[13px] text-page/60">
              Power is metered and varies with AC use; the figure above reflects what
              tenants actually paid last year. Deposit is refundable.
            </p>
          </div>

          {/* Right: location */}
          <div id="location" className="px-5 py-14 sm:px-8 lg:py-16 lg:pl-11 lg:pr-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-page/60">
              {location.heading}
            </p>
            <h2 className="mt-3 text-[26px] font-bold tracking-[-0.025em] sm:text-[32px]">
              {location.addressLine}
            </h2>

            {/* Map (approximate — confirm exact pin before launch) */}
            <div className="mt-6 h-[210px] overflow-hidden rounded-xl border border-hairblue-soft">
              <iframe
                title="Map of El Batey, Sosúa"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-70.5250%2C19.7450%2C-70.4920%2C19.7620&layer=mapnik&marker=19.7530%2C-70.5085"
              />
            </div>

            {/* Distances */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {location.distances.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between gap-2 rounded-[9px] bg-page/[0.06] px-[15px] py-[13px]"
                >
                  <span className="text-sm text-page/85">{d.label}</span>
                  <span className="font-mono text-[13px] text-sand2">{d.value}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={whatsappHref(content, { unit: selected, term })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-[9px] bg-olive px-4 py-4 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Check dates on WhatsApp
              </a>
              <a
                href={whatsappHref(content, { unit: selected, term: 6 })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-[9px] border border-page/25 px-4 py-4 text-center text-sm text-page transition-colors hover:border-page/50"
              >
                Ask about 6-month terms
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
