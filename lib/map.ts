/**
 * The embedded map's URL, built from the pin stored in the location document.
 *
 * Shared rather than inlined because the coordinates were hardcoded in THREE
 * places — two iframe URLs and the JSON-LD `geo` — and all three sat about 1.7 km
 * from the building. One of those iframes turned out to be in a component nothing
 * rendered, which is how a fix to it could look applied and change nothing.
 */

/**
 * How much ground to show around the pin, in degrees of latitude.
 *
 * ~0.008° is roughly 900 m, which keeps Playa Sosúa and Pedro Clisante in frame —
 * the two landmarks the distances list leads with — without shrinking the
 * building to a dot.
 */
const SPAN = 0.008;

/**
 * OpenStreetMap's embed takes a bounding box and a marker, not a centre and a
 * zoom, so the box is derived from the pin.
 *
 * Longitude is divided by cos(latitude) so the box is not stretched sideways: a
 * degree of longitude at 19.8°N covers only ~94% of the ground a degree of
 * latitude does, and using the same span for both would squash the map.
 */
export function mapSrc(lat: number, lng: number): string {
  const lngSpan = SPAN / Math.cos((lat * Math.PI) / 180);
  const bbox = [lng - lngSpan, lat - SPAN, lng + lngSpan, lat + SPAN]
    .map((n) => n.toFixed(4))
    .join(",");
  const params = new URLSearchParams({ bbox, layer: "mapnik", marker: `${lat},${lng}` });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

/**
 * The address on one line, as someone would paste it into a maps app.
 *
 * Built from the parts rather than stored as a block so the street stays editable
 * in /admin → Getting around and the city and region stay in Property details,
 * each in one place. Blank parts are dropped, so an unfilled region does not
 * leave a stray comma in something a guest is about to paste.
 */
export function fullAddress(parts: {
  /** The building, when it has a name — a named building is easier to find than a street number. */
  building?: string;
  addressLine: string;
  city: string;
  region: string;
  country?: string;
}): string {
  return [
    parts.building,
    parts.addressLine,
    parts.city,
    regionOnly(parts.region),
    parts.country ?? "Dominican Republic",
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * The region without a country glued onto the end of it.
 *
 * The stored region was "Puerto Plata, DR", which is reasonable to type into a
 * box labelled "Region" and wrong in both places that read it: the address a
 * guest pastes came out as "…, Puerto Plata, DR, Dominican Republic", and the
 * JSON-LD published `addressRegion: "Puerto Plata, DR"` next to its own separate
 * `addressCountry: "DO"`.
 *
 * The data is corrected, so this is the guard against it being typed again — and
 * the reason it is exported is that structured-data.ts needs exactly the same
 * normalisation. Anchored at the end and on a word boundary so a region that
 * merely contains those letters is untouched.
 */
export function regionOnly(region: string | undefined): string {
  return (region ?? "")
    .replace(/[,\s]+(?:dr|do|rep(?:ública|ublica|\.)?\s*dominicana|dominican\s+republic)\s*$/i, "")
    .trim();
}

/**
 * Driving directions to the pin.
 *
 * To the COORDINATES, not the address, and that is the whole point: street
 * numbering around El Batey is patchy, and a maps search for "Calle Minerva
 * Mirabal" can land anywhere along it — which is no help to someone in a car who
 * has already driven from the airport. The pin is exact.
 *
 * `api=1` is Google's documented cross-platform form: it opens the app on a phone
 * and the site on a desktop, with no key and no per-platform branching.
 */
export function directionsHref(lat: number, lng: number): string {
  const params = new URLSearchParams({ api: "1", destination: `${lat},${lng}` });
  return `https://www.google.com/maps/dir/?${params}`;
}
