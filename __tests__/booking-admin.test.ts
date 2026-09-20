/**
 * The other half of the booking process: what Henrik does in /admin.
 *
 * A guest's hold arrives as `status: "held"`. Henrik then confirms it, edits the
 * dates, cancels it, or enters a booking that never came through the site at all
 * (someone who phoned). Those are `saveBooking` and `deleteBooking`.
 *
 * Two things separate this path from the public one, and both are pinned below:
 *
 *   - every action is behind `requireAdmin()`, which THROWS rather than
 *     returning a flag, so a missing session must surface as a failed result and
 *     never as a write;
 *   - there is no availability check. Henrik is allowed to double-book, because
 *     he is the one who knows that the guest in 101 is leaving early. The guest
 *     form is the thing that must not.
 */
import { createSanityDouble, type SanityDouble } from "./helpers/sanity-double";

jest.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: jest.fn() }));
jest.mock("@/lib/admin/session", () => ({ requireAdmin: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getWriteClient } from "@/sanity/lib/writeClient";
import { requireAdmin } from "@/lib/admin/session";
import { revalidatePath } from "next/cache";
import { saveBooking, deleteBooking } from "@/lib/admin/actions";
import type { AdminBookingInput } from "@/lib/admin/types";

/**
 * Stub: a signed-in admin. `requireAdmin` resolves with an identity and the
 * action proceeds. Nothing asserts on it — it exists to open the door.
 */
function signedIn() {
  (requireAdmin as jest.Mock).mockResolvedValue({ username: "henrik" });
}

/** Stub: no session. The real one throws, so the double must throw too. */
function signedOut() {
  (requireAdmin as jest.Mock).mockRejectedValue(new Error("Not authorised"));
}

function useSanity(): SanityDouble {
  const double = createSanityDouble();
  (getWriteClient as jest.Mock).mockReturnValue(double);
  return double;
}

const booking = (over: Partial<AdminBookingInput> = {}): AdminBookingInput => ({
  _id: null,
  unitId: "unit-101",
  start: "2027-01-10",
  end: "2027-01-20",
  status: "held",
  guest: { name: "Ada Lovelace", phone: "+1 809 555 0142", email: "" },
  note: "",
  ...over,
});

describe("Henrik managing a booking", () => {
  beforeEach(signedIn);

  it("creates a booking that never came through the website", async () => {
    const sanity = useSanity();

    const result = await saveBooking(booking({ status: "confirmed" }));

    expect(result).toEqual({ ok: true, id: expect.stringMatching(/^booking\./) });
    expect(sanity.createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "booking",
        unit: { _type: "reference", _ref: "unit-101" },
        startDate: "2027-01-10",
        endDate: "2027-01-20",
        status: "confirmed",
        // How the site later tells a phone booking from a web hold.
        source: "manual",
      }),
    );
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("confirms an existing hold in place instead of duplicating it", async () => {
    const sanity = useSanity();

    const result = await saveBooking(
      booking({ _id: "booking.abc-123", status: "confirmed" }),
    );

    expect(result).toEqual({ ok: true, id: "booking.abc-123" });
    // createOrReplace on the SAME id. A `create` here would leave the original
    // hold in place and block the dates twice.
    expect(sanity.createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "booking.abc-123", status: "confirmed" }),
    );
  });

  it("blocks the whole property when no apartment is chosen", async () => {
    const sanity = useSanity();

    await saveBooking(booking({ unitId: null, note: "Building works" }));

    // No `unit` key at all — which is what `!defined(unit)` keys off in the
    // availability query, making it close every apartment at once.
    const [doc] = sanity.createOrReplace.mock.calls[0];
    expect(doc).not.toHaveProperty("unit");
    expect(doc).toMatchObject({ note: "Building works" });
  });

  it("stores empty guest details as absent rather than blank", async () => {
    const sanity = useSanity();

    await saveBooking(booking({ guest: { name: "Ada", phone: "", email: "" }, note: "" }));

    expect(sanity.createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        guest: { name: "Ada", phone: undefined, email: undefined },
        note: undefined,
      }),
    );
  });

  it("deletes a booking and frees its dates", async () => {
    const sanity = useSanity();

    expect(await deleteBooking("booking.abc-123")).toEqual({ ok: true });
    expect(sanity.delete).toHaveBeenCalledWith("booking.abc-123");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("reports a failed write instead of throwing at the form", async () => {
    const sanity = useSanity();
    sanity.createOrReplace.mockRejectedValueOnce(new Error("Insufficient permissions"));

    // Unlike the guest form, the admin DOES see the real message — Henrik can
    // act on "Insufficient permissions"; a guest could not.
    expect(await saveBooking(booking())).toEqual({
      ok: false,
      error: "Insufficient permissions",
    });
  });

  describe("dates it refuses", () => {
    it.each([
      ["no dates", { start: "", end: "" }, "Pick both dates."],
      ["checkout before check-in", { start: "2027-01-20", end: "2027-01-10" }, "Check-out must be after check-in."],
      ["a zero-night stay", { start: "2027-01-10", end: "2027-01-10" }, "Check-out must be after check-in."],
    ])("rejects %s without writing", async (_label, over, error) => {
      const sanity = useSanity();
      expect(await saveBooking(booking(over))).toEqual({ ok: false, error });
      expect(sanity.createOrReplace).not.toHaveBeenCalled();
    });
  });
});

describe("when nobody is signed in", () => {
  beforeEach(signedOut);

  it("will not save a booking", async () => {
    const sanity = useSanity();

    expect(await saveBooking(booking())).toEqual({ ok: false, error: "Not authorised" });
    expect(sanity.createOrReplace).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("will not delete one", async () => {
    const sanity = useSanity();

    expect(await deleteBooking("booking.abc-123")).toEqual({
      ok: false,
      error: "Not authorised",
    });
    expect(sanity.delete).not.toHaveBeenCalled();
  });
});
