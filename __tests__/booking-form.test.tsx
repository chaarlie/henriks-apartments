/**
 * @jest-environment jsdom
 */

/**
 * The booking form as a guest meets it.
 *
 * The server side is pinned in booking-hold.test.ts; this is the other end —
 * what the guest sees, what the form refuses to send, and what it does with the
 * answer. Three behaviours matter most:
 *
 *   - it cannot be submitted without dates. The guard is the submit button's
 *     disabled state, and its LABEL carries the reason ("Pick dates to hold"),
 *     so the guest is told what is missing before they try rather than after
 *   - the estimate on screen is the estimate for the apartment and dates chosen,
 *     and it updates when either changes
 *   - an apartment already booked for those dates is called out, with the ones
 *     that are free offered as alternatives
 *
 * `requestHold` is mocked throughout: this suite is about the form, and the
 * action has its own tests. Mocking it also means no test can reach Sanity.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions/booking", () => ({ requestHold: jest.fn() }));
jest.mock("next/navigation", () => ({
  // useUi/useLocale read the language out of the path; "/" means English.
  usePathname: () => "/",
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

import { requestHold } from "@/lib/actions/booking";
import { BookingProvider, useBooking } from "@/lib/booking";
import BookingForm from "@/app/components/landing/BookingForm";
import { makeContent, makeUnit, futureTs } from "./helpers/content-fixture";
import { iso } from "@/lib/dates";
import type { SiteContent } from "@/lib/content";

const hold = requestHold as jest.Mock;

const ARRIVE = futureTs(30);
const LEAVE = futureTs(40); // a 10-night stay → billed nightly

/**
 * Render the form inside the real BookingProvider, then drive the provider's
 * date state the way the calendar would. The provider is deliberately NOT
 * mocked — the form's behaviour is mostly a function of that state, and a fake
 * one would let the two drift apart.
 */
async function renderForm(content: SiteContent = makeContent(), opts: { unitSlug?: string } = {}) {
  const user = userEvent.setup();
  render(
    <BookingProvider content={content} unitSlug={opts.unitSlug}>
      <BookingForm />
      <DateDriver />
    </BookingProvider>,
  );
  return { user };
}

/**
 * A test-only control that reaches into the provider to set dates, standing in
 * for the calendar dialog. Keeping it here rather than driving the real picker
 * keeps these tests about the FORM; the picker is its own component.
 *
 * TWO buttons, clicked separately, because that is how the real calendar works:
 * `setLeave` reads `start` from the render it was created in, so an arrival and
 * a departure set in the same handler would see `start: null` and the departure
 * would be dropped. A guest clicks two days, with a re-render between them.
 */
function DateDriver() {
  const { setArrival, setLeave } = useBooking();
  return (
    <>
      <button type="button" data-testid="pick-arrival" onClick={() => setArrival(ARRIVE)} />
      <button type="button" data-testid="pick-leave" onClick={() => setLeave(LEAVE)} />
    </>
  );
}

async function pickDates(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("pick-arrival"));
  await user.click(screen.getByTestId("pick-leave"));
}

beforeEach(() => hold.mockResolvedValue({ ok: true, id: "booking.new" }));

describe("before any dates are chosen", () => {
  it("quotes a month so the price is never a mystery", async () => {
    await renderForm();

    expect(screen.getByText("Estimate for one month")).toBeInTheDocument();
    // $1,000 rent + $50 power.
    expect(within(totalPanel()).getByText("$1,050")).toBeInTheDocument();
  });

  it("cannot be submitted, and the button says what is missing", async () => {
    const { user } = await renderForm();

    // The guard is the disabled attribute, not an error message: the label
    // itself tells the guest what to do, so there is nothing to submit and be
    // told off about.
    const submit = screen.getByRole("button", { name: /Pick dates to hold/i });
    expect(submit).toBeDisabled();

    await user.click(submit);
    expect(hold).not.toHaveBeenCalled();
  });
});

/** The total panel, which repeats a figure the rent line may also show. */
const totalPanel = () => screen.getByText("Estimated total").parentElement as HTMLElement;

