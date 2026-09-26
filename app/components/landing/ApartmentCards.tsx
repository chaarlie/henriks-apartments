"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type Unit } from "@/lib/content";
import { localePath, splitLocale } from "@/lib/locales";
import { display, whatsappHref, type Currency } from "@/lib/money";
import { today } from "@/lib/dates";
import { useDates } from "@/lib/i18n/dates";
import { useUi } from "@/lib/i18n/client";
import { availableFrom } from "@/lib/filter";
import { availableForDates, freeAgainFrom, scopeUnits } from "@/lib/availability";
import { unitFacts, unitHighlights, unitLabel } from "@/lib/unit";
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
  const t = useUi();
  const { computeEstimate, dayLabel } = useDates();
  const money = (usd: number) => display(usd, currency, content.fxRate);

  const free = availableForDates(content, unit, start, end);
  const opens = availableFrom(unit);
  const est = computeEstimate(unit, start, end, currency, content);
  const againFrom = start !== null && !free ? freeAgainFrom(content, unit, start, end ?? start) : null;
  const highlights = unitHighlights(unit);
  // Keep the reader in the language they are browsing in — an unprefixed link
  // here would drop a Spanish visitor back into the English apartment page.
  const { locale } = splitLocale(usePathname());
  const href = localePath(locale, `/apartments/${unit.slug}`);

  const badge =
    start !== null ? (
      free ? (
        <span className={`${BADGE} bg-olive text-white`}>
          <CheckIcon className="h-3.5 w-3.5" />
          {t.freeForYourDates}
        </span>
      ) : (
        <span className={`${BADGE} bg-ink text-white`}>{t.bookedForYourDates}</span>
      )
    ) : opens <= today ? (
      <span className={`${BADGE} bg-olive text-white`}>
        <CheckIcon className="h-3.5 w-3.5" />
        {t.freeNow}
      </span>
    ) : (
      <span className={`${BADGE} bg-white text-ink`}>{t.freeFrom(dayLabel(opens))}</span>
    );

  return (
    /*
      `relative` anchors the stretched link below. The card LOOKS like one
      clickable object — it lifts and shadows on hover — so it has to behave like
      one: crossing it used to change the cursor five times (hand on the photo,
      hand on the title, an I-beam over the tagline, an arrow over the price
      panel, hand again on the button), which reads as the card flickering
      between clickable and not.
    */
    <article className="border-gradient relative flex flex-col rounded-[18px] p-2.5 transition-[box-shadow,translate] hover:-translate-y-[3px] hover:shadow-[0_22px_44px_-30px_rgba(6,43,68,0.6)]">
      <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden rounded-[11px] bg-ink">
        <Image
          src={unit.image.url}
          alt={unit.image.alt}
          fill
          sizes="(min-width: 1200px) 280px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {badge}
        {/* decorative — the accessible version is the line under the tagline */}
        {unit.forSale && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-sand px-3 py-1.5 text-[13px] font-bold leading-tight text-ink">
            {t.forSaleBadge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3.5 px-2 pb-1.5 pt-4">
        <div>
          <h3 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">
            {/*
              The card's stretched link: `after:absolute after:inset-0` grows this
              one anchor's hit area over the whole <article>, so the pointer is a
              hand anywhere on the card and a click lands on the apartment — which
              is where the photo, the title and the primary button all already
              went. One real link, so the accessibility tree is unchanged.
            */}
            <Link
              href={href}
              className="text-ink after:absolute after:inset-0 after:rounded-[18px] hover:text-lagoon"
            >
              {unit.name}
            </Link>
          </h3>
          <p className="mt-[3px] text-[15px] text-dense">{unit.tagline}</p>
          {unit.forSale && (
            <p className="mt-2 text-[15px] font-bold text-lagoon">
              {t.alsoForSale} ·{" "}
              {unit.salePriceUsd ? money(unit.salePriceUsd) : t.priceOnRequestInline}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-sand px-4 pb-[13px] pt-3.5">
          <p className="flex items-baseline gap-1.5">
            <b className="text-[31px] font-extrabold leading-[1.1] tracking-[-0.03em]">{money(unit.priceUsd)}</b>
            <span className="text-[15px] font-semibold text-dense">{t.perMonth}</span>
          </p>
          <p className="mt-0.5 text-[15px] text-dense">
            {t.nightlyBefore}
            <b className="text-ink">{money(unit.priceNightlyUsd)}</b>
            {t.nightlyAfter}
          </p>
          <dl className="mt-3 grid grid-cols-3 border-t border-sand2 pt-[11px]">
            {unitFacts(unit).map(([k, v], i) => (
              <div key={k} className={i ? "border-l border-sand2 pl-3" : ""}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-dense">{t[k]}</dt>
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
              {t.bookedDuringBefore}
              <b>{dayLabel(againFrom)}</b>
              {t.bookedDuringAfter}
            </span>
          </p>
        )}
        {free && start !== null && end !== null && (
          <p className="flex items-start gap-2.5 rounded-[10px] bg-olive/10 px-3 py-2.5 text-[15px] leading-[1.45]">
            <CheckIcon className="mt-0.5 h-4 w-4 text-olive" />
            <span>
              <b>{est.totalDisplay}</b> {t.estimatedForNights(est.nights)}
              {est.lines.some((l) => l.key === "deposit") ? t.inclDeposit : ""}
            </span>
          </p>
        )}

        {/*
          Above the stretched link, or it would swallow them. "Check dates" opens
          the picker and "Ask" opens WhatsApp — neither goes where the card goes.
        */}
        <div className="relative z-10 mt-auto grid gap-2">
          <Link
            href={href}
            className="flex min-h-[50px] items-center justify-center gap-2 rounded-[11px] bg-ink text-base font-extrabold text-white transition-colors hover:bg-ink-hover"
          >
            {t.seeTheApartment} <ArrowIcon />
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
              {t.checkDates}
            </button>
            <a
              href={whatsappHref(content, { unit })}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.askAboutOnWhatsapp(unitLabel(unit))}
              className={LINE_BTN}
            >
              <ChatIcon className="h-4 w-4 text-deep" />
              {t.ask}
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
  const t = useUi();
  const { dayLabel, fxRateNote } = useDates();
  const list = scopeUnits(content, scope);

  return (
    <section id="units" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-[18px]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">{t.theApartments}</p>
            <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">
              {t.waysToStay(t.numberWord(content.units.length))}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-base text-copy">
              {start !== null && end !== null ? (
                <>
                  <span>
                    {t.showingPricesFor}{" "}
                    <b className="text-ink">
                      {dayLabel(start)} → {dayLabel(end)}
                    </b>
                  </span>
                  <button type="button" onClick={openPicker} className={LINK}>
                    {t.changeDates}
                  </button>
                </>
              ) : (
                <span>{t.rentIncludesNote(content.internetMbps)}</span>
              )}
              {scope !== "any" && (
                <button type="button" onClick={() => setScope("any")} className={LINK}>
                  {t.showAllApartments(content.units.length)}
                </button>
              )}
            </div>
          </div>
          <div className="md:text-right">
            <div className="inline-flex gap-[3px] rounded-[10px] bg-sand p-[3px]" role="group" aria-label={t.currency}>
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
