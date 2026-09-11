import { groq } from "next-sanity";

/**
 * Admin reads — the /admin UI needs EVERYTHING (including hidden apartments and
 * the private guest fields on bookings), unlike the public site queries. Only
 * ever run these from a server context that has checked the signed-in admin.
 */

export const adminUnitsQuery = groq`
  *[_type == "unit"] | order(priceUsd asc){
    _id,
    "slug": slug.current,
    name, code, tagline, hidden,
    priceUsd, priceNightlyUsd, availableFrom,
    spec, chips, keywords,
    forSale, salePriceUsd, saleNote,
    about, space,
    coverImage{alt, "ref": asset._ref},
    gallery[]{alt, "ref": asset._ref},
    tour,
    "amenities": coalesce(amenitiesOverride, *[_type == "stayDefaults"][0].amenities),
    "terms":     coalesce(termsOverride,     *[_type == "stayDefaults"][0].houseRules),
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
    powerBaseUsd, discounts, propertyAmenities
  }
`;

export const adminUnitOptionsQuery = groq`
  *[_type == "unit"] | order(priceUsd asc){ _id, name }
`;
