"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { whatsappHref } from "@/lib/money";
import { computeEstimate, iso, pretty } from "@/lib/dates";
import { requestHold } from "@/lib/actions/booking";
import { useBooking, useContent } from "@/lib/booking";

export default function BookingForm() {
  const { currency, start, end, selectedSlug } = useBooking();
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

  const hasDates = start !== null && end !== null;
  const est = computeEstimate(unit, start, end, currency, content);
  const dateLabel = hasDates ? `${pretty(start)} → ${pretty(end)}` : "Pick your dates";
  const waNote = hasDates ? `held ${pretty(start)} to ${pretty(end)}` : undefined;

  function submit() {
    setError(null);
    if (!hasDates) {
      setError("Pick your dates in the calendar above.");
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

  const inputCls =
    "w-full rounded-[10px] border border-hair-strong bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-deep";

  return (
    <section id="reserve" className="scroll-mt-28 pt-[70px]">
      <div className="mx-auto max-w-[1200px] px-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">Reserve</p>
        <h2 className="mt-2 text-[clamp(26px,3.2vw,36px)] font-semibold tracking-[-0.01em]">
          Hold your dates
        </h2>

        <div className="mt-6 grid gap-6 rounded-2xl border border-hair bg-surface p-6 md:grid-cols-[1fr_1fr] md:p-8">
          {/* Summary */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">You&rsquo;re holding</div>
            <div className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">{unit.name}</div>
            <div className="mt-1 text-[13px] text-copy">{unit.tagline}</div>

            <a
              href="#availability"
              className={`mt-4 flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3 ${
                hasDates ? "border-hair-strong" : "border-dashed border-hair-strong"
              }`}
            >
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">Dates</span>
              <span className={`text-sm font-semibold ${hasDates ? "text-ink" : "text-muted"}`}>{dateLabel}</span>
            </a>

            <div className="mt-4 flex flex-col">
              {est.lines.map((r) => (
                <div key={r.key} className="flex justify-between gap-4 border-t border-hair-soft py-2 first:border-t-0">
                  <span className="text-[13px] text-copy">{r.label}</span>
                  <span className={r.teal ? "text-[13px] font-semibold text-olive" : "font-mono text-[13px] text-ink"}>
                    {r.value}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-baseline justify-between gap-4 rounded-[10px] bg-deep px-4 py-3 text-white">
                <span className="text-sm font-bold">Estimated total</span>
                <span className="font-mono text-[20px] font-medium tracking-[-0.02em]">{est.totalDisplay}</span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.5] text-muted">
                A hold is free and doesn&rsquo;t charge you — Henrik confirms the dates and the deposit with you directly.
              </p>
            </div>
          </div>

          {/* Form / confirmation */}
          <div className="md:border-l md:border-hair md:pl-8">
            {done ? (
              <div className="flex h-full flex-col justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-olive/15 text-xl text-olive">✓</div>
                <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.01em]">Dates held</h3>
                <p className="mt-1.5 text-sm leading-[1.6] text-copy">
                  We&rsquo;ve held <b className="text-ink">{unit.name}</b> for {dateLabel}. Henrik will confirm shortly —
                  message him on WhatsApp to lock it in faster.
                </p>
                <a
                  href={whatsappHref(content, { unit, note: waNote })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block rounded-[10px] bg-olive px-5 py-3 text-center text-[15px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Confirm on WhatsApp
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="bName" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Your name</label>
                  <input id="bName" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="bPhone" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">WhatsApp / phone</label>
                    <input id="bPhone" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
                  </div>
                  <div>
                    <label htmlFor="bEmail" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Email</label>
                    <input id="bEmail" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label htmlFor="bNote" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Anything to add? (optional)</label>
                  <textarea id="bNote" rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                {error && <p className="text-[13px] font-semibold text-[#b3261e]">{error}</p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={pending || !hasDates}
                  className="mt-1 rounded-[10px] bg-olive px-5 py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Holding…" : hasDates ? "Request to hold these dates" : "Pick dates to hold"}
                </button>
                <p className="text-[12px] leading-[1.5] text-muted">
                  We only use your contact to confirm this booking. A WhatsApp number gets the fastest reply.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
