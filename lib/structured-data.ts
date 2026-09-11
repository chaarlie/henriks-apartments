import type { SiteContent, Unit } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { unitFacts } from "@/lib/unit";

/**
 * schema.org JSON-LD for the landing page (LodgingBusiness) and each unit page
 * (Apartment + monthly Offer + BreadcrumbList). Undefined fields are dropped by
 * JSON.stringify, so missing data never emits empty properties.
 */

/** The pin used by the site's embedded map. */
const GEO = { "@type": "GeoCoordinates", latitude: 19.753, longitude: -70.5085 };
const BUSINESS_ID = absoluteUrl("/#business");

/** "3:00 PM" → "15:00" for schema.org; undefined when it isn't a clock time. */
function time24(s: string): string | undefined {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return undefined;
  let hour = Number(m[1]);
  const period = m[3]?.toLowerCase().replace(/\./g, "");
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour > 23) return undefined;
  return `${String(hour).padStart(2, "0")}:${m[2] ?? "00"}`;
}

const firstNumber = (s: string) => {
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

function address(content: SiteContent) {
  return {
    "@type": "PostalAddress",
    streetAddress: content.location.addressLine || content.property.addressLine || undefined,
    addressLocality: content.property.city || undefined,
    addressRegion: content.property.region || undefined,
    addressCountry: "DO",
  };
}

export function businessJsonLd(content: SiteContent) {
  const prices = content.units.map((u) => u.priceUsd);
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": BUSINESS_ID,
    name: content.property.name,
    description: content.hero.sub,
    url: absoluteUrl("/"),
    image: content.hero.background.url || undefined,
    address: address(content),
    geo: GEO,
    checkinTime: time24(content.stay.checkIn),
    checkoutTime: time24(content.stay.checkOut),
    priceRange: prices.length ? `$${Math.min(...prices)}–$${Math.max(...prices)} per month` : undefined,
    currenciesAccepted: "USD, DOP",
    containsPlace: content.units.map((u) => ({
      "@type": "Apartment",
      name: u.name,
      url: absoluteUrl(`/apartments/${u.slug}`),
    })),
  };
}

export function unitJsonLd(content: SiteContent, unit: Unit) {
  const url = absoluteUrl(`/apartments/${unit.slug}`);
  const [[, area], [, baths], [, sleeps]] = unitFacts(unit);
  const floor = firstNumber(area);
  const bathCount = firstNumber(baths);
  const occupancy = firstNumber(sleeps);
  const amenities = [...unit.amenities.inside, ...unit.amenities.building].filter((a) => a.included);
  const images = [unit.image, ...unit.gallery].map((i) => i.url).filter(Boolean).slice(0, 8);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Apartment",
        "@id": `${url}#apartment`,
        name: unit.name,
        description: unit.about[0] ?? unit.tagline,
        url,
        image: images.length ? images : undefined,
        floorSize: floor !== undefined ? { "@type": "QuantitativeValue", value: floor, unitCode: "MTK" } : undefined,
        numberOfBathroomsTotal: bathCount !== undefined && Number.isInteger(bathCount) ? bathCount : undefined,
        occupancy: occupancy !== undefined ? { "@type": "QuantitativeValue", maxValue: occupancy } : undefined,
        amenityFeature: amenities.length
          ? amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.label, value: true }))
          : undefined,
        address: address(content),
        geo: GEO,
        containedInPlace: { "@id": BUSINESS_ID },
      },
      {
        "@type": "Offer",
        "@id": `${url}#offer`,
        url,
        itemOffered: { "@id": `${url}#apartment` },
        price: unit.priceUsd,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: unit.priceUsd,
          priceCurrency: "USD",
          unitCode: "MON",
          unitText: "per month",
        },
        availabilityStarts: unit.availableFrom || undefined,
        businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: content.property.name, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: unit.name, item: url },
        ],
      },
    ],
  };
}
