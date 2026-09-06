"use client";

import { DOW, MONTHS, today, utc } from "@/lib/dates";
import { useBooking } from "@/lib/booking";

interface Cell {
  key: string;
  day: number | null;
  t: number;
  gone: boolean;
  edge: "start" | "end" | null;
  inRange: boolean;
}

function monthCells(year: number, month: number, opts: {
  start: number | null;
  end: number | null;
  blocked: (t: number) => boolean;
}): Cell[] {
  const lead = (new Date(utc(year, month, 1)).getUTCDay() + 6) % 7;
  const len = new Date(utc(year, month + 1, 0)).getUTCDate();
  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: `e${i}`, day: null, t: 0, gone: true, edge: null, inRange: false });
  }
  for (let d = 1; d <= len; d++) {
    const t = utc(year, month, d);
    const edge = t === opts.start ? "start" : t === opts.end ? "end" : null;
    const inRange =
      opts.start !== null && opts.end !== null && t > opts.start && t < opts.end;
    cells.push({ key: `d${d}`, day: d, t, gone: opts.blocked(t), edge, inRange });
  }
  return cells;
}

export default function Calendar({
  eyebrow = "Any range, any length",
  heading = "Check availability",
  sub,
}: {
  eyebrow?: string;
  heading?: string;
  sub?: string;
}) {
  const { start, end, pick, offset, setOffset, clearDates, blocked } = useBooking();

  const base = new Date(today);
  const months = [0, 1].map((i) => {
    const d = new Date(utc(base.getUTCFullYear(), base.getUTCMonth() + offset + i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    return { label: `${MONTHS[m]} ${y}`, cells: monthCells(y, m, { start, end, blocked }) };
  });

  return (
    <section id="availability" className="scroll-mt-28 pt-[70px]">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">{eyebrow}</p>
            <h2 className="mt-2 text-[clamp(26px,3.2vw,36px)] font-semibold tracking-[-0.01em]">
              {heading}
            </h2>
            {sub && <p className="mt-1.5 text-[15px] text-copy">{sub}</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              aria-label="Previous month"
              className="h-10 w-10 rounded-lg border border-hair-strong bg-surface text-[15px] text-ink hover:bg-page"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(10, o + 1))}
              aria-label="Next month"
              className="h-10 w-10 rounded-lg border border-hair-strong bg-surface text-[15px] text-ink hover:bg-page"
            >
              →
            </button>
            <button
              type="button"
              onClick={clearDates}
              className="h-10 rounded-lg border border-hair-strong bg-transparent px-4 text-sm text-copy hover:bg-surface"
            >
              Clear
            </button>
          </div>
        </div>

        <div data-cal-card className="rounded-2xl border border-hair bg-surface p-6">
          <div className="flex flex-wrap gap-9">
            {months.map((mo) => (
              <div key={mo.label} className="min-w-[280px] flex-1 basis-[280px]">
                <div className="mb-3 text-base font-bold tracking-[-0.01em]">{mo.label}</div>
                <div className="mb-1.5 grid grid-cols-7 gap-[3px]">
                  {DOW.map((d) => (
                    <div key={d} className="text-center font-mono text-[10px] tracking-[0.1em] text-muted">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-[3px]">
                  {mo.cells.map((c) => {
                    if (c.day === null) return <div key={c.key} className="h-10" />;
                    const base =
                      "h-10 font-mono text-[13px] transition-colors";
                    const cls = c.edge
                      ? `${base} bg-deep font-semibold text-white ${c.edge === "start" ? "rounded-l-lg" : "rounded-r-lg"}`
                      : c.inRange
                        ? `${base} bg-sand`
                        : c.gone
                          ? `${base} rounded-lg text-[#a9bfce] line-through`
                          : `${base} rounded-lg text-ink hover:bg-page`;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        disabled={c.gone}
                        onClick={() => pick(c.t)}
                        className={cls + (c.gone ? " cursor-default" : " cursor-pointer")}
                      >
                        {c.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-[22px] flex flex-wrap items-center gap-5 border-t border-hair-soft pt-[18px] text-[13px] text-copy">
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-hair-strong bg-white" />
              Available
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-sand" />
              Your stay
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-dashed border-[#a9bfce] bg-page" />
              Booked or past
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Dates kept by hand · booking sync to follow
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
