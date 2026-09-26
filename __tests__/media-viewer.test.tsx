/**
 * @jest-environment jsdom
 */

/**
 * The apartment media panel: one toggle between the 360° walkthrough and the
 * photo gallery.
 *
 * The rule worth pinning is which one opens FIRST. The tour is the only thing
 * this site has that a listing site does not, so it wins whenever the apartment
 * has one — and an apartment with no tour must fall back to photos rather than
 * showing an empty panel or a dead toggle.
 *
 * `Tour` is mocked: it mounts photo-sphere-viewer, which wants WebGL and a real
 * canvas, and none of that says anything about the toggle. The mock stands in
 * as a marker that the tour panel is the one on screen.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));
/*
  A plain <img> for next/image.

  The app uses a CUSTOM loader (next.config.ts → lib/sanity-image-loader.ts) so
  Sanity's CDN does the resizing. Jest does not run that pipeline, so the real
  component throws `Image is missing "loader" prop` on render. Nothing here
  asserts on optimisation — only which photo shows and how it is labelled — so
  src and alt pass through and the sizing props are dropped.

  Inlined rather than imported: jest.mock factories are hoisted above the
  imports, so they cannot reference one.
*/
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt} />
  ),
}));
jest.mock("@/app/components/tour/Tour", () => ({
  __esModule: true,
  default: ({ nodes }: { nodes: { _id: string }[] }) => (
    <div data-testid="tour">{nodes.length} stops</div>
  ),
}));

import MediaViewer from "@/app/components/unit/MediaViewer";
import { makeUnit } from "./helpers/content-fixture";
import type { ImageRef, TourNode } from "@/lib/content";

const photo = (n: number): ImageRef => ({
  url: `/photo-${n}.jpg`,
  alt: `Photo ${n} of the apartment`,
  width: 1600,
  height: 1067,
});

const stop = (id: string): TourNode =>
  ({ _id: id, _type: "tourNode", name: id, caption: "", panorama: `${id}.jpg`, links: [] }) as TourNode;

const withTour = () =>
  makeUnit({ gallery: [photo(1), photo(2), photo(3)], tour: [stop("living"), stop("kitchen")] });

const toggle = () => screen.getByRole("group", { name: "View" });

describe("an apartment with a 360° tour", () => {
  /*
    Opens on the PHOTOS, even though the tour exists. Someone who clicked into an
    apartment wants to see the apartment, and a panorama has to be operated before
    it shows anything. It is also what makes the hero image's `priority` count —
    the gallery branch is unmounted on first paint when the tour leads.
  */
  it("opens on the photos, not the tour", () => {
    render(<MediaViewer unit={withTour()} />);

    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
    expect(within(toggle()).getByRole("button", { name: /Photos/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();
  });

  it("offers the photos before the tour in the toggle", () => {
    render(<MediaViewer unit={withTour()} />);

    const labels = within(toggle())
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(labels).toEqual(["Photos · 3", "360° tour"]);
  });

  it("switches to the tour and back", async () => {
    const user = userEvent.setup();
    render(<MediaViewer unit={withTour()} />);

    await user.click(within(toggle()).getByRole("button", { name: "360° tour" }));

    expect(screen.getByTestId("tour")).toBeInTheDocument();
    expect(screen.getByText("Drag to look around")).toBeInTheDocument();

    await user.click(within(toggle()).getByRole("button", { name: /Photos/ }));
    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();
  });

  it("counts the photos on the toggle so the guest knows what is there", () => {
    render(<MediaViewer unit={withTour()} />);
    expect(within(toggle()).getByRole("button", { name: "Photos · 3" })).toBeInTheDocument();
  });
});

describe("an apartment with no tour", () => {
  const noTour = () => makeUnit({ gallery: [photo(1), photo(2)], tour: [] });

  it("opens on the photos instead of an empty panel", () => {
    render(<MediaViewer unit={noTour()} />);

    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();
  });

  it("offers no tour button at all, rather than a dead one", () => {
    render(<MediaViewer unit={noTour()} />);
    expect(within(toggle()).queryByRole("button", { name: "360° tour" })).not.toBeInTheDocument();
  });
});

describe("the photo strip", () => {
  it("changes the main photo when a thumbnail is chosen", async () => {
    const user = userEvent.setup();
    render(<MediaViewer unit={makeUnit({ gallery: [photo(1), photo(2), photo(3)], tour: [] })} />);

    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();

    // Thumbnails are labelled by their alt text.
    await user.click(screen.getByRole("button", { name: "Photo 3 of the apartment" }));

    expect(screen.getByText("Photo 3 of 3")).toBeInTheDocument();
  });

  it("falls back to the cover photo when the gallery is empty", () => {
    const u = makeUnit({ gallery: [], tour: [] });
    render(<MediaViewer unit={u} />);

    // One photo — the card cover — rather than a panel with nothing in it.
    expect(screen.getByText("Photo 1 of 1")).toBeInTheDocument();
  });
});
