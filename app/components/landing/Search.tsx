"use client";

import { fromIso, iso, today } from "@/lib/dates";
import { availableForDates, matchesFilters } from "@/lib/filter";
import { useBooking, useContent } from "@/lib/booking";

const minIso = iso(today);

export default function Search() {
  const {
    start, end, setRange,
    kw, setKw, layout, setLayout, maxRent, setMaxRent, clearDates,
  } = useBooking();
  const content = useContent();

  const matches = content.units.filter(
    (u) => matchesFilters(u, kw, layout, maxRent) && availableForDates(u, start),
  ).length;

  const onIn = (v: string) => {
    const s = v ? fromIso(v) : null;
    setRange(s, end !== null && s !== null && end <= s ? null : end);
  };
  const onOut = (v: string) => {
    const t = v ? fromIso(v) : null;
    if (t !== null && start !== null && t > start) setRange(start, t);
    else if (t === null) setRange(start, null);
  };

  const clearAll = () => {
    setKw("");
    setLayout("");
    setMaxRent("");
    clearDates();
  };

  const cell = "border-r border-hair-soft px-[22px] py-[15px] last:border-r-0";
  const label = "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted";
  const field =
    "w-full cursor-pointer appearance-none border-0 bg-transparent text-[15px] font-semibold text-ink";

  return (
    <section id="search" className="pt-[66px] text-center">
      <div className="mx-auto max-w-[1200px] px-7">
        <h2 className="text-[clamp(32px,4.6vw,52px)] font-semibold tracking-[-0.01em]">
          Find your stay
        </h2>
        <p className="mx-auto mt-3 max-w-[44em] text-base text-copy">
          Search furnished studios, one- and two-bedroom apartments in El Batey — pick your dates
          and we&rsquo;ll show what&rsquo;s free.
        </p>

        <div className="mx-auto mt-[30px] max-w-[960px] overflow-hidden rounded-[18px] border border-hair bg-surface text-left shadow-[0_26px_60px_-34px_rgba(6,43,68,0.5)]">
          <div className="flex items-center gap-3 border-b border-hair-soft px-[22px] py-[18px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-[19px] w-[19px] shrink-0 text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              type="text"
              name="q"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search apartments"
              placeholder="Search by view, layout or amenity — pool, balcony, desk…"
              className="flex-1 border-0 bg-transparent text-base text-ink placeholder:text-muted"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className={cell}>
              <label className={label} htmlFor="fLayout">Layout</label>
              <select id="fLayout" value={layout} onChange={(e) => setLayout(e.target.value)} className={field}>
                <option value="">Any layout</option>
                {content.units.map((u) => (
                  <option key={u.slug} value={u.slug}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className={cell}>
              <label className={label} htmlFor="fIn">Move-in</label>
              <input id="fIn" type="date" min={minIso} value={start !== null ? iso(start) : ""} onChange={(e) => onIn(e.target.value)} className={field} />
            </div>
            <div className={cell}>
              <label className={label} htmlFor="fOut">Move-out</label>
              <input id="fOut" type="date" min={minIso} value={end !== null ? iso(end) : ""} onChange={(e) => onOut(e.target.value)} className={field} />
            </div>
            <div className={cell}>
              <label className={label} htmlFor="fMax">Max rent</label>
              <select id="fMax" value={maxRent} onChange={(e) => setMaxRent(e.target.value)} className={field}>
                <option value="">No maximum</option>
                <option value="700">$700 / mo</option>
                <option value="900">$900 / mo</option>
                <option value="1300">$1,300 / mo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-hair-soft bg-[#fbfcfe] px-[22px] py-3.5">
            <span className="text-sm text-copy" aria-live="polite" role="status">
              <b className="text-ink">{matches}</b> apartment{matches === 1 ? "" : "s"} match
            </span>
            <button type="button" onClick={clearAll} className="text-[13px] text-copy underline">
              Clear
            </button>
            <a
              href="#units"
              className="ml-auto rounded-full bg-ink px-[30px] py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#0a3856]"
            >
              Search
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
