"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { display, whatsappHref } from "@/lib/money";
import { computeEstimate, dayLabel, iso, plural, pretty } from "@/lib/dates";
import { availableForDates, freeUnits } from "@/lib/availability";
import { requestHold } from "@/lib/actions/booking";
import { useBooking, useContent } from "@/lib/booking";
import { ChatIcon, CheckIcon } from "@/app/components/icons";

function Step({ n, children, className = "" }: { n: number; children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2.5 text-[15px] font-extrabold ${className}`}>
      <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-ink text-[13px] text-white">{n}</span>
      {children}
    </p>
  );
}

const LABEL = "mb-1.5 block text-[15px] font-bold";
const INPUT =
  "w-full rounded-[11px] border-[1.5px] border-line-card bg-surface px-3.5 py-3 text-base text-ink outline-none transition-shadow focus:border-deep focus:shadow-[0_0_0_3px_rgba(4,88,140,0.15)]";

/**
 * Landing "Reserve": the estimate and the hold request in one place, as three
 * steps — apartment, dates, details. Dates picked under "Any apartment" may not
 * suit the apartment being held, so a clash is called out with the free ones.
 */
export default function BookingForm() {
  const { currency, start, end, selectedSlug, setSelected, setScope, openPicker } = useBooking();
  const content = useContent();
  const router = useRouter();
  const unit = content.units.find((u) => u.slug === selectedSlug) ?? content.units[0];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const money = (usd: number) => display(usd, currency, content.fxRate);
  const hasDates = start !== null && end !== null;
  const unitFree = availableForDates(content, unit, start, end);
  const alternatives = hasDates && !unitFree ? freeUnits(content, "any", start, end) : [];
  const est = computeEstimate(unit, start, end, currency, content);
  const discount = content.discounts[0];
  const dateLabel = hasDates ? `${dayLabel(start, true)} → ${dayLabel(end, true)}` : "Pick your dates";
  const waNote = hasDates ? `held ${pretty(start)} to ${pretty(end)}` : undefined;

  function chooseDates() {
    setScope(unit.slug);
    openPicker();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!hasDates) {
      setError("Pick your dates first.");
      return;
    }
    startTransition(async () => {
      const res = await requestHold({
        unitSlug: unit.slug,
        start: iso(start!),
        end: iso(end!),
        guest: { name, phone, email },
        note,
      });
      if (res.ok) {
        setDone(true);
        router.refresh(); // reflect the new hold on the calendar
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <section id="reserve" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">Reserve</p>
        <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">
          Hold your dates — free, nothing to pay
        </h2>
        <p className="mt-3 max-w-[40em] text-[17px] text-copy">
          Henrik confirms the dates and the deposit with you directly. A hold never charges you.
        </p>

        <div className="mt-7 grid overflow-hidden rounded-[20px] border-[1.5px] border-line-card bg-surface lg:grid-cols-[1.05fr_1fr]">
          {/* Apartment, dates, estimate */}
          <div className="border-b border-hair p-5 md:p-[30px] lg:border-b-0 lg:border-r">
            <Step n={1} className="mb-2.5">Apartment</Step>
            <div role="group" aria-label="Apartment to hold" className="grid gap-2 sm:grid-cols-2">
              {content.units.map((u) => {
                const free = availableForDates(content, u, start, end);
                const on = u.slug === unit.slug;
                return (
                  <button
                    key={u.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(u.slug)}
                    className={`flex flex-col items-start gap-px rounded-xl border-[1.5px] px-3.5 py-[11px] text-left transition-colors ${
                      on ? "border-deep bg-tint shadow-[inset_0_0_0_1px_var(--color-deep)]" : "border-line-card bg-surface hover:border-ink"
                    }`}
                  >
                    <span className="text-[15px] font-bold">{u.name}</span>
                    <span className={`text-sm ${free ? "text-dense" : "text-booked-ink"}`}>
                      {free ? `${money(u.priceUsd)} / month` : "Booked for your dates"}
                    </span>
                  </button>
                );
              })}
            </div>

            <Step n={2} className="mb-2.5 mt-6">Dates</Step>
            <button
              type="button"
              onClick={chooseDates}
              className={`grid w-full grid-cols-2 overflow-hidden rounded-xl border-[1.5px] border-line-card text-left transition-colors hover:bg-tint ${
                hasDates ? "" : "border-dashed"
              }`}
            >
              <span className="flex flex-col gap-px px-4 py-2.5">
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Arrive</span>
                <span className={`text-base ${start === null ? "font-semibold text-copy" : "font-bold text-ink"}`}>
                  {start === null ? "Choose a day" : dayLabel(start, true)}
                </span>
              </span>
              <span className="flex flex-col gap-px border-l border-hair-strong px-4 py-2.5">
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Leave</span>
                <span className={`text-base ${end === null ? "font-semibold text-copy" : "font-bold text-ink"}`}>
                  {end === null ? "Choose a day" : dayLabel(end, true)}
                </span>
              </span>
            </button>

            {hasDates && !unitFree && (
              <div role="status" className="mt-2.5 rounded-xl bg-sand-soft px-3.5 py-3 text-[15px] text-ink">
                The {unit.name} is booked during these dates.
                {alternatives.length > 0 ? (
                  <>
                    {" "}Free for them:
                    <span className="mt-2 flex flex-wrap gap-2">
                      {alternatives.map((a) => (
                        <button
                          key={a.slug}
                          type="button"
                          onClick={() => setSelected(a.slug)}
                          className="min-h-10 rounded-full border-[1.5px] border-line-card bg-surface px-3.5 text-sm font-bold transition-colors hover:border-ink"
                        >
                          Switch to the {a.name}
                        </button>
                      ))}
                    </span>
                  </>
                ) : (
                  <>
                    {" "}No apartment is free for all of them.{" "}
                    <button type="button" onClick={openPicker} className="font-bold text-lagoon underline underline-offset-[3px]">
                      Choose other dates
                    </button>
                  </>
                )}
              </div>
            )}

            <p className="mb-1 mt-6 text-[15px] font-extrabold">
              {est.nights ? `Estimate for ${plural(est.nights, "night")}` : "Estimate for one month"}
            </p>
            <div aria-live="polite">
              {est.lines.map((r) => (
                <div key={r.key} className="flex justify-between gap-4 border-b border-hair py-2.5 text-[15px]">
                  <span className="text-copy">{r.label}</span>
                  <span className={r.teal ? "font-bold text-olive" : "font-mono text-ink"}>{r.value}</span>
                </div>
              ))}
              <div className="mt-3 flex items-baseline justify-between gap-4 rounded-xl bg-deep px-[18px] py-[15px] text-white">
                <span className="font-bold">Estimated total</span>
                <span className="font-mono text-[26px] font-medium tracking-[-0.02em]">{est.totalDisplay}</span>
              </div>
            </div>
            <p className="mt-2.5 text-sm leading-[1.55] text-copy">
              Power is metered and varies with AC use; the estimate is what tenants actually paid last year.
              {est.mode === "monthly" && discount && est.months < discount.months
                ? ` Stays of ${discount.months} months or more get ${Math.round(discount.pct * 100)}% off the rent.`
                : ""}
            </p>
          </div>

          {/* Details / confirmation */}
          <div className="p-5 md:p-[30px]">
            {done ? (
              <div className="flex h-full flex-col justify-center gap-2.5">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-olive/15 text-olive">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <h3 className="text-2xl font-extrabold">Dates held</h3>
                <p className="text-base leading-[1.6] text-copy">
                  We&rsquo;ve held the <b className="text-ink">{unit.name}</b> for {dateLabel}. Henrik will confirm shortly —
                  message him on WhatsApp to lock it in faster.
                </p>
                <a
                  href={whatsappHref(content, { unit, note: waNote })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-[52px] w-fit items-center gap-2 rounded-xl bg-olive px-6 text-base font-extrabold text-white transition-opacity hover:opacity-90"
                >
                  <ChatIcon className="h-[18px] w-[18px]" />
                  Confirm on WhatsApp
                </a>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
                <Step n={3}>Your details</Step>
                <div>
                  <label htmlFor="bName" className={LABEL}>Your name</label>
                  <input id="bName" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="bPhone" className={LABEL}>WhatsApp or phone</label>
                    <input id="bPhone" className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
                  </div>
                  <div>
                    <label htmlFor="bEmail" className={LABEL}>
                      Email <span className="font-medium text-copy">(or)</span>
                    </label>
                    <input id="bEmail" type="email" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label htmlFor="bNote" className={LABEL}>
                    Anything to add? <span className="font-medium text-copy">(optional)</span>
                  </label>
                  <textarea id="bNote" rows={3} className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                {error && <p role="alert" className="text-[15px] font-bold text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={pending || !hasDates || !unitFree}
                  className="min-h-14 rounded-xl bg-olive px-5 text-[17px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending
                    ? "Holding…"
                    : !hasDates
                      ? "Pick dates to hold"
                      : !unitFree
                        ? "Choose a free apartment"
                        : `Request to hold the ${unit.name}`}
                </button>
                <p className="text-sm leading-[1.5] text-copy">
                  We only use your contact to confirm this booking. A WhatsApp number gets the fastest reply.
                </p>
                <a
                  href={whatsappHref(content, { unit, note: waNote })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[15px] font-bold text-lagoon"
                >
                  <ChatIcon />
                  Rather talk first? Message Henrik on WhatsApp
                </a>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
