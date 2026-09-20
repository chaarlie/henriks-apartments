/**
 * The public booking path, end to end.
 *
 * A guest picks an apartment and a date range on the site and submits the hold
 * form. `requestHold` is the whole of what happens next:
 *
 *   1. validate the form — a name, some way to reach them, a sane date range
 *   2. resolve the slug to a real, non-hidden apartment
 *   3. re-check availability AGAINST LIVE DATA, because the calendar the guest
 *      was looking at may be seconds out of date
 *   4. create a `booking` document with status "held"
 *   5. revalidate the site so those days show as taken straight away
 *
 * Henrik then confirms out of band over WhatsApp; nothing here charges anyone
 * or sends anything. A "held" booking is a soft lock on some dates.
 *
 * Read top to bottom, these cases are the specification for that.
 */
import { createSanityDouble, type SanityDouble } from "./helpers/sanity-double";

// Both modules are replaced before the action is imported. revalidatePath would
// otherwise need a running Next server; the write client would need a network
// and a production token.
jest.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getWriteClient } from "@/sanity/lib/writeClient";
import { revalidatePath } from "next/cache";
import { requestHold, type HoldInput } from "@/lib/actions/booking";

/** The two GROQ queries requestHold runs, identified by a stable fragment. */
const UNIT_LOOKUP = '_type == "unit"';
const CLASH_COUNT = "count(*[_type == \"booking\"";

/** A date far enough ahead that it is never "in the past" as the suite ages. */
const futureDay = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

const validInput = (over: Partial<HoldInput> = {}): HoldInput => ({
  unitSlug: "apartment-1",
  start: futureDay(30),
  end: futureDay(60),
  guest: { name: "Ada Lovelace", phone: "+1 809 555 0142" },
  ...over,
});

/** Wire a double in as the write client for one test. */
function useSanity(double: SanityDouble) {
  (getWriteClient as jest.Mock).mockReturnValue(double);
  return double;
}

/** The happy-path stubs: the apartment exists, and nothing clashes. */
const unitFoundAndFree = () =>
  createSanityDouble([
    { match: UNIT_LOOKUP, result: { _id: "unit-101" } },
    { match: CLASH_COUNT, result: 0 },
  ]);

describe("a guest holding dates", () => {
  it("creates a held booking and blocks the dates immediately", async () => {
    const sanity = useSanity(unitFoundAndFree());

    const result = await requestHold(validInput({ note: "Arriving late" }));

    expect(result).toEqual({ ok: true, id: expect.stringMatching(/^booking\./) });

    // The document Henrik will see in /admin.
    expect(sanity.create).toHaveBeenCalledTimes(1);
    expect(sanity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "booking",
        unit: { _type: "reference", _ref: "unit-101" },
        startDate: validInput().start,
        endDate: validInput().end,
        // "held", never "confirmed" — the guest cannot confirm their own stay.
        status: "held",
        source: "web",
        note: "Arriving late",
        guest: { name: "Ada Lovelace", phone: "+1 809 555 0142", email: undefined },
      }),
    );

    // Without this the calendar keeps serving the cached page and the days it
    // just sold still look free.
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuses dates another booking already covers", async () => {
    const sanity = useSanity(
      createSanityDouble([
        { match: UNIT_LOOKUP, result: { _id: "unit-101" } },
        { match: CLASH_COUNT, result: 1 },
      ]),
    );

    const result = await requestHold(validInput());

    expect(result).toEqual({ ok: false, error: "Sorry — those dates were just taken. Try a different range." });
    // The point of the check: nothing was written.
    expect(sanity.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("asks Sanity about the overlap rather than trusting the browser", async () => {
    const sanity = useSanity(unitFoundAndFree());
    await requestHold(validInput({ start: "2030-03-01", end: "2030-03-10" }));

    const [groq, params] = sanity.fetch.mock.calls.find(([q]: [string]) =>
      q.includes(CLASH_COUNT),
    )!;

    // Inclusive-overlap test: start <= otherEnd && end >= otherStart.
    expect(groq).toContain("startDate <= $end && endDate >= $start");
    // A whole-property closure has no unit reference and must block every
    // apartment, which is what `!defined(unit)` is doing here.
    expect(groq).toContain("!defined(unit)");
    // Only live holds count; a cancelled booking must not block anything.
    expect(groq).toContain('status in ["held", "confirmed"]');
    expect(params).toEqual({ uid: "unit-101", start: "2030-03-01", end: "2030-03-10" });
  });

  it("will not hold an apartment that is hidden or gone", async () => {
    const sanity = useSanity(
      createSanityDouble([{ match: UNIT_LOOKUP, result: null }]),
    );

    const result = await requestHold(validInput({ unitSlug: "no-such-apartment" }));

    expect(result).toEqual({ ok: false, error: "That apartment isn't available." });
    expect(sanity.create).not.toHaveBeenCalled();
  });

  it("hides infrastructure failures behind a message a guest can act on", async () => {
    const sanity = useSanity(unitFoundAndFree());
    sanity.create.mockRejectedValueOnce(new Error("ECONNRESET talking to Sanity"));

    const result = await requestHold(validInput());

    // Never the raw error: it would leak internals into the form, and there is
    // nothing the guest could do with it.
    expect(result).toEqual({ ok: false, error: "Could not hold those dates." });
  });

  it("answers in the guest's own language", async () => {
    useSanity(createSanityDouble([{ match: UNIT_LOOKUP, result: null }]));

    const result = await requestHold(validInput({ locale: "es" }));

    expect(result).toEqual({ ok: false, error: "Ese apartamento no está disponible." });
  });
});

describe("what the form will not accept", () => {
  /*
    Each of these is rejected BEFORE Sanity is touched at all, which is the
    behaviour being pinned: a malformed request must not cost a round trip, and
    must never half-write a booking.
  */
  const rejections: [string, Partial<HoldInput>, string][] = [
    ["no name", { guest: { name: "   " } }, "Please add your name."],
    [
      "no way to reach them",
      { guest: { name: "Ada" } },
      "Add a WhatsApp number or email so Henrik can reach you.",
    ],
    ["no dates at all", { start: "", end: "" }, "Pick your dates"],
    [
      "check-out before check-in",
      { start: futureDay(60), end: futureDay(30) },
      "Check-out must be after check-in.",
    ],
    [
      "a same-day checkout",
      { start: futureDay(30), end: futureDay(30) },
      "Check-out must be after check-in.",
    ],
    ["a check-in already past", { start: futureDay(-1), end: futureDay(30) }, "That check-in date is in the past."],
  ];

  it.each(rejections)("rejects %s", async (_label, over, error) => {
    const sanity = useSanity(createSanityDouble());

    expect(await requestHold(validInput(over))).toEqual({ ok: false, error });

    expect(sanity.fetch).not.toHaveBeenCalled();
    expect(sanity.create).not.toHaveBeenCalled();
  });

  it("accepts an email instead of a phone", async () => {
    const sanity = useSanity(unitFoundAndFree());

    const result = await requestHold(
      validInput({ guest: { name: "Ada", email: "ada@example.com" } }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(sanity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        guest: { name: "Ada", phone: undefined, email: "ada@example.com" },
      }),
    );
  });

  it("trims what the guest typed and drops an empty note", async () => {
    const sanity = useSanity(unitFoundAndFree());

    await requestHold(
      validInput({ guest: { name: "  Ada  ", phone: "  +1809  " }, note: "   " }),
    );

    expect(sanity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        guest: expect.objectContaining({ name: "Ada", phone: "+1809" }),
        // undefined, not "" — an empty string would store a blank note.
        note: undefined,
      }),
    );
  });
});
