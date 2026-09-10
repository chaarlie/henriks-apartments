"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Currency } from "@/lib/money";
import type { SiteContent } from "@/lib/content";
import { DAY, makeBlocked } from "@/lib/dates";

interface BookingState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  start: number | null;
  end: number | null;
  /** select a day — first tap sets move-in, second sets move-out */
  pick: (t: number) => void;
  setRange: (start: number | null, end: number | null) => void;
  clearDates: () => void;
  /** month-paging offset for the calendar */
  offset: number;
  setOffset: (fn: (o: number) => number) => void;
  blocked: (t: number) => boolean;
  /** slug of the unit shared across the landing carousel, cards, and cost estimator */
  selectedSlug: string;
  setSelected: (slug: string) => void;
  /** landing search filters */
  kw: string;
  setKw: (s: string) => void;
  layout: string;
  setLayout: (s: string) => void;
  maxRent: string;
  setMaxRent: (s: string) => void;
}

const Ctx = createContext<BookingState | null>(null);

// Exposes the fetched SiteContent to the client component tree, so components
// read it from context instead of importing the static lib/content module.
const ContentCtx = createContext<SiteContent | null>(null);

export function useContent(): SiteContent {
  const ctx = useContext(ContentCtx);
  if (!ctx) throw new Error("useContent must be used within BookingProvider");
  return ctx;
}

interface Range {
  start: number | null;
  end: number | null;
}

export function BookingProvider({
  content,
  children,
}: {
  content: SiteContent;
  children: ReactNode;
}) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [range, setRangeState] = useState<Range>({ start: null, end: null });
  const [offset, setOffsetState] = useState(0);
  const [kw, setKw] = useState("");
  const [layout, setLayout] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [selectedSlug, setSelected] = useState(() => content.units[0]?.slug ?? "");

  const blocked = useMemo(() => makeBlocked(content), [content]);
  const setOffset = useCallback((fn: (o: number) => number) => setOffsetState(fn), []);

  const setRange = useCallback(
    (start: number | null, end: number | null) => setRangeState({ start, end }),
    [],
  );
  const clearDates = useCallback(() => setRangeState({ start: null, end: null }), []);

  const pick = useCallback(
    (t: number) => {
      setRangeState(({ start, end }) => {
        // fresh selection: no start yet, a completed range, or a tap on/before start
        if (start === null || end !== null || t <= start) {
          return { start: t, end: null };
        }
        // reject a range that spans a blocked day → restart at t
        for (let x = start; x <= t; x += DAY) {
          if (blocked(x)) return { start: t, end: null };
        }
        return { start, end: t };
      });
    },
    [blocked],
  );

  const value = useMemo<BookingState>(
    () => ({
      currency, setCurrency,
      start: range.start, end: range.end, pick, setRange, clearDates,
      offset, setOffset, blocked,
      selectedSlug, setSelected,
      kw, setKw, layout, setLayout, maxRent, setMaxRent,
    }),
    [currency, range, pick, setRange, clearDates, offset, setOffset, blocked, selectedSlug, kw, layout, maxRent],
  );

  return (
    <ContentCtx.Provider value={content}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </ContentCtx.Provider>
  );
}

export function useBooking(): BookingState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
