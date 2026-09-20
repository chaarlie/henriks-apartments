/**
 * The number the guest sees before they hold anything.
 *
 * One apartment bills two completely different ways depending on how long the
 * stay is, and the switch is `MONTHLY_FROM_NIGHTS` (28):
 *
 *   under 28 nights → a holiday let. Nightly rate × nights, utilities included.
 *   28 nights or more → a tenancy. Whole months of rent, PLUS metered
 *                       electricity, LESS any long-stay discount.
 *
 * Months are derived from nights at 30.4/month and always rounded UP, so a stay
 * that runs a day into a third month is billed as three. Deposits come from the
 * apartment's own tier table.
 *
 * Nothing here is mocked — it is all arithmetic over plain data. The fixtures
 * use round numbers so a wrong total is readable at a glance.
 */
import { computeEstimate, depositFor, billingLabel, MONTHLY_FROM_NIGHTS, fromIso } from "@/lib/dates";
import { display } from "@/lib/money";
import type { SiteContent, Unit } from "@/lib/content";

const unit = (over: Partial<Unit> = {}): Unit =>
  ({
    slug: "apartment-1",
    priceUsd: 1000, // per month
    priceNightlyUsd: 100, // per night
    deposits: [],
    ...over,
  }) as unknown as Unit;

const site = (over: Partial<SiteContent> = {}): SiteContent =>
  ({
    fxRate: 60,
    power: { baseUsd: 50 },
    discounts: [],
    ...over,
  }) as unknown as SiteContent;

/** `nightsLater("2027-01-01", 10)` → the range for a 10-night stay. */
const stay = (from: string, nights: number): [number, number] => [
  fromIso(from),
  fromIso(from) + nights * 86_400_000,
];

describe("short stays bill by the night", () => {
  it("multiplies the nightly rate by the nights", () => {
    const [start, end] = stay("2027-01-01", 10);
    const e = computeEstimate(unit(), start, end, "USD", site());

    expect(e.mode).toBe("nightly");
    expect(e.nights).toBe(10);
    expect(e.total).toBe(1000); // 10 × $100
    expect(e.totalDisplay).toBe("$1,000");
  });

  it("charges no metered power — utilities are in the rate", () => {
    const [start, end] = stay("2027-01-01", 10);
    const e = computeEstimate(unit(), start, end, "USD", site({ power: { baseUsd: 500 } }));

    expect(e.total).toBe(1000); // unchanged by the power rate
    expect(e.lines.map((l) => l.key)).toEqual(["rent", "utilities"]);
  });

  it("ignores a long-stay discount", () => {
    const [start, end] = stay("2027-01-01", 10);
    const e = computeEstimate(
      unit(),
      start,
      end,
      "USD",
      site({ discounts: [{ months: 1, pct: 0.5 }] }),
    );

    expect(e.total).toBe(1000);
    expect(e.lines.some((l) => l.key === "discount")).toBe(false);
  });
});

