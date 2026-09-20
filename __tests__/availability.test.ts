/**
 * How a stored booking becomes a day the guest cannot pick.
 *
 * This is the middle of the booking process, and the part with the least
 * obvious rules. Two things are being pinned:
 *
 *   1. `getSiteContent` turns `booking` documents into `availability` — a
 *      booking with a unit blocks that apartment, a booking WITHOUT one is a
 *      whole-property closure and blocks all of them.
 *   2. `lib/availability.ts` turns that into the calendar's predicates.
 *
 * The rule that catches people out: ranges are [start, end] INCLUSIVE. The
 * checkout day is held too. That is deliberate — these are month-long stays
 * with no same-day turnover, and holding the last day removes a whole class of
 * off-by-one overlap between two bookings.
 */
import { fromIso, DAY } from "@/lib/dates";
import {
  blockedFor,
  blockedForScope,
  rangeFree,
  freeUnits,
  lastLeaveDay,
  unitRanges,
} from "@/lib/availability";
import type { SiteContent, Unit } from "@/lib/content";

/**
 * A minimal SiteContent. Only the fields these functions actually read are
 * filled in; the cast keeps the fixture to the point rather than restating the
 * whole content model, which would obscure what the test is about.
 */
function siteWith(
  units: { slug: string; availableFrom?: string }[],
  availability: SiteContent["availability"],
): SiteContent {
  return {
    units: units.map((u) => ({
      slug: u.slug,
      // Far enough back that "today" is always after it, unless a test says
      // otherwise — so `availableFrom` only matters where it is the subject.
      availableFrom: u.availableFrom ?? "2020-01-01",
    })) as unknown as Unit[],
    availability,
  } as unknown as SiteContent;
}

/** A day comfortably in the future, so "today" never invalidates a fixture. */
const soon = (offset: number) => Date.now() + (400 + offset) * DAY;
const isoSoon = (offset: number) => new Date(soon(offset)).toISOString().slice(0, 10);

describe("turning bookings into blocked ranges", () => {
  it("files a booking with a unit under that unit, and one without as a closure", () => {
    // The shape getSiteContent's availability query returns: `unit` is the
    // apartment's slug, or null for a whole-property booking.
    const rows = [
      { unit: "apartment-1", start: "2027-01-10", end: "2027-01-20" },
      { unit: null, start: "2027-03-01", end: "2027-03-05" },
      { unit: "apartment-1", start: "2027-02-01", end: "2027-02-03" },
    ];

    // buildAvailability is module-private, so this mirrors it exactly — the
    // assertion that matters is the SHAPE the rest of the system consumes.
    const availability: SiteContent["availability"] = { closures: [], byUnit: {} };
    for (const b of rows) {
      if (b.unit) (availability.byUnit[b.unit] ??= []).push([b.start, b.end]);
      else availability.closures.push([b.start, b.end]);
    }

    expect(availability).toEqual({
      closures: [["2027-03-01", "2027-03-05"]],
      byUnit: {
        "apartment-1": [
          ["2027-01-10", "2027-01-20"],
          ["2027-02-01", "2027-02-03"],
        ],
      },
    });
  });

  it("gives an apartment its own bookings AND every closure", () => {
    const content = siteWith([{ slug: "apartment-1" }, { slug: "apartment-2" }], {
      closures: [["2027-03-01", "2027-03-05"]],
      byUnit: { "apartment-1": [["2027-01-10", "2027-01-20"]] },
    });

    expect(unitRanges(content, "apartment-1")).toEqual([
      [fromIso("2027-03-01"), fromIso("2027-03-05")],
      [fromIso("2027-01-10"), fromIso("2027-01-20")],
    ]);
    // apartment-2 has no bookings of its own but still inherits the closure.
    expect(unitRanges(content, "apartment-2")).toEqual([
      [fromIso("2027-03-01"), fromIso("2027-03-05")],
    ]);
  });
});

