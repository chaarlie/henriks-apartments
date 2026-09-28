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
