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
    name, code, tagline, priceUsd, priceNightlyUsd, availableFrom, spec, chips, keywords,
    "slug": slug.current,
    coverImage, gallery, tour, about, space,

    // inherit shared defaults unless the unit overrides them
    "amenities": coalesce(amenitiesOverride, *[_type == "stayDefaults"][0].amenities),
    "terms":     coalesce(termsOverride,     *[_type == "stayDefaults"][0].houseRules),

    // shared, edited once
    "location": *[_type == "location"][0]{heading, addressLine, distances},
    "settings": *[_type == "siteSettings"][0]{propertyName, whatsappNumber, fxRate, powerBaseUsd, discounts}
  }
`

/** LANDING — unit cards (no heavy fields) + shared hero/location/settings. */
export const landingQuery = groq`{
  "hero":     *[_type == "hero"][0],
  "location": *[_type == "location"][0]{heading, addressLine, distances},
  "settings": *[_type == "siteSettings"][0]{propertyName, city, region, whatsappNumber, checkIn, checkOut, stayNote, fxRate, "fxRateUpdatedAt": coalesce(fxRateAsOf, _updatedAt), powerBaseUsd, discounts, propertyAmenities},
  "units":    *[_type == "unit" && hidden != true] | order(priceUsd asc){
    "slug": slug.current, name, code, tagline, priceUsd, priceNightlyUsd, availableFrom, spec, chips, keywords,
    forSale, salePriceUsd, saleNote,
    coverImage, gallery, space, tour
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
