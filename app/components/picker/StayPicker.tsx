"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useBooking, useContent } from "@/lib/booking";
import { blockedForScope, freeUnits, lastLeaveDay } from "@/lib/availability";
import {
  DAY, DOW, MONTHS, WEEKDAYS,
  addMonths, billingLabel, dayLabel, fullDay, nights, plural, today, utc,
} from "@/lib/dates";
import { ChevronIcon, CloseIcon, InfoIcon } from "@/app/components/icons";

/**
 * The site's one date picker. Guests pick an apartment, tap the day they arrive,
 * then a length or a leaving day. Once an arrival is set, only leaving days that
 * are actually reachable stay tappable, and a note explains the limit — a stay
 * never silently restarts across a booking.
 *
 * Rendered inline in AvailabilitySection and inside StayPickerDialog, which the
 * stay bar, header, cards and booking panels open.
 */

/** Months after the current one the calendar can page to. */
const MONTHS_AHEAD = 11;
/** Two months side by side from this width — the `@2xl` container breakpoint (42rem). */
const TWO_MONTHS_PX = 672;

const PRESETS: { label: string; leave: (arrival: number) => number }[] = [
  { label: "1 week", leave: (t) => t + 7 * DAY },
  { label: "2 weeks", leave: (t) => t + 14 * DAY },
  { label: "1 month", leave: (t) => addMonths(t, 1) },
  { label: "3 months", leave: (t) => addMonths(t, 3) },
  { label: "6 months", leave: (t) => addMonths(t, 6) },
];

// Booked days and the legend swatch share this, so the legend always matches.
const BOOKED = "bg-hatch shadow-[inset_0_0_0_1px_var(--color-hair-soft)]";
const DOT =
  "absolute left-1/2 top-1/2 -z-10 aspect-square w-[min(46px,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full";
const FIELD_LABEL = "font-mono text-[12px] uppercase tracking-[0.1em] text-muted";
const LINK = "text-[15px] font-bold text-lagoon underline underline-offset-[3px]";
const NAV =
  "grid h-12 w-12 flex-none place-items-center rounded-xl border-[1.5px] border-line-card bg-surface text-ink transition-colors hover:enabled:bg-page disabled:cursor-default disabled:opacity-35";
const FIELD =
  "flex min-w-0 flex-1 flex-col gap-px bg-surface px-3 pb-[9px] pt-2 text-left transition-colors hover:enabled:bg-tint disabled:cursor-default @2xl:min-w-[164px] @2xl:px-4";
// Phones: one swipeable row, so the calendar stays near the top. Wider: wraps / grid.
const SWIPE_ROW =
  "-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden @2xl:mx-0 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0";

const BASE_Y = new Date(today).getUTCFullYear();
const BASE_M = new Date(today).getUTCMonth();
const monthStart = (i: number) => utc(BASE_Y, BASE_M + i, 1);
const monthIndex = (t: number) => {
  const d = new Date(t);
  return (d.getUTCFullYear() - BASE_Y) * 12 + d.getUTCMonth() - BASE_M;
};
const LAST_DAY = monthStart(MONTHS_AHEAD + 1) - DAY;

function Note({ children, status }: { children: ReactNode; status?: boolean }) {
  return (
    <div
      role={status ? "status" : undefined}
      className="flex max-w-[72ch] items-start gap-2.5 rounded-xl bg-sand-soft px-3.5 py-[11px] text-[15px] leading-[1.5] text-ink"
    >
      <InfoIcon className="mt-[3px] h-4 w-4 text-olive" />
      <span>{children}</span>
    </div>
  );
}