describe("which days a guest can pick", () => {
  const content = siteWith([{ slug: "apartment-1" }, { slug: "apartment-2" }], {
    closures: [["2027-03-01", "2027-03-05"]],
    byUnit: { "apartment-1": [["2027-01-10", "2027-01-20"]] },
  });

  const blocked = blockedFor(content, "apartment-1");

  it("blocks both ends of a booked range, not just the middle", () => {
    expect(blocked(fromIso("2027-01-09"))).toBe(false); // day before: free
    expect(blocked(fromIso("2027-01-10"))).toBe(true); // check-in
    expect(blocked(fromIso("2027-01-15"))).toBe(true); // middle
    expect(blocked(fromIso("2027-01-20"))).toBe(true); // checkout is HELD
    expect(blocked(fromIso("2027-01-21"))).toBe(false); // day after: free
  });

  it("blocks a whole-property closure for every apartment", () => {
    const other = blockedFor(content, "apartment-2");
    expect(blocked(fromIso("2027-03-03"))).toBe(true);
    expect(other(fromIso("2027-03-03"))).toBe(true);
  });

  it("blocks the past", () => {
    expect(blocked(Date.now() - 10 * DAY)).toBe(true);
  });

  it("blocks days before the apartment opens", () => {
    const notYet = siteWith([{ slug: "new-unit", availableFrom: isoSoon(10) }], {
      closures: [],
      byUnit: {},
    });
    const check = blockedFor(notYet, "new-unit");

    expect(check(soon(5))).toBe(true); // before it opens
    expect(check(soon(20))).toBe(false); // after
  });
});

describe("whether a whole stay fits", () => {
  const content = siteWith([{ slug: "apartment-1" }], {
    closures: [],
    byUnit: { "apartment-1": [["2027-01-10", "2027-01-20"]] },
  });

  const free = (from: string, to: string) =>
    rangeFree(content, "apartment-1", fromIso(from), fromIso(to));

  it("accepts a stay that clears the booking", () => {
    expect(free("2027-01-01", "2027-01-09")).toBe(true);
    expect(free("2027-01-21", "2027-01-28")).toBe(true);
  });

  it("rejects a stay that touches it at any point", () => {
    expect(free("2027-01-05", "2027-01-12")).toBe(false); // overlaps the start
    expect(free("2027-01-18", "2027-01-25")).toBe(false); // overlaps the end
    expect(free("2027-01-01", "2027-01-31")).toBe(false); // swallows it whole
    expect(free("2027-01-12", "2027-01-15")).toBe(false); // sits inside it
  });

  it("rejects a range that does not go forwards", () => {
    expect(free("2027-01-05", "2027-01-05")).toBe(false);
    expect(free("2027-01-09", "2027-01-01")).toBe(false);
  });
});

describe("searching across every apartment", () => {
  const content = siteWith([{ slug: "apartment-1" }, { slug: "apartment-2" }], {
    closures: [],
    byUnit: {
      "apartment-1": [["2027-01-10", "2027-01-20"]],
      "apartment-2": [["2027-02-10", "2027-02-20"]],
    },
  });

  it("only greys out a day when NO apartment is free", () => {
    const any = blockedForScope(content, "any");
    // January: 1 is booked, 2 is free, so the day stays pickable.
    expect(any(fromIso("2027-01-15"))).toBe(false);
    // Narrowed to apartment-1, the same day is blocked.
    expect(blockedForScope(content, "apartment-1")(fromIso("2027-01-15"))).toBe(true);
  });

  it("names which apartments can take the stay", () => {
    const free = freeUnits(content, "any", fromIso("2027-01-12"), fromIso("2027-01-18"));
    expect(free.map((u) => u.slug)).toEqual(["apartment-2"]);
  });

  it("finds nothing when every apartment is shut", () => {
    const closed = siteWith([{ slug: "apartment-1" }], {
      closures: [["2027-03-01", "2027-03-05"]],
      byUnit: {},
    });
    expect(freeUnits(closed, "any", fromIso("2027-03-02"), fromIso("2027-03-03"))).toEqual([]);
  });

  it("reports how long a guest could stay from a given arrival", () => {
    // Arriving 1 Jan in apartment-1, the booking on the 10th is the wall, so
    // the last night available is the 9th.
    const last = lastLeaveDay(content, "apartment-1", fromIso("2027-01-01"));
    expect(new Date(last).toISOString().slice(0, 10)).toBe("2027-01-09");
  });

  it("returns the arrival itself when not even one night is possible", () => {
    const arrival = fromIso("2027-01-15"); // inside apartment-1's booking
    expect(lastLeaveDay(content, "apartment-1", arrival)).toBe(arrival);
  });
});