describe("long stays bill by the month", () => {
  it("switches over at 28 nights, not before", () => {
    const shortStay = computeEstimate(unit(), ...stay("2027-01-01", MONTHLY_FROM_NIGHTS - 1), "USD", site());
    const longStay = computeEstimate(unit(), ...stay("2027-01-01", MONTHLY_FROM_NIGHTS), "USD", site());

    expect(shortStay.mode).toBe("nightly");
    expect(longStay.mode).toBe("monthly");
    // The jump is real and worth seeing: 27 nights at $100 is $2,700, while 28
    // nights is one month's rent plus power.
    expect(shortStay.total).toBe(2700);
    expect(longStay.total).toBe(1050); // $1,000 rent + $50 power
  });

  it("rounds part-months up", () => {
    // 31 nights is 1.02 months — billed as two.
    const e = computeEstimate(unit(), ...stay("2027-01-01", 31), "USD", site());

    expect(e.months).toBe(2);
    expect(e.total).toBe(2100); // 2 × ($1,000 + $50)
  });

  it("adds metered electricity per month", () => {
    const e = computeEstimate(unit(), ...stay("2027-01-01", 61), "USD", site());

    expect(e.months).toBe(3); // 61 / 30.4 = 2.006…, rounded up
    const power = e.lines.find((l) => l.key === "power");
    expect(power?.value).toBe(display(50 * e.months, "USD", 60));
  });

  it("takes the biggest discount the stay qualifies for", () => {
    const e = computeEstimate(
      unit(),
      ...stay("2027-01-01", 200), // ~7 months
      "USD",
      site({
        discounts: [
          { months: 3, pct: 0.05 },
          { months: 6, pct: 0.1 }, // this one
          { months: 12, pct: 0.2 }, // not reached
        ],
      }),
    );

    const discount = e.lines.find((l) => l.key === "discount");
    expect(discount).toBeDefined();
    // 10% of the rent, shown as a deduction.
    expect(discount?.value).toBe(`− ${display(Math.round(1000 * e.months * 0.1), "USD", 60)}`);
    expect(e.total).toBe(1000 * e.months + 50 * e.months - Math.round(1000 * e.months * 0.1));
  });

  it("applies no discount when the stay is too short to qualify", () => {
    const e = computeEstimate(
      unit(),
      ...stay("2027-01-01", 31), // 2 months
      "USD",
      site({ discounts: [{ months: 6, pct: 0.1 }] }),
    );

    expect(e.lines.some((l) => l.key === "discount")).toBe(false);
    expect(e.total).toBe(2100);
  });

  it("quotes a month when no dates are chosen yet", () => {
    const e = computeEstimate(unit(), null, null, "USD", site());

    expect(e.nights).toBe(0);
    expect(e.months).toBe(1);
    expect(e.mode).toBe("monthly");
    expect(e.total).toBe(1050);
  });
});

describe("the deposit", () => {
  const tiered = unit({
    deposits: [
      { fromMonths: 0, amountUsd: 200 }, // short stays
      { fromMonths: 6, amountUsd: 1000 }, // half a year or more
    ],
  });

  it("picks the highest tier the stay reaches", () => {
    expect(depositFor(tiered, 0)).toBe(200);
    expect(depositFor(tiered, 5)).toBe(200);
    expect(depositFor(tiered, 6)).toBe(1000);
    expect(depositFor(tiered, 24)).toBe(1000);
  });

  it("is zero when the apartment has no tiers", () => {
    expect(depositFor(unit({ deposits: [] }), 12)).toBe(0);
    expect(depositFor(unit({ deposits: undefined }), 12)).toBe(0);
  });

  it("never goes negative, whatever the data says", () => {
    expect(depositFor(unit({ deposits: [{ fromMonths: 0, amountUsd: -500 }] }), 1)).toBe(0);
  });

  it("is added to the total and shown as its own line", () => {
    const e = computeEstimate(tiered, ...stay("2027-01-01", 10), "USD", site());

    expect(e.total).toBe(1000 + 200);
    expect(e.lines.find((l) => l.key === "deposit")?.value).toBe("$200");
  });

  it("is left off entirely when it is zero", () => {
    const e = computeEstimate(unit(), ...stay("2027-01-01", 10), "USD", site());
    expect(e.lines.some((l) => l.key === "deposit")).toBe(false);
  });
});

describe("showing the price in pesos", () => {
  it("converts at the configured rate and keeps USD as the source of truth", () => {
    const [start, end] = stay("2027-01-01", 10);
    const usd = computeEstimate(unit(), start, end, "USD", site({ fxRate: 60 }));
    const dop = computeEstimate(unit(), start, end, "DOP", site({ fxRate: 60 }));

    // The stored total never changes — only how it is displayed.
    expect(usd.total).toBe(1000);
    expect(dop.total).toBe(1000);
    expect(usd.totalDisplay).toBe("$1,000");
    expect(dop.totalDisplay).toBe("RD$60,000");
  });

  it("formats with thousands separators", () => {
    expect(display(1234567, "USD", 60)).toBe("$1,234,567");
    expect(display(0, "USD", 60)).toBe("$0");
    expect(display(99.6, "USD", 60)).toBe("$100"); // rounded, never fractional cents
  });
});

describe("the wording under the dates", () => {
  it("says nightly below the threshold and months above it", () => {
    expect(billingLabel(1)).toBe("billed nightly");
    expect(billingLabel(MONTHLY_FROM_NIGHTS - 1)).toBe("billed nightly");
    expect(billingLabel(MONTHLY_FROM_NIGHTS)).toContain("1");
    expect(billingLabel(200)).toContain("7");
  });
});
