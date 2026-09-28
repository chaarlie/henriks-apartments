/**
 * The embedded map's URL.
 *
 * Worth pinning because the pin was wrong for a long time and in more places than
 * anyone could see: hardcoded in two iframe URLs and again in the JSON-LD `geo`,
 * all three about 1.7 km south of the building. One of those iframes lived in a
 * component nothing rendered, so correcting it looked like a fix and changed
 * nothing on the page.
 *
 * It is one field now. These tests hold the two things a reader cannot verify by
 * eye: that the marker is the pin exactly, and that the box around it is not
 * stretched sideways.
 */
import { directionsHref, fullAddress, mapSrc, regionOnly } from "@/lib/map";

/** Rizz Suites — Calle Minerva Mirabal, El Batey, Sosúa. */
const LAT = 19.7683675;
const LNG = -70.5117769;

const parse = (url: string) => {
  const q = new URL(url).searchParams;
  const [west, south, east, north] = (q.get("bbox") ?? "").split(",").map(Number);
  return { marker: q.get("marker"), west, south, east, north, layer: q.get("layer") };
};

describe("mapSrc", () => {
  it("marks the exact pin, unrounded", () => {
    // The bbox is rounded for a shorter URL; the MARKER must not be, or the pin
    // drifts from the coordinates given to Google.
    expect(parse(mapSrc(LAT, LNG)).marker).toBe(`${LAT},${LNG}`);
  });

  it("centres the box on the pin", () => {
    const { west, south, east, north } = parse(mapSrc(LAT, LNG));
    expect((south + north) / 2).toBeCloseTo(LAT, 3);
    expect((west + east) / 2).toBeCloseTo(LNG, 3);
  });

  it("widens the box by longitude so the map is not squashed", () => {
    const { west, south, east, north } = parse(mapSrc(LAT, LNG));
    const latSpan = north - south;
    const lngSpan = east - west;

    // At ~19.8°N a degree of longitude is ~94% of a degree of latitude, so the
    // box has to be WIDER in degrees to cover equal ground. Equal spans would
    // squash it.
    expect(lngSpan).toBeGreaterThan(latSpan);
    expect(lngSpan * Math.cos((LAT * Math.PI) / 180)).toBeCloseTo(latSpan, 3);
  });

  it("stays a valid OSM embed for a southern-hemisphere pin", () => {
    // cos() is symmetric about the equator, so a negative latitude must widen
    // the box the same way rather than inverting it.
    const { west, south, east, north, layer } = parse(mapSrc(-33.8688, 151.2093));
    expect(north).toBeGreaterThan(south);
    expect(east).toBeGreaterThan(west);
    expect(layer).toBe("mapnik");
  });
});

describe("the address a driver pastes", () => {
  it("joins the parts each of which is edited somewhere else", () => {
    expect(
      fullAddress({
        addressLine: "Calle Minerva Mirabal, El Batey",
        city: "Sosúa",
        region: "Puerto Plata",
      }),
    ).toBe("Calle Minerva Mirabal, El Batey, Sosúa, Puerto Plata, Dominican Republic");
  });

  it("drops blank parts rather than leaving a stray comma", () => {
    // An unfilled region must not produce "…, , Dominican Republic" in something
    // a guest is about to paste into a maps app.
    expect(fullAddress({ addressLine: "Calle X", city: "Sosúa", region: "  " })).toBe(
      "Calle X, Sosúa, Dominican Republic",
    );
  });
});

describe("directionsHref", () => {
  it("routes to the coordinates, not the street name", () => {
    // A street with patchy numbering: a text search can land anywhere along it,
    // which is no use to someone already in the car.
    const url = new URL(directionsHref(LAT, LNG));
    expect(url.searchParams.get("destination")).toBe(`${LAT},${LNG}`);
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.host).toBe("www.google.com");
  });
});

describe("regionOnly", () => {
  it("strips a country the region should not be carrying", () => {
    // What was actually stored. It produced "…, Puerto Plata, DR, Dominican
    // Republic" in the pasteable address and a malformed schema.org
    // addressRegion beside its own addressCountry.
    expect(regionOnly("Puerto Plata, DR")).toBe("Puerto Plata");
    expect(regionOnly("Puerto Plata, Dominican Republic")).toBe("Puerto Plata");
    expect(regionOnly("Puerto Plata, República Dominicana")).toBe("Puerto Plata");
  });

  it("leaves a clean region alone", () => {
    expect(regionOnly("Puerto Plata")).toBe("Puerto Plata");
    expect(regionOnly("")).toBe("");
    expect(regionOnly(undefined)).toBe("");
  });

  it("does not eat a region that merely contains those letters", () => {
    // Anchored at the end and on a word boundary, so "Andorra" keeps its "do".
    expect(regionOnly("Andorra")).toBe("Andorra");
    expect(regionOnly("Drenthe")).toBe("Drenthe");
  });

  it("keeps the country out of the pasteable address exactly once", () => {
    expect(
      fullAddress({ addressLine: "Calle X", city: "Sosúa", region: "Puerto Plata, DR" }),
    ).toBe("Calle X, Sosúa, Puerto Plata, Dominican Republic");
  });
});
