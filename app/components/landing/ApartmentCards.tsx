"use client";

import Link from "next/link";
import Image from "next/image";
import { type Unit } from "@/lib/content";
import { display, type Currency } from "@/lib/money";
import { pretty, today } from "@/lib/dates";
import { availableFrom, availableForDates, matchesFilters } from "@/lib/filter";
import { useBooking, useContent } from "@/lib/booking";

function Card({ unit, currency, start }: { unit: Unit; currency: Currency; start: number | null }) {
  const content = useContent();
  const ok = availableForDates(unit, start);
  const from = availableFrom(unit);
  const availLabel = from <= today ? "Free now" : `Free ${pretty(from)}`;
  return (
    <Link
      href={`/apartments/${unit.slug}`}
      className={`group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-ink shadow-[0_10px_30px_-20px_rgba(6,43,68,0.5)] transition-transform hover:-translate-y-1 sm:aspect-[3/3.5] ${
        ok ? "" : "grayscale-[0.45]"
      }`}
    >
      <Image
        src={unit.image.url}
        alt={unit.image.alt}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className={`object-cover transition-transform duration-500 group-hover:scale-105 ${ok ? "" : "opacity-70"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/30 to-ink/90" aria-hidden />
      <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-[11px] py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink">
        {unit.chips[0]}
      </span>
      <span className="absolute right-3.5 top-3.5 rounded-2xl bg-ink/60 px-3 py-1.5 text-right text-white backdrop-blur">
        <span className="block text-sm font-bold leading-none">
          {display(unit.priceNightlyUsd, currency, content.fxRate)}<span className="font-medium">/night</span>
        </span>
        <span className="mt-1 block text-[10px] leading-none text-white/75">
          {display(unit.priceUsd, currency, content.fxRate)}/mo
        </span>
      </span>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <h3 className="text-[24px] font-semibold leading-tight">{unit.name}</h3>
        <p className="mt-1 text-[13px] text-white/80">{unit.tagline}</p>
        <p className="mt-3 border-t border-white/20 pt-3 font-mono text-xs text-white/90">
          {unit.spec.area} · {unit.spec.bath} · {unit.spec.sleeps}
        </p>
        <span
          className={`mt-3 inline-block rounded-full border px-[11px] py-[5px] text-xs font-bold ${
            ok
              ? "border-pool/50 bg-pool/20 text-[#c9f0f5]"
              : "border-white/30 bg-white/10 text-white"
          }`}
        >
          {ok ? availLabel : `Free ${pretty(from)}`}
        </span>
      </div>
      <span className="absolute bottom-5 right-[18px] translate-y-1.5 rounded-full bg-white px-[15px] py-[9px] text-[13px] font-bold text-ink opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        View →
      </span>
    </Link>
  );
}

export default function ApartmentCards() {
  const { currency, setCurrency, start, kw, layout, maxRent } = useBooking();
  const content = useContent();
  const list = content.units.filter((u) => matchesFilters(u, kw, layout, maxRent));

  return (
    <section id="units" className="scroll-mt-28 pb-2 pt-11">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">The apartments</p>
            <h2 className="mt-2 text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.01em]">
              {content.units.length} ways to stay
            </h2>
          </div>
          <div className="inline-flex gap-[3px] rounded-[9px] bg-sand p-[3px]" role="group" aria-label="Currency">
            {(["USD", "DOP"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                className={`rounded-[7px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                  currency === c ? "bg-deep text-white" : "text-copy"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {list.length ? (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {list.map((u) => (
              <Card key={u.slug} unit={u} currency={currency} start={start} />
            ))}
          </div>
        ) : (
          <p className="text-copy">No apartments match those filters — try clearing a filter.</p>
        )}
      </div>
    </section>
  );
}