export default function StayPicker({ variant }: { variant: "inline" | "dialog" }) {
  const {
    start, end, setArrival, setLeave, clearDates,
    scope, setScope, scopeFixed, notice, closePicker,
  } = useBooking();
  const content = useContent();

  const rootRef = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef<number | null>(null);
  const [twoMonths, setTwoMonths] = useState(true);
  const [offset, setOffset] = useState(() =>
    start === null ? 0 : Math.max(0, Math.min(MONTHS_AHEAD - 1, monthIndex(start))),
  );
  const [hover, setHover] = useState<number | null>(null);
  const [focusDay, setFocusDay] = useState<number | null>(start);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setTwoMonths(entry.contentRect.width >= TWO_MONTHS_PX));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A keyboard move can page the calendar; focus the day once it has rendered.
  useEffect(() => {
    const t = focusAfterRender.current;
    if (t === null) return;
    focusAfterRender.current = null;
    rootRef.current?.querySelector<HTMLButtonElement>(`button[data-t="${t}"]`)?.focus();
  });

  const visible = twoMonths ? 2 : 1;
  const maxOffset = MONTHS_AHEAD - visible + 1;
  const off = Math.min(offset, maxOffset);

  const blocked = useMemo(() => blockedForScope(content, scope), [content, scope]);
  const last = useMemo(
    () => (start === null ? null : lastLeaveDay(content, scope, start)),
    [content, scope, start],
  );
  const firstFree = useMemo(() => {
    let t = today;
    while (blocked(t) && t < LAST_DAY) t += DAY;
    return blocked(t) ? null : t;
  }, [blocked]);

  const step = start === null ? 1 : end === null ? 2 : 3;
  const unitName = content.units.find((u) => u.slug === scope)?.name;

  const selectable = (t: number) =>
    start !== null && end === null && last !== null ? t > start && t <= last : !blocked(t);

  function reveal(t: number) {
    const i = monthIndex(t);
    if (i < off) setOffset(Math.max(0, i));
    else if (i > off + visible - 1) setOffset(Math.min(maxOffset, i - visible + 1));
  }

  function moveFocus(t: number) {
    reveal(t);
    setFocusDay(t);
    const el = rootRef.current?.querySelector<HTMLButtonElement>(`button[data-t="${t}"]`);
    if (el && el.offsetParent !== null) el.focus();
    else focusAfterRender.current = t;
  }

  function choose(t: number) {
    if (!selectable(t)) return;
    if (start !== null && end === null) {
      setLeave(t);
      setAnnouncement(`Leaving ${fullDay(t)}. ${plural(nights(start, t), "night")}.`);
    } else {
      setArrival(t);
      setAnnouncement(`Arriving ${fullDay(t)}. Now choose how long you’re staying.`);
    }
    setHover(null);
    setFocusDay(t);
  }

  function chooseLength(leave: number) {
    if (start === null) return;
    setLeave(leave);
    reveal(leave);
    setFocusDay(leave);
    setAnnouncement(`Leaving ${fullDay(leave)}. ${plural(nights(start, leave), "night")}.`);
  }

  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-t]");
    if (!btn) return;
    const t = Number(btn.dataset.t);
    const col = (new Date(t).getUTCDay() + 6) % 7;
    const moves: Record<string, number> = {
      ArrowLeft: t - DAY,
      ArrowRight: t + DAY,
      ArrowUp: t - 7 * DAY,
      ArrowDown: t + 7 * DAY,
      PageUp: addMonths(t, -1),
      PageDown: addMonths(t, 1),
      Home: t - col * DAY,
      End: t + (6 - col) * DAY,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    moveFocus(Math.max(monthStart(0), Math.min(LAST_DAY, moves[e.key])));
  }

  function onGridPointerOver(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || step !== 2) return;
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-t]");
    const t = btn ? Number(btn.dataset.t) : null;
    const next = t !== null && selectable(t) ? t : null;
    if (next !== hover) setHover(next);
  }

  const n = start !== null && end !== null ? nights(start, end) : 0;
  const free = start !== null && end !== null ? freeUnits(content, scope, start, end) : [];
  // "Any apartment" leads to the matching cards; one apartment leads to its hold form.
  const target = scope === "any" ? "units" : "reserve";
  const ctaLabel =
    step < 3
      ? "Pick your dates"
      : scope === "any"
        ? `Show ${plural(free.length, "free apartment")}`
        : "Hold these dates";

  function confirm() {
    if (step !== 3) return;
    if (variant === "dialog") closePicker();
    // Let the dialog close (it hands focus back to its opener) before scrolling on.
    window.setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(target)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 60);
  }

  // Why the stay can't run longer: shown whenever it rules out one of the length buttons.
  let limit: string | null = null;
  if (start !== null && end === null && last !== null && last < addMonths(start, 6)) {
    const longest = plural(nights(start, last), "night");
    if (last === start) {
      limit = scope === "any"
        ? "Every apartment is booked the next day. Choose another arrival day."
        : `The ${unitName} is booked from ${dayLabel(start + DAY)}. Choose another arrival day.`;
    } else {
      limit = scope === "any"
        ? `From this arrival, the longest stay in any apartment is ${longest}, leaving ${dayLabel(last)}.`
        : `The ${unitName} is booked from ${dayLabel(last + DAY)}, so the longest stay from this arrival is ${longest}.`;
    }
  }

  // Calendar months (two are built; the second only shows on wide containers).
  const months = [0, 1].map((i) => {
    const first = new Date(monthStart(off + i));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth();
    const len = new Date(utc(y, m + 1, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7;
    const cells: (number | null)[] = [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: len }, (_, k) => utc(y, m, k + 1)),
    ];
    while (cells.length % 7) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let w = 0; w < cells.length; w += 7) weeks.push(cells.slice(w, w + 7));
    return { key: `${y}-${m}`, month: MONTHS[m], year: y, weeks };
  });
  const wideLabel =
    months[0].year === months[1].year
      ? `${months[0].month} – ${months[1].month} ${months[1].year}`
      : `${months[0].month} ${months[0].year} – ${months[1].month} ${months[1].year}`;

  // One tab stop for the whole calendar (arrow keys move within it).
  const visFirst = monthStart(off);
  const visLast = monthStart(off + visible) - DAY;
  let tabDay = focusDay !== null && focusDay >= visFirst && focusDay <= visLast ? focusDay : null;
  for (let t = visFirst; tabDay === null && t <= visLast; t += DAY) if (selectable(t)) tabDay = t;
  tabDay ??= visFirst;

  const preview = start !== null && end === null && hover !== null ? hover : null;

  function dayCell(t: number) {
    const isStart = t === start;
    const isEnd = t === end;
    const isEdge = isStart || isEnd;
    const inStay = start !== null && end !== null && t > start && t < end;
    const isPreviewEnd = preview !== null && t === preview;
    const inPreview = preview !== null && start !== null && t > start && t < preview;
    const sel = selectable(t);

    let band = "";
    if (end !== null) {
      band = isStart ? "left-1/2 right-0 bg-sand" : isEnd ? "left-0 right-1/2 bg-sand" : inStay ? "inset-x-0 bg-sand" : "";
    } else if (preview !== null) {
      band = isStart ? "left-1/2 right-0 bg-sand-soft" : isPreviewEnd ? "left-0 right-1/2 bg-sand-soft" : inPreview ? "inset-x-0 bg-sand-soft" : "";
    }

    let tone: string;
    let status: string;
    if (isEdge) {
      tone = "w-full font-extrabold text-white";
      status = isStart ? "your arrival day" : "your leaving day";
    } else if (t < today) {
      tone = "w-full cursor-default font-semibold text-muted opacity-50";
      status = "in the past";
    } else if (blocked(t)) {
      tone = `${BOOKED} mx-0.5 w-[calc(100%-4px)] cursor-not-allowed font-semibold text-booked-ink`;
      status = "booked";
    } else if (!sel) {
      tone = "w-full cursor-default font-semibold text-copy opacity-40";
      status = "not possible for this stay";
    } else {
      tone = `w-full cursor-pointer text-ink hover:bg-ink/5 ${isPreviewEnd ? "font-extrabold" : "font-semibold"}`;
      status = inStay ? "part of your stay" : "available";
    }

    return (
      <div key={t} role="gridcell" aria-selected={isEdge || inStay} className="relative py-[3px]">
        {band && <span aria-hidden className={`absolute inset-y-[3px] ${band}`} />}
        <button
          type="button"
          data-t={t}
          tabIndex={t === tabDay ? 0 : -1}
          aria-label={`${fullDay(t)}${t === today ? ", today" : ""}, ${status}`}
          aria-disabled={!sel}
          onClick={() => choose(t)}
          className={`relative isolate grid h-12 place-items-center rounded-xl text-base tabular-nums transition-colors ${tone}`}
        >
          {isEdge && <span aria-hidden className={`${DOT} bg-deep`} />}
          {isPreviewEnd && <span aria-hidden className={`${DOT} bg-surface shadow-[inset_0_0_0_2px_var(--color-deep)]`} />}
          {new Date(t).getUTCDate()}
          {t === today && (
            <span aria-hidden className={`absolute bottom-1.5 left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full ${isEdge ? "bg-white" : "bg-lagoon"}`} />
          )}
        </button>
      </div>
    );
  }

  const heading = "text-[clamp(22px,3vw,28px)] font-bold leading-[1.2] tracking-[-0.015em]";
  const lede = "max-w-[64ch] text-base leading-[1.55] text-copy";

  return (
    <div
      ref={rootRef}
      className={`@container ${
        variant === "inline"
          ? "rounded-[20px] border-[1.5px] border-line-card bg-surface shadow-[0_26px_60px_-34px_rgba(6,43,68,0.5)]"
          : "flex min-h-full flex-col"
      }`}
    >
      {variant === "dialog" && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hair-soft bg-surface px-4 py-3 @2xl:px-7">
          <h2 id="stay-picker-title" className="text-lg font-bold tracking-[-0.01em]">
            {scopeFixed && unitName ? `Dates for the ${unitName}` : "Choose your dates"}
          </h2>
          <button
            type="button"
            onClick={closePicker}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-line-card px-4 text-[15px] font-bold text-ink transition-colors hover:border-ink"
          >
            Close
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Apartment, question, lengths */}
      <div className="grid gap-[18px] px-4 pt-5 @2xl:px-7 @2xl:pt-6">
        {!scopeFixed && (
          <div role="group" aria-label="Apartment" className={`${SWIPE_ROW} @2xl:flex-wrap`}>
            {[{ slug: "any", name: "Any apartment" }, ...content.units.map(({ slug, name }) => ({ slug, name }))].map((u) => {
              const on = scope === u.slug;
              return (
                <button
                  key={u.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setScope(u.slug)}
                  className={`min-h-11 flex-none rounded-full border-[1.5px] px-[18px] text-[15px] font-bold transition-colors ${
                    on ? "border-ink bg-ink text-white" : "border-line-card bg-surface text-ink hover:border-ink"
                  }`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex min-h-[132px] flex-col items-start gap-2 @2xl:min-h-[156px]">
          {notice && <Note status>{notice}</Note>}
          {step === 1 && (
            <>
              <h3 className={heading}>When do you arrive?</h3>
              <p className={lede}>
                Tap your arrival day. Striped days are already booked{scope === "any" ? " in every apartment" : ""}.
              </p>
              {firstFree !== null && firstFree > today && (
                <button type="button" onClick={() => moveFocus(firstFree)} className={LINK}>
                  Go to the first free day, {dayLabel(firstFree)}
                </button>
              )}
            </>
          )}
          {step === 2 && start !== null && (
            <>
              <h3 className={heading}>How long are you staying?</h3>
              <p className={lede}>
                Arriving <b className="font-bold text-ink">{fullDay(start)}</b>. Choose a length, or tap your leaving day.{" "}
                <button type="button" onClick={clearDates} className={LINK}>
                  Change arrival day
                </button>
              </p>
              {limit && <Note>{limit}</Note>}
            </>
          )}
          {step === 3 && start !== null && end !== null && (
            <>
              <h3 className={heading}>Your stay: {plural(n, "night")}</h3>
              <p className={lede}>
                {dayLabel(start)} to {dayLabel(end)}, {billingLabel(n)}.
                {scope === "any" && ` Free for these dates: ${free.map((u) => u.name).join(", ")}.`} Change the length
                below, or tap a new arrival day.
              </p>
            </>
          )}
        </div>

        <div role="group" aria-label="Length of stay" className={`${SWIPE_ROW} @2xl:grid @2xl:grid-cols-5`}>
          {PRESETS.map((p) => {
            const base =
              "flex min-h-16 min-w-[132px] flex-none flex-col items-start gap-px rounded-xl border-[1.5px] px-3.5 py-[11px] text-left @2xl:min-w-0";
            if (start === null) {
              return (
                <button key={p.label} type="button" tabIndex={-1} aria-disabled className={`${base} cursor-default border-line-card bg-surface opacity-50`}>
                  <b className="text-[17px] font-extrabold">{p.label}</b>
                  <span className="text-sm text-copy">after arrival</span>
                </button>
              );
            }
            const leave = p.leave(start);
            if (freeUnits(content, scope, start, leave).length === 0) {
              return (
                <button key={p.label} type="button" aria-disabled className={`${base} ${BOOKED} cursor-not-allowed border-dashed border-line-card text-booked-ink`}>
                  <b className="text-[17px] font-extrabold">{p.label}</b>
                  <span className="text-sm">Booked</span>
                </button>
              );
            }
            const on = end === leave;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => chooseLength(leave)}
                className={`${base} cursor-pointer transition-colors ${
                  on
                    ? "border-deep bg-tint shadow-[inset_0_0_0_1px_var(--color-deep)]"
                    : "border-line-card bg-surface hover:border-deep hover:bg-tint"
                }`}
              >
                <b className="text-[17px] font-extrabold text-ink">{p.label}</b>
                <span className="whitespace-nowrap text-sm text-copy">Leave {dayLabel(leave)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar */}
      <div className="px-3.5 pb-1 pt-4 @2xl:px-7 @2xl:pt-5">
        <div className="mb-1 flex items-center gap-3">
          <button type="button" aria-label="Earlier month" disabled={off === 0} onClick={() => { setOffset(off - 1); setFocusDay(null); }} className={NAV}>
            <ChevronIcon dir="left" className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center text-[17px] font-bold" aria-live="polite">
            <span className="@2xl:hidden">{months[0].month} {months[0].year}</span>
            <span className="hidden @2xl:inline">{wideLabel}</span>
          </div>
          <button type="button" aria-label="Later month" disabled={off >= maxOffset} onClick={() => { setOffset(off + 1); setFocusDay(null); }} className={NAV}>
            <ChevronIcon dir="right" className="h-5 w-5" />
          </button>
        </div>

        <div
          className="grid grid-cols-1 gap-11 @2xl:grid-cols-2"
          onKeyDown={onGridKey}
          onPointerOver={onGridPointerOver}
          onMouseLeave={() => setHover(null)}
        >
          {months.map((mo, i) => (
            <div key={mo.key} className={i === 1 ? "hidden @2xl:block" : undefined}>
              <div aria-hidden className="mb-2 mt-1.5 hidden text-[17px] font-extrabold @2xl:block">
                {mo.month} {mo.year}
              </div>
              <div role="grid" aria-label={`${mo.month} ${mo.year}`}>
                <div role="row" className="grid grid-cols-7 pb-1.5">
                  {DOW.map((d, k) => (
                    <span key={d} role="columnheader" aria-label={WEEKDAYS[(k + 1) % 7]} className="text-center text-[13px] font-bold text-muted">
                      {d}
                    </span>
                  ))}
                </div>
                {mo.weeks.map((week, w) => (
                  <div key={w} role="row" className="grid grid-cols-7">
                    {week.map((t, k) => (t === null ? <div key={`e${k}`} role="gridcell" /> : dayCell(t)))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend — swatches reuse the day styles */}
      <div className="mx-4 mt-2.5 flex flex-wrap gap-x-[22px] gap-y-2.5 border-t border-hair-soft py-3.5 text-sm text-copy @2xl:mx-7">
        <span className="inline-flex items-center gap-2"><i className="h-6 w-6 rounded-[7px] border border-hair-strong" />Available</span>
        <span className="inline-flex items-center gap-2"><i className="h-6 w-6 rounded-full bg-deep" />Arrive / leave</span>
        <span className="inline-flex items-center gap-2"><i className="h-6 w-6 rounded-[7px] bg-sand" />Your stay</span>
        <span className="inline-flex items-center gap-2"><i className={`h-6 w-6 rounded-[7px] ${BOOKED}`} />Booked</span>
        <span className="inline-flex items-center gap-2">
          <i className="relative h-6 w-6 rounded-[7px] border border-hair-strong">
            <span className="absolute bottom-1 left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-lagoon" />
          </i>
          Today
        </span>
      </div>

      {/* Summary — stays in reach at the bottom on small screens */}
      <div
        className={`sticky bottom-0 z-10 flex flex-wrap items-center gap-2.5 border-t border-hair bg-surface px-3.5 pb-3.5 pt-3 shadow-[0_-14px_26px_-22px_rgba(6,43,68,0.45)] @2xl:gap-x-[18px] @2xl:px-7 @2xl:py-4 ${
          variant === "inline" ? "rounded-b-[20px]" : "mt-auto"
        }`}
      >
        <div className="flex w-full overflow-hidden rounded-[14px] border-[1.5px] border-line-card @2xl:w-auto">
          <button
            type="button"
            onClick={clearDates}
            aria-label={start === null ? "Arrive: choose a day" : `Arrive ${fullDay(start)}. Change arrival day`}
            className={`${FIELD} ${step === 1 ? "shadow-[inset_0_-3px_0_var(--color-deep)]" : ""}`}
          >
            <span className={FIELD_LABEL}>Arrive</span>
            <span className={`whitespace-nowrap text-[15px] @2xl:text-base ${start === null ? "font-semibold text-muted" : "font-bold text-ink"}`}>
              {start === null ? "Choose a day" : dayLabel(start, true)}
            </span>
          </button>
          <button
            type="button"
            disabled={start === null}
            onClick={() => start !== null && setArrival(start)}
            aria-label={end === null ? "Leave: choose a day" : `Leave ${fullDay(end)}. Change leaving day`}
            className={`${FIELD} border-l border-hair-strong ${step === 2 ? "shadow-[inset_0_-3px_0_var(--color-deep)]" : ""}`}
          >
            <span className={FIELD_LABEL}>Leave</span>
            <span className={`whitespace-nowrap text-[15px] @2xl:text-base ${end === null ? "font-semibold text-muted" : "font-bold text-ink"}`}>
              {end === null ? "Choose a day" : dayLabel(end, true)}
            </span>
          </button>
        </div>
        {step === 3 && (
          <p className="basis-full text-[15px] text-copy @2xl:basis-auto">
            <b className="text-ink">{plural(n, "night")}</b> · {billingLabel(n)}
          </p>
        )}
        <div className="flex w-full items-center gap-2 @2xl:ml-auto @2xl:w-auto">
          {start !== null && (
            <button type="button" onClick={clearDates} className="px-2 py-3 text-[15px] font-bold text-copy underline underline-offset-[3px]">
              Start over
            </button>
          )}
          <button
            type="button"
            aria-disabled={step < 3}
            onClick={confirm}
            className={`min-h-[52px] flex-1 rounded-xl px-6 text-base font-extrabold transition-opacity @2xl:flex-none ${
              step === 3 ? "bg-olive text-white hover:opacity-90" : "cursor-not-allowed bg-page text-muted"
            }`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{announcement}</p>
    </div>
  );
}
