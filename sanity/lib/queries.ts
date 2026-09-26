import {groq} from 'next-sanity'

/**
 * AVAILABILITY — the calendar's only view of bookings.
 *
 * Selects ONLY the unit slug and the dates. `guest` and `note` are never
 * projected, so guest PII never leaves the server even though it lives on the
 * same document. Run this server-side with a read token against a private
 * dataset; feed the result to the calendar's blocked-date logic.
 */
export const availabilityQuery = groq`
  *[_type == "booking" && status in ["held", "confirmed"]]{
    "unit":  unit->slug.current,   // null = whole-property closure
    "start": startDate,
    "end":   endDate
  }
`

/**
 * UNIT PAGE — merges the shared singletons in so info isn't duplicated per unit.
 * Address/terms/amenities come from the singletons unless the unit overrides them.
 */
export const unitQuery = groq`
  *[_type == "unit" && slug.current == $slug && hidden != true][0]{
    name, code, tagline, priceUsd, priceNightlyUsd, deposits, availableFrom, spec, bookingUrl, chips, keywords,
    "slug": slug.current,
    tour, about, space,

    // The LQIP rides along on the image object, so img() in sanity.server.ts
    // turns it into a blur placeholder without every caller asking.
    "coverImage": coverImage{..., "lqip": asset->metadata.lqip},
    "gallery":    gallery[]{..., "lqip": asset->metadata.lqip},

    // The whole translation row for this language, or null. The field-by-field
    // fallback to English happens in lib/sanity.server.ts, where per-image alt
    // text can be matched up by _key without eight repeated subscripts here.
    "tr": i18n[locale == $locale][0],

    // inherit shared defaults unless the unit overrides them
    "amenities": coalesce(amenitiesOverride, *[_type == "stayDefaults"][0].amenities),
    "terms":     coalesce(termsOverride,     *[_type == "stayDefaults"][0].houseRules),

    // Which side that coalesce picked, plus the shared defaults' own translation.
    // Both are needed to get the precedence right: the translated Stay defaults
    // are only the correct answer when the unit is actually inheriting them, and
    // the coalesce above has already thrown away which case it was.
    //
    // Line comments, never a block: GROQ has no /* */ and rejects the WHOLE
    // query with a 400. Because these strings are parsed server-side at request
    // time, that shows up as a broken apartment page, not a broken build.
    "hasOwnAmenities": defined(amenitiesOverride),
    "hasOwnTerms":     defined(termsOverride),
    "sharedTr": *[_type == "stayDefaults"][0].i18n[locale == $locale][0]{amenities, houseRules},

    // shared, edited once
    "location": *[_type == "location"][0]{heading, addressLine, distances},
    "settings": *[_type == "siteSettings"][0]{propertyName, whatsappNumber, fxRate, internetMbps, powerBaseUsd, discounts}
  }
`

/**
 * FORMER ADDRESS — the current slug of whichever apartment used to live at $slug.
 *
 * Asked only after unitQuery has already come back empty, so it costs nothing on
 * the path that matters. `hidden` is deliberately NOT filtered: a hidden
 * apartment still owns its old addresses, and redirecting to a page that then
 * 404s is a clearer answer than 404ing on a URL that does have an owner.
 */
export const formerSlugQuery = groq`
  *[_type == "unit" && $slug in previousSlugs][0].slug.current
`

/**
 * LANDING — unit cards (no heavy fields) + shared hero/location/settings.
 *
 * Each shared document carries its translation row for $locale as `tr`; the
 * field-by-field fallback to English happens in lib/sanity.server.ts. The hero
 * headline, the amenity tiles and the trust paragraph all come from here, which
 * is why an untranslated singleton leaves the Spanish landing page reading as
 * English however well the apartments themselves are translated.
 */
export const landingQuery = groq`{
  "hero":     *[_type == "hero"][0]{..., "tr": i18n[locale == $locale][0]},
  "location": *[_type == "location"][0]{heading, addressLine, distances, "tr": i18n[locale == $locale][0]},
  "settings": *[_type == "siteSettings"][0]{propertyName, city, region, whatsappNumber, languages, ownerSince, replyTime, hostNote, checkIn, checkOut, stayNote, fxRate, internetMbps, "fxRateUpdatedAt": coalesce(fxRateAsOf, _updatedAt), powerBaseUsd, discounts, propertyAmenities, "commonAreas": commonAreas[]{..., "lqip": asset->metadata.lqip}, seo, "tr": i18n[locale == $locale][0]},
  "units":    *[_type == "unit" && hidden != true] | order(priceUsd asc){
    "slug": slug.current, name, code, tagline, priceUsd, priceNightlyUsd, deposits, availableFrom, spec, bookingUrl, chips, keywords,
    forSale, salePriceUsd, saleNote,
    space, tour,
    "coverImage": coverImage{..., "lqip": asset->metadata.lqip},
    "gallery":    gallery[]{..., "lqip": asset->metadata.lqip},
    "tr": i18n[locale == $locale][0]
  }
}`

/**
 * PRIVATE — the bookings list for Henrik's admin only (includes guest + note).
 * Never call this from a public/unauthenticated context.
 */
export const bookingsAdminQuery = groq`
  *[_type == "booking"] | order(startDate asc){
    _id, startDate, endDate, status, source, note, guest,
    "unit": unit->name
  }
`