describe("with dates chosen", () => {
  it("prices the actual stay", async () => {
    const { user } = await renderForm();
    await pickDates(user);

    expect(screen.getByText(/Estimate for 10 nights/i)).toBeInTheDocument();
    // 10 × $100, billed nightly — no metered power on a short stay. Asserted on
    // the total panel, because the rent line shows the same figure.
    expect(within(totalPanel()).getByText("$1,000")).toBeInTheDocument();
  });

  it("sends exactly what the guest typed, as ISO dates", async () => {
    const { user } = await renderForm();
    await pickDates(user);

    await user.type(screen.getByLabelText("Your name"), "Ada Lovelace");
    await user.type(screen.getByLabelText(/WhatsApp/i), "+1 809 555 0142");
    await user.type(screen.getByLabelText(/Anything/i), "Arriving late");
    await user.click(screen.getByRole("button", { name: /Request to hold the 101/i }));

    expect(hold).toHaveBeenCalledWith({
      locale: "en",
      unitSlug: "apartment-1",
      start: iso(ARRIVE),
      end: iso(LEAVE),
      guest: { name: "Ada Lovelace", phone: "+1 809 555 0142", email: "" },
      note: "Arriving late",
    });
  });

  it("confirms the hold instead of leaving the form open", async () => {
    const { user } = await renderForm();
    await pickDates(user);
    await user.type(screen.getByLabelText("Your name"), "Ada");
    await user.type(screen.getByLabelText(/WhatsApp/i), "+1809");
    await user.click(screen.getByRole("button", { name: /Request to hold the 101/i }));

    expect(await screen.findByText("Dates held")).toBeInTheDocument();
    // The form is replaced, so the same hold cannot be sent twice by accident.
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
  });

  it("shows the server's rejection and keeps what was typed", async () => {
    hold.mockResolvedValue({ ok: false, error: "Sorry — those dates were just taken. Try a different range." });
    const { user } = await renderForm();
    await pickDates(user);
    await user.type(screen.getByLabelText("Your name"), "Ada");
    await user.type(screen.getByLabelText(/WhatsApp/i), "+1809");
    await user.click(screen.getByRole("button", { name: /Request to hold the 101/i }));

    expect(await screen.findByText(/those dates were just taken/i)).toBeInTheDocument();
    // Still editable, still filled in — a rejected hold must not cost the guest
    // their typing.
    expect(screen.getByLabelText("Your name")).toHaveValue("Ada");
  });
});

describe("when the chosen apartment is already booked", () => {
  /** 101 is taken for the dates the driver picks; 102 is free. */
  const content = makeContent({
    units: [
      makeUnit(),
      makeUnit({ _id: "unit-102", slug: "apartment-2", name: "102", priceUsd: 1200 }),
    ],
    availability: {
      closures: [],
      byUnit: { "apartment-1": [[iso(ARRIVE), iso(LEAVE)]] },
    },
  });

  it("says so, and offers the apartments that are free", async () => {
    const { user } = await renderForm(content);
    await pickDates(user);

    const notice = screen.getByRole("status");
    expect(within(notice).getByText(/101 is booked/i)).toBeInTheDocument();
    expect(within(notice).getByRole("button", { name: /102/ })).toBeInTheDocument();
  });

  it("switches to a free apartment and re-prices", async () => {
    const { user } = await renderForm(content);
    await pickDates(user);

    await user.click(within(screen.getByRole("status")).getByRole("button", { name: /102/ }));

    // The notice is gone and the button now offers to hold 102.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request to hold the 102/i })).toBeInTheDocument();
  });

  it("marks the booked apartment in the chooser rather than hiding it", async () => {
    const { user } = await renderForm(content);
    await pickDates(user);

    const chooser = screen.getByRole("group", { name: /apartment/i });
    expect(within(chooser).getByText("Booked for your dates")).toBeInTheDocument();
  });
});

describe("on an apartment's own page", () => {
  it("skips the apartment chooser, because the page already is one", async () => {
    await renderForm(
      makeContent({
        units: [makeUnit(), makeUnit({ slug: "apartment-2", name: "102" })],
      }),
      { unitSlug: "apartment-2" },
    );

    expect(screen.queryByRole("group", { name: /apartment/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pick dates to hold/i })).toBeInTheDocument();
  });
});
