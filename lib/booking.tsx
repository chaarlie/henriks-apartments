"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUi } from "@/lib/i18n/client";
import type { Currency } from "@/lib/money";
import type { SiteContent } from "@/lib/content";
import { blockedForScope, freeUnits } from "@/lib/availability";

interface BookingState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  start: number | null;
  end: number | null;
  /** set the arrival day (clears the leaving day) */
  setArrival: (t: number) => void;
  /** set the leaving day — ignored unless an apartment in scope is free for the whole stay */
  setLeave: (t: number) => void;
  clearDates: () => void;
  /** which apartments the date picker, stay bar and cards look at: a unit slug, or "any" */
  scope: string;
  setScope: (scope: string) => void;
  /** true on a unit page, where the scope is pinned to that unit */
  scopeFixed: boolean;
  /** plain-language note shown when a scope change cleared the dates */
  notice: string | null;
  /** the StayPickerDialog, opened from the stay bar, header, cards and booking panels */
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  /** slug of the unit shown in the Inside band and held by the reserve form */
  selectedSlug: string;
  setSelected: (slug: string) => void;
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
  unitSlug,
  children,
}: {
  content: SiteContent;
  /** Pin the page to one unit (the unit page): its selection and date scope. */
  unitSlug?: string;
  children: ReactNode;
}) {
  const t = useUi();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [range, setRangeState] = useState<Range>({ start: null, end: null });
  const [scopeState, setScopeState] = useState("any");
  const [notice, setNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(
    () => unitSlug ?? content.units[0]?.slug ?? "",
  );

  const scope = unitSlug ?? scopeState;

  const setArrival = useCallback((t: number) => {
    setRangeState({ start: t, end: null });
    setNotice(null);
  }, []);

  const setLeave = useCallback(
    (t: number) => {
      const { start } = range;
      if (start === null || t <= start) return;
      if (freeUnits(content, scope, start, t).length === 0) return;
      setRangeState({ start, end: t });
    },
    [content, scope, range],
  );

  const clearDates = useCallback(() => {
    setRangeState({ start: null, end: null });
    setNotice(null);
  }, []);

  // Narrowing to one apartment can make the chosen dates impossible. Clear them
  // and say so, rather than leaving a range the calendar can't show.
  const setScope = useCallback(
    (next: string) => {
      if (unitSlug) return;
      setScopeState(next);
      if (next !== "any") setSelectedSlug(next);
      const { start, end } = range;
      const stillFree =
        start === null ||
        (end !== null
          ? freeUnits(content, next, start, end).length > 0
          : !blockedForScope(content, next)(start));
      if (stillFree) {
        setNotice(null);
        return;
      }
      const name = content.units.find((u) => u.slug === next)?.name ?? "that apartment";
      setRangeState({ start: null, end: null });
      setNotice(t.scopeCleared(name));
    },
    [content, range, unitSlug, t],
  );

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const value = useMemo<BookingState>(
    () => ({
      currency, setCurrency,
      start: range.start, end: range.end, setArrival, setLeave, clearDates,
      scope, setScope, scopeFixed: Boolean(unitSlug), notice,
      pickerOpen, openPicker, closePicker,
      selectedSlug, setSelected: setSelectedSlug,
    }),
    [currency, range, setArrival, setLeave, clearDates, scope, setScope, unitSlug, notice, pickerOpen, openPicker, closePicker, selectedSlug],
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
