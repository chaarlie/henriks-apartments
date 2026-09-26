/**
 * @jest-environment jsdom
 */

/**
 * The one address this app cannot reach with a client-side navigation.
 *
 * `/` has no route file — next.config.ts rewrites it to `/en`. A full page load
 * follows that rewrite and works; a client-side navigation does not. Next asks
 * for `/` with an `RSC` header expecting a flight payload, and in production the
 * rewrite answers with the HTML of `/en` (`x-matched-path: /en`,
 * `content-type: text/html`, where `/es` correctly returns `/es.rsc` and
 * `text/x-component`). The router cannot read HTML as a payload, so clicking the
 * logo on an apartment page landed on a 404 — in production, on main.
 *
 * Two things make this worth a test rather than a comment:
 *
 *   - It does NOT reproduce under `next start`, where the RSC request 307s to
 *     `/?_rsc` and returns `text/x-component` correctly. So no local run catches
 *     a regression here, and nothing else would notice if someone swapped
 *     SiteLink back for next/link.
 *   - `/apartments/:slug` is unaffected only by luck: `:slug` captures the `.rsc`
 *     suffix and carries it to the destination. The root has no parameter to do
 *     that, which is why the rule is about the root specifically and must not be
 *     "widened" to other paths.
 *
 * next/link is mocked as an <a data-soft>, so these assert which KIND of
 * navigation each href gets — the whole point of the component.
 */
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-soft="true" {...rest}>
      {children}
    </a>
  ),
}));

import SiteLink from "@/app/components/SiteLink";
import { isUnroutableRoot } from "@/lib/locales";

const soft = (name: string) => screen.getByRole("link", { name }).hasAttribute("data-soft");

describe("SiteLink", () => {
  it("uses a full page load for the rewritten root", () => {
    render(<SiteLink href="/">Home</SiteLink>);
    expect(soft("Home")).toBe(false);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("uses a full page load for the root with a hash, which is the same navigation", () => {
    render(<SiteLink href="/#units">Apartments</SiteLink>);
    expect(soft("Apartments")).toBe(false);
  });

  it("keeps client-side navigation for a prefixed locale root", () => {
    // /es has its own route file, so the rewrite is not involved and Link works.
    render(<SiteLink href="/es">Inicio</SiteLink>);
    expect(soft("Inicio")).toBe(true);
  });

  it("keeps client-side navigation for apartment pages in both languages", () => {
    render(
      <>
        <SiteLink href="/apartments/apartment-4">EN unit</SiteLink>
        <SiteLink href="/es/apartments/apartment-4">ES unit</SiteLink>
      </>,
    );
    expect(soft("EN unit")).toBe(true);
    expect(soft("ES unit")).toBe(true);
  });

  it("passes through the props a link needs", () => {
    render(
      <SiteLink href="/" className="logo" aria-current="page">
        Home
      </SiteLink>,
    );
    const a = screen.getByRole("link", { name: "Home" });
    expect(a).toHaveClass("logo");
    expect(a).toHaveAttribute("aria-current", "page");
  });
});

describe("isUnroutableRoot", () => {
  it("is true only for the root", () => {
    expect(isUnroutableRoot("/")).toBe(true);
    expect(isUnroutableRoot("/#units")).toBe(true);
  });

  it("is false for everything that has a route file", () => {
    for (const href of [
      "/es",
      "/es#units",
      "/apartments/apartment-4",
      "/es/apartments/apartment-4",
    ]) {
      expect(isUnroutableRoot(href)).toBe(false);
    }
  });
});
