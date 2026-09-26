/**
 * @jest-environment jsdom
 */

/**
 * The shared-areas mosaic, and specifically what its category filter does to the
 * tiles it hides.
 *
 * The bug this pins: filtered-out tiles were dimmed with `pointer-events-none`,
 * which stops a mouse and nothing else. They stayed in the tab order and still
 * opened the full-screen viewer on Enter, while announcing their ordinary label
 * with no hint they had been filtered — so the keyboard and screen-reader paths
 * ignored a filter the mouse obeyed. A CSS property was doing a job only the
 * `disabled` attribute can do.
 *
 * The second rule here is the image rendition. The hero tile spans two columns
 * and two rows but asked the CDN for a one-column image, so the biggest photo in
 * the band arrived at about half the resolution it was shown at. Shape and
 * `sizes` come from one function now, and these tests are what stops them being
 * separated again.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));
/* A plain <img>: the app's next/image uses a custom Sanity loader Jest does not
   run, and `sizes` has to survive into the DOM for the rendition test below. */
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, sizes }: { src: string; alt: string; sizes?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt} data-sizes={sizes} />
  ),
}));
/* framer-motion's whileInView needs an IntersectionObserver; the entrance
   animation says nothing about filtering. */
jest.mock("framer-motion", () => {
  // Animation props would land on the DOM node and warn; drop them by name
  // rather than destructuring them into unused bindings.
  const ANIMATION_PROPS = ["initial", "whileInView", "viewport", "transition"];
  return {
    useReducedMotion: () => true,
    motion: {
      button: ({
        children,
        ...props
      }: { children?: React.ReactNode } & Record<string, unknown>) => {
        const rest = Object.fromEntries(
          Object.entries(props).filter(([k]) => !ANIMATION_PROPS.includes(k)),
        );
        return <button {...(rest as React.ComponentProps<"button">)}>{children}</button>;
      },
    },
  };
});

import CommonAreas from "@/app/components/landing/CommonAreas";
import { BookingProvider } from "@/lib/booking";
import { makeContent } from "./helpers/content-fixture";
import type { CommonArea, CommonAreaKind } from "@/lib/content";

const area = (n: number, kind: CommonAreaKind): CommonArea => ({
  url: `/area-${n}.jpg`,
  alt: `Shared area ${n}`,
  width: 1600,
  height: 1067,
  label: `Area ${n}`,
  title: `Title ${n}`,
  kind,
});

/** Four kinds over five photos, so the filter chips actually appear. */
const areas: CommonArea[] = [
  area(0, "pool"),
  area(1, "lounge"),
  area(2, "gym"),
  area(3, "grounds"),
  area(4, "pool"),
];

const mount = (over: Partial<Parameters<typeof makeContent>[0]> = {}) =>
  render(
    <BookingProvider content={makeContent({ commonAreas: areas, ...over })}>
      <CommonAreas />
    </BookingProvider>,
  );

/** The photo tiles, which are the buttons labelled "Open photo: …". */
const tiles = () => screen.getAllByRole("button", { name: /^Open photo:/i });

describe("filtering the shared areas", () => {
  it("disables the tiles it hides, so the keyboard cannot open them either", async () => {
    const user = userEvent.setup();
    mount();

    expect(tiles().every((b) => !b.hasAttribute("disabled"))).toBe(true);

    const filters = screen.getByRole("group", { name: "Filter the photos by area" });
    await user.click(within(filters).getByRole("button", { name: /^Pool/ }));

    // Two pool photos stay live; the other three are genuinely disabled, not
    // merely unclickable.
    const live = tiles().filter((b) => !b.hasAttribute("disabled"));
    expect(live).toHaveLength(2);
    expect(tiles().filter((b) => b.hasAttribute("disabled"))).toHaveLength(3);
  });

  it("does not open the viewer when a filtered-out tile is activated", async () => {
    const user = userEvent.setup();
    mount();

    const filters = screen.getByRole("group", { name: "Filter the photos by area" });
    await user.click(within(filters).getByRole("button", { name: /^Gym/ }));

    /*
      Asserted, not optional-chained. `find` returns undefined when nothing is
      disabled, and a `hidden?.focus()` on undefined quietly does nothing — so
      this test passed against the very code it exists to catch. It has to fail
      when the tile is missing, not skip.
    */
    const hidden = tiles().find((b) => b.hasAttribute("disabled"));
    expect(hidden).toBeDefined();

    // The old failure mode exactly: Enter on a dimmed tile opened the viewer.
    hidden!.focus();
    expect(hidden).not.toHaveFocus(); // a disabled button cannot even take focus
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("the rendition each tile asks for", () => {
  it("asks for a two-column image for the tiles that span two columns", () => {
    mount();
    const imgs = screen.getAllByRole("img").filter((i) => i.getAttribute("data-sizes"));
    const sizes = imgs.map((i) => i.getAttribute("data-sizes"));

    // Tiles 0 (hero, 2×2) and 3 (wide) are the double-width slots.
    expect(sizes[0]).toBe("(min-width:1024px) 566px, 100vw");
    expect(sizes[3]).toBe("(min-width:1024px) 566px, 100vw");
    for (const i of [1, 2, 4]) expect(sizes[i]).toBe("(min-width:1024px) 277px, 50vw");
  });
});

describe("with no photos at all", () => {
  it("renders nothing rather than an empty dark band", () => {
    const { container } = mount({ commonAreas: [] });
    expect(container).toBeEmptyDOMElement();
  });
});
