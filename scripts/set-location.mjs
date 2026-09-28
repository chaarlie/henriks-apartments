/*
  Point the site at the actual building.

  The address said "Calle Dr. Rosen, El Batey" and the map pin sat at
  19.7530,-70.5085 — about 1.7 km south of Rizz Suites, which is on Calle Minerva
  Mirabal. Both were wrong, and the pin was wrong in two places at once: the
  iframe URL in LocationMap.tsx and the `geo` constant in structured-data.ts. It
  is one editable field now (location.lat / location.lng), so this sets data
  rather than code.

  The coordinates are GEOCODED, not estimated — Nominatim, the same OpenStreetMap
  data the embedded map renders, so the pin lands exactly where the map's own
  search would put it:

    Calle Minerva Mirabal, El Batey, Sosúa, Puerto Plata, República Dominicana
    → 19.7683675, -70.5117769

  The Spanish address line is set too. It is the same street name in both
  languages — "Calle Minerva Mirabal" is a proper noun — but it lives in the
  translation row, so leaving it would have kept showing the old street to every
  Spanish reader.

  Idempotent.

      npm run units:set-location
      npm run units:set-location -- --commit
*/
import { sanity, die } from "./i18n/sanity.mjs";

const ADDRESS = "Calle Minerva Mirabal, El Batey";
const LAT = 19.7683675;
const LNG = -70.5117769;

const commit = process.argv.includes("--commit");
const client = sanity({ write: commit });

const doc = await client.fetch(`*[_type == "location"][0]{_id, addressLine, lat, lng,
  "esKey": i18n[_key == "es"][0]._key,
  "esAddress": i18n[_key == "es"][0].addressLine
}`);
if (!doc?._id) die("No location document found.", "Check the token in .env.local.");

const ops = {};
if (doc.addressLine !== ADDRESS) ops.addressLine = ADDRESS;
if (doc.lat !== LAT) ops.lat = LAT;
if (doc.lng !== LNG) ops.lng = LNG;
if (doc.esKey && doc.esAddress !== ADDRESS) ops[`i18n[_key=="es"].addressLine`] = ADDRESS;

console.log(`\n${commit ? "Writing" : "Dry run — would write"}:\n`);
console.log(`  address   "${doc.addressLine ?? "(unset)"}"`);
console.log(`         →  "${ADDRESS}"`);
console.log(`  es        "${doc.esAddress ?? "(no Spanish row)"}"`);
console.log(`         →  "${ADDRESS}"`);
console.log(`  pin       ${doc.lat ?? "(unset)"}, ${doc.lng ?? "(unset)"}`);
console.log(`         →  ${LAT}, ${LNG}`);
if (doc.lat && doc.lng) {
  // Rough, but enough to show the size of the error in the output.
  const dLat = (LAT - doc.lat) * 111.32;
  const dLng = (LNG - doc.lng) * 111.32 * Math.cos((LAT * Math.PI) / 180);
  console.log(`            (moves the pin ${Math.hypot(dLat, dLng).toFixed(2)} km)`);
}
console.log(`\n  check: https://www.openstreetmap.org/?mlat=${LAT}&mlon=${LNG}#map=17/${LAT}/${LNG}\n`);

if (!Object.keys(ops).length) {
  console.log("Nothing to do — the address and pin are already set.\n");
  process.exit(0);
}
if (!commit) {
  console.log("Nothing was written. Re-run with --commit to apply.\n");
  process.exit(0);
}

await client.patch(doc._id).set(ops).commit();

console.log("Done — map, address and JSON-LD now agree on one location.");
console.log("The pin is editable in /admin → Getting around.\n");
