"use client";

import Link from "next/link";
import Image from "next/image";
import { type Unit } from "@/lib/content";
import { display, whatsappHref, type Currency } from "@/lib/money";
import { pretty, today } from "@/lib/dates";
import { availableFrom, matchesFilters } from "@/lib/filter";
import { availableForDates } from "@/lib/availability";
import { useBooking, useContent } from "@/lib/booking";

function Card({
  unit,
  currency,
  start,
  end,
  selected,
  onSelect,
}: {
  unit: Unit;
  currency: Currency;
  start: number | null;
  end: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const content = useContent();
  const ok = availableForDates(content, unit, start, end);
  const from = availableFrom(unit);
  const availLabel = from <= today ? "Free now" : `Free ${pretty(from)}`;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-surface transition-opacity ${
        selected ? "border-olive" : "border-hair"
      } ${ok ? "" : "opacity-50"}`}
    >
      {/* Photo — badge only, nothing else over it */}
      <Link href={`/apartments/${unit.slug}`} className="relative block aspect-[4/3] bg-ink">
        <Image
          src={unit.image.url}
          alt={unit.image.alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-[10px] py-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-white ${
            ok ? "bg-olive" : "bg-ink/70"
          }`}
        >
          {ok ? availLabel : `Free ${pretty(from)}`}
        </span>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[19px] font-bold leading-tight tracking-[-0.015em]">
          <Link href={`/apartments/${unit.slug}`} className="text-ink hover:text-lagoon">
            {unit.name}
          </Link>
        </h3>
        <p className="mt-1 font-mono text-xs text-copy">{unit.spec.area} · {unit.spec.bath} · {unit.spec.sleeps}</p>

        <div className="my-3.5 h-px bg-hair-soft" />

        <div className="flex items-baseline gap-1.5">
          <b className="text-[26px] font-bold tracking-[-0.025em]">{display(unit.priceUsd, currency, content.fxRate)}</b>
          <span className="text-[13px] text-copy">per month</span>
        </div>
        <p className="mt-[3px] text-xs font-semibold text-muted">
          about {display(unit.priceNightlyUsd, currency, content.fxRate)} a night short-stay
        </p>

        <ul className="mt-3 flex list-none flex-col gap-1.5 p-0">
          {unit.chips.slice(0, 3).map((c) => (
            <li key={c} className="flex gap-2 text-[13px] text-copy">
              <span className="font-extrabold text-olive">·</span>
              {c}
            </li>
          ))}
        </ul>

        <div className="my-3.5 h-px bg-hair-soft" />

        {/* CTA row — below the photo, no nested interactives */}
        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`flex-1 rounded-[9px] border px-3 py-[11px] text-[13px] font-bold transition-colors ${
              selected ? "border-ink bg-ink text-white" : "border-hair-strong bg-surface text-ink hover:border-ink"
            }`}
          >
            {selected ? "In the estimate ✓" : "Use in estimate"}
          </button>
          <a
            href={whatsappHref(content, { unit })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask about the ${unit.name} on WhatsApp`}
            className="flex-none rounded-[9px] border border-hair-strong bg-page px-[14px] py-[11px] text-[13px] font-bold text-ink transition-colors hover:bg-sand"
          >
            Ask
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ApartmentCards() {
  const { currency, setCurrency, start, end, kw, layout, maxRent, selectedSlug, setSelected } = useBooking();
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
          <div className="text-right">
            <div className="inline-flex gap-[3px] rounded-[10px] bg-sand p-[3px]" role="group" aria-label="Currency">
              {(["USD", "DOP"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                  className={`rounded-[8px] px-4 py-2 text-[13px] font-bold transition-colors ${
                    currency === c ? "bg-deep text-white" : "text-copy"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-copy">
              {currency === "USD" ? "Rents quoted in US dollars" : `At RD$${content.fxRate} / US$1 · indicative rate`}
            </p>
          </div>
        </div>

        {list.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((u) => (
              <Card
                key={u.slug}
                unit={u}
                currency={currency}
                start={start}
                end={end}
                selected={u.slug === selectedSlug}
                onSelect={() => setSelected(u.slug)}
              />
            ))}
          </div>
        ) : (
          <p className="text-copy">No apartments match those filters — try clearing a filter.</p>
        )}
      </div>
    </section>
  );
}
