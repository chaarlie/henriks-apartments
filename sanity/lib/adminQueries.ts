import { groq } from "next-sanity";

/**
 * Admin reads — the /admin UI needs EVERYTHING (including hidden apartments and
 * the private guest fields on bookings), unlike the public site queries. Only
 * ever run these from a server context that has checked the signed-in admin.
 *
 * Every translatable document also projects its raw `i18n` array and the exact
 * English fields lib/i18n/fingerprint.ts hashes. The admin recomputes that
 * fingerprint on read and compares it with the one stored on each translation
 * row, which is how a row shows as "English changed since this was translated"
 * without anyone running a script.
 *
 * GROQ HAS NO BLOCK COMMENTS. Only `//` to end of line parses; a `/* ... *\/`
 * inside one of these template literals is a 400 from the API — and because
 * these strings are only parsed server-side at request time, it fails as a
 * broken page rather than a broken build. Keep every comment below on `//`.
 */

export const adminUnitsQuery = groq`
  *[_type == "unit"] | order(priceUsd asc){
    _id,
    "slug": slug.current,
    name, code, tagline, hidden,
    priceUsd, priceNightlyUsd, deposits, availableFrom,
    spec, chips, keywords,
    forSale, salePriceUsd, saleNote,
    about, space,
    coverImage{alt, "ref": asset._ref},

    // _key rides along because gallery alt text is matched by key, never by
    // position — reordering the gallery would otherwise move every Spanish alt
    // onto the wrong photo. extractDoc() keys on it too, so dropping it here
    // would quietly change the fingerprint of every apartment.
    gallery[]{_key, alt, "ref": asset._ref},
    tour,

    // Both spellings. The coalesced pair is what the editor shows; the raw
    // overrides are what the fingerprint is computed from, because
    // lib/i18n/schema.ts names the fields as they exist on the unit and cannot
    // see a projection that has already merged the shared defaults in.
    "amenities": coalesce(amenitiesOverride, *[_type == "stayDefaults"][0].amenities),
    "terms":     coalesce(termsOverride,     *[_type == "stayDefaults"][0].houseRules),
    amenitiesOverride,
    termsOverride,

    i18n,
    "bookingCount": count(*[_type == "booking" && references(^._id)])
  }
`;

export const adminBookingsQuery = groq`
  *[_type == "booking"] | order(startDate desc){
    _id, startDate, endDate, status, source, note, guest,
    "unitId": unit->_id,
    "unit": unit->name
  }
`;

export const adminSettingsQuery = groq`
  *[_id == "siteSettings"][0]{
    propertyName, city, region, whatsappNumber,
    languages, ownerSince, replyTime, hostNote,
    checkIn, checkOut, stayNote,
    fxRate, "fxRateAsOf": coalesce(fxRateAsOf, _updatedAt),
    powerBaseUsd, discounts, propertyAmenities,
    seo,
    i18n
  }
`;

/** The homepage cover. Editable in /admin as of the language work — see AdminApp. */
export const adminHeroQuery = groq`
  *[_id == "hero"][0]{
    eyebrow, headline, sub, videoId,
    background{alt, "ref": asset._ref},
    stats,
    i18n
  }
`;

/** "Getting around" — the shared address and the distances under it. */
export const adminLocationQuery = groq`
  *[_id == "location"][0]{
    heading, addressLine, distances,
    i18n
  }
`;

export const adminUnitOptionsQuery = groq`
  *[_type == "unit"] | order(priceUsd asc){ _id, name }
`;
