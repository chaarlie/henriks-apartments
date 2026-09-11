"use client";

import Link from "next/link";
import Image from "next/image";
import { type Unit } from "@/lib/content";
import { display, whatsappHref, type Currency } from "@/lib/money";
import { computeEstimate, dayLabel, fxRateNote, numberWord, plural, today } from "@/lib/dates";
import { availableFrom } from "@/lib/filter";
import { availableForDates, freeAgainFrom, scopeUnits } from "@/lib/availability";
import { unitFacts, unitHighlights } from "@/lib/unit";
import { useBooking, useContent } from "@/lib/booking";
import { ArrowIcon, CalendarIcon, ChatIcon, CheckIcon, InfoIcon } from "@/app/components/icons";

const BADGE = "absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold leading-tight";
const LINE_BTN =
  "flex min-h-[46px] items-center justify-center gap-[7px] rounded-[11px] border-[1.5px] border-line-card bg-surface text-[15px] font-bold text-ink transition-colors hover:border-ink hover:bg-tint";
const LINK = "text-[15px] font-bold text-lagoon underline underline-offset-[3px]";

/**
 * Apartment card: framed photo with an availability badge, a sand panel for the
 * facts that decide it (price, nightly rate, size, baths, sleeps), highlights,
 * and — once dates are set — a plain line saying whether it's free and what it costs.
 */
function Card({ unit }: { unit: Unit }) {
  const { currency, start, end, setScope, openPicker } = useBooking();
  const content = useContent();
  const money = (usd: number) => display(usd, currency, content.fxRate);

  const free = availableForDates(content, unit, start, end);
  const opens = availableFrom(unit);
  const est = computeEstimate(unit, start, end, currency, content);
  const againFrom = start !== null && !free ? freeAgainFrom(content, unit, start, end ?? start) : null;
  const highlights = unitHighlights(unit);
  const href = `/apartments/${unit.slug}`;

  const badge =
    start !== null ? (
      free ? (
        <span className={`${BADGE} bg-olive text-white`}>
          <CheckIcon className="h-3.5 w-3.5" />
          Free for your dates
        </span>
      ) : (
        <span className={`${BADGE} bg-ink text-white`}>Booked for your dates</span>
      )
    ) : opens <= today ? (
      <span className={`${BADGE} bg-olive text-white`}>
        <CheckIcon className="h-3.5 w-3.5" />
        Free now
      </span>
    ) : (
      <span className={`${BADGE} bg-white text-ink`}>Free from {dayLabel(opens)}</span>
    );

  return (
    <article className="border-gradient flex flex-col rounded-[18px] p-2.5 transition-[box-shadow,translate] hover:-translate-y-[3px] hover:shadow-[0_22px_44px_-30px_rgba(6,43,68,0.6)]">
      <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden rounded-[11px] bg-ink">
        <Image
          src={unit.image.url}
          alt={unit.image.alt}
          fill
          sizes="(min-width: 1200px) 280px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {badge}
      </Link>

      <div className="flex flex-1 flex-col gap-3.5 px-2 pb-1.5 pt-4">
        <div>
          <h3 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">
            <Link href={href} className="text-ink hover:text-lagoon">
              {unit.name}
            </Link>
          </h3>
          <p className="mt-[3px] text-[15px] text-dense">{unit.tagline}</p>
        </div>

        <div className="rounded-xl bg-sand px-4 pb-[13px] pt-3.5">
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

        {highlights.length > 0 && (
          <ul className="grid gap-2 px-1">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-[9px] text-[15px] font-medium">
                <CheckIcon className="h-4 w-4 text-olive" />
                {h}
              </li>
            ))}
          </ul>
        )}

        {againFrom !== null && (
          <p className="flex items-start gap-2.5 rounded-[10px] bg-page bg-hatch px-3 py-2.5 text-[15px] leading-[1.45] shadow-[inset_0_0_0_1px_var(--color-hair)]">
            <InfoIcon className="mt-0.5 h-4 w-4 text-dense" />
            <span>
              Booked during your dates. Free again from <b>{dayLabel(againFrom)}</b>.
            </span>
          </p>
        )}
        {free && start !== null && end !== null && (
          <p className="flex items-start gap-2.5 rounded-[10px] bg-olive/10 px-3 py-2.5 text-[15px] leading-[1.45]">
            <CheckIcon className="mt-0.5 h-4 w-4 text-olive" />
            <span>
              <b>{est.totalDisplay}</b> estimated for {plural(est.nights, "night")}
              {est.mode === "monthly" ? ", incl. refundable deposit" : ""}
            </span>
          </p>
        )}

        <div className="mt-auto grid gap-2">
          <Link
            href={href}
            className="flex min-h-[50px] items-center justify-center gap-2 rounded-[11px] bg-ink text-base font-extrabold text-white transition-colors hover:bg-ink-hover"
          >
            See the apartment <ArrowIcon />
          </Link>
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <button
              type="button"
              onClick={() => {
                setScope(unit.slug);
                openPicker();
              }}
              className={LINE_BTN}
            >
              <CalendarIcon className="h-4 w-4 text-deep" />
              Check dates
            </button>
            <a
              href={whatsappHref(content, { unit })}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ask about the ${unit.name} on WhatsApp`}
              className={LINE_BTN}
            >
              <ChatIcon className="h-4 w-4 text-deep" />
              Ask
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ApartmentCards() {
  const { currency, setCurrency, start, end, scope, setScope, openPicker } = useBooking();
  const content = useContent();
  const list = scopeUnits(content, scope);

  return (
    <section id="units" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-[18px]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">The apartments</p>
            <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">
              {numberWord(content.units.length)} ways to stay
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-base text-copy">
              {start !== null && end !== null ? (
                <>
                  <span>
                    Showing prices and availability for{" "}
                    <b className="text-ink">
                      {dayLabel(start)} → {dayLabel(end)}
                    </b>
                  </span>
                  <button type="button" onClick={openPicker} className={LINK}>
                    Change dates
                  </button>
                </>
              ) : (
                <span>Water, garbage and 200 Mbps fibre are in the rent. Power is metered.</span>
              )}
              {scope !== "any" && (
                <button type="button" onClick={() => setScope("any")} className={LINK}>
                  Show all {content.units.length} apartments
                </button>
              )}
            </div>
          </div>
          <div className="md:text-right">
            <div className="inline-flex gap-[3px] rounded-[10px] bg-sand p-[3px]" role="group" aria-label="Currency">
              {(["USD", "DOP"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                  className={`rounded-[8px] px-[18px] py-[9px] text-sm font-bold transition-colors ${
                    currency === c ? "bg-deep text-white" : "text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-xs text-copy">
              {fxRateNote(content)}
            </p>
          </div>
        </div>

        <div className="mt-[26px] grid grid-cols-[repeat(auto-fill,minmax(262px,1fr))] gap-[18px]">
          {list.map((u) => (
            <Card key={u.slug} unit={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
