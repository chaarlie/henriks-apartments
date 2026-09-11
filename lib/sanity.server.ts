import "server-only";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { sanityFetch } from "@/sanity/lib/live";
import { urlFor } from "@/sanity/lib/image";
import { panoramaUrl } from "@/lib/panorama";
import { landingQuery, unitQuery, availabilityQuery } from "@/sanity/lib/queries";
import type {
  SiteContent,
  Unit,
  ImageRef,
  TourNode,
  Amenity,
  Term,
  SpaceItem,
} from "@/lib/content";

/**
 * Server-only adapter: fetches from Sanity and returns the SAME shapes the
 * components already consume (`SiteContent` / `Unit` from lib/content.ts), so
 * the front-end swaps its data source without changing any rendering code.
 *
 * Images become resolved CDN URLs (components use them with `<Image fill>`),
 * portable-text `about` collapses back to paragraph strings, and every booking
 * (per-unit or whole-property) becomes a property-wide blocked range to match
 * the current calendar model.
 */

const DEFAULT_WHATSAPP_MESSAGE =
  "Hi Henrik — I'm interested in one of your Sosúa apartments. Is it available for my dates?";

// Used until Henrik sets his own in /admin → Property details.
const DEFAULT_STAY = {
  checkIn: "3:00 PM",
  checkOut: "12:00 PM",
  note: "Henrik meets you at the gate with the keys. Flying out later in the day? Leave your bags with him and spend the last morning on the beach.",
};

// A Sanity image field: an asset reference plus our custom `alt`.
type SanityImage = SanityImageSource & { alt?: string };

function img(source: SanityImage | undefined, fallbackAlt = ""): ImageRef {
  if (!source) return { url: "", alt: fallbackAlt, width: 1600, height: 1067 };
  return {
    url: urlFor(source).width(1600).quality(80).auto("format").url(),
    alt: source.alt ?? fallbackAlt,
    width: 1600,
    height: 1067,
  };
}

// Portable-text blocks → one string per paragraph.
type Block = { _type?: string; children?: { text?: string }[] };
function blocksToParagraphs(blocks: Block[] | undefined): string[] {
  return (blocks ?? [])
    .filter((b) => b._type === "block")
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .filter(Boolean);
}

function mapTour(tour: RawTourStop[] | undefined): TourNode[] {
  return (tour ?? []).map((stop) => ({
    _id: stop.stopId,
    _type: "tourNode",
    name: stop.name,
    caption: "",
    panorama: panoramaUrl(stop.panorama ?? ""),
    links: (stop.links ?? []).map((l) => ({ to: l.to, yaw: l.yaw })),
  }));
}

// ── Raw GROQ result shapes (only the fields we read) ──────────────────────────
interface RawTourStop {
  stopId: string;
  name: string;
  panorama?: string;
  links?: { to: string; yaw: string }[];
}
interface RawUnit {
  slug: string;
  name: string;
  code: string;
  tagline: string;
  priceUsd: number;
  priceNightlyUsd: number;
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string };
  chips: string[];
  keywords: string;
  forSale?: boolean;
  salePriceUsd?: number;
  saleNote?: string;
  coverImage?: SanityImage;
  gallery?: SanityImage[];
  tour?: RawTourStop[];
  about?: Block[];
  space?: SpaceItem[];
  amenities?: { inside?: Amenity[]; building?: Amenity[] };
  terms?: Term[];
}
interface RawSettings {
  propertyName: string;
  city: string;
  region: string;
  whatsappNumber: string;
  checkIn?: string;
  checkOut?: string;
  stayNote?: string;
  fxRate: number;
  /** when the rate last changed (falls back to the document's last save) */
  fxRateUpdatedAt?: string;
  powerBaseUsd: number;
  discounts?: { months: number; pct: number }[];
  propertyAmenities?: { icon: string; title: string; desc: string }[];
}

// Split the availability feed into whole-property closures + per-unit ranges.
function buildAvailability(
  bookings: { unit: string | null; start: string; end: string }[],
): SiteContent["availability"] {
  const closures: [string, string][] = [];
  const byUnit: Record<string, [string, string][]> = {};
  for (const b of bookings) {
    if (!b.start || !b.end) continue;
    if (b.unit) (byUnit[b.unit] ??= []).push([b.start, b.end]);
    else closures.push([b.start, b.end]);
  }
  return { closures, byUnit };
}

function cardUnit(u: RawUnit): Unit {
  return {
    _id: `unit-${u.slug}`,
    _type: "unit",
    slug: u.slug,
    code: u.code,
    name: u.name,
    tagline: u.tagline,
    priceUsd: u.priceUsd,
    priceNightlyUsd: u.priceNightlyUsd,
    availableFrom: u.availableFrom,
    spec: u.spec,
    chips: u.chips ?? [],
    keywords: u.keywords ?? "",
    forSale: u.forSale ?? false,
    salePriceUsd: u.salePriceUsd ?? 0,
    saleNote: u.saleNote ?? "",
    image: img(u.coverImage, u.name),
    // The landing carousel reads gallery + space + the 360 tour; the rest stay
    // empty here and are fetched per-unit by getUnit.
    about: [],
    space: u.space ?? [],
    amenities: { inside: [], building: [] },
    terms: [],
    gallery: (u.gallery ?? []).map((g) => img(g, u.name)),
    tour: mapTour(u.tour),
  };
}

/** Full site content for the landing page and the shared BookingProvider. */
export async function getSiteContent(): Promise<SiteContent> {
  const [{ data: landing }, { data: bookings }] = await Promise.all([
    sanityFetch<{
      hero: {
        eyebrow: string;
        headline: string;
        sub: string;
        videoId: string;
        background?: SanityImage;
        stats?: { value: string; label: string }[];
      };
      location: { heading: string; addressLine: string; distances?: { label: string; value: string }[] };
      settings: RawSettings;
      units: RawUnit[];
    }>({ query: landingQuery }),
    sanityFetch<{ unit: string | null; start: string; end: string }[]>({
      query: availabilityQuery,
    }),
  ]);

  const s = landing.settings;

  return {
    property: {
      name: s.propertyName,
      addressLine: landing.location?.addressLine ?? "",
      city: s.city,
      region: s.region,
      whatsappNumber: s.whatsappNumber,
      whatsappMessage: DEFAULT_WHATSAPP_MESSAGE,
      email: "",
    },
    hero: {
      eyebrow: landing.hero.eyebrow,
      headline: landing.hero.headline,
      sub: landing.hero.sub,
      videoId: landing.hero.videoId,
      stats: landing.hero.stats ?? [],
      background: img(landing.hero.background, landing.hero.headline),
    },
    stay: {
      checkIn: s.checkIn || DEFAULT_STAY.checkIn,
      checkOut: s.checkOut || DEFAULT_STAY.checkOut,
      note: s.stayNote || DEFAULT_STAY.note,
    },
    fxRate: s.fxRate,
    fxRateAsOf: s.fxRateUpdatedAt?.slice(0, 10) ?? "",
    units: landing.units.map(cardUnit),
    amenities: s.propertyAmenities ?? [],
    power: { baseUsd: s.powerBaseUsd },
    discounts: s.discounts ?? [],
    // Per-unit availability: a booking with a unit blocks that unit; one without
    // a unit is a whole-property closure that blocks every unit.
    availability: buildAvailability(bookings),
    location: {
      heading: landing.location?.heading ?? "",
      addressLine: landing.location?.addressLine ?? "",
      distances: landing.location?.distances ?? [],
    },
  };
}

/** One fully-populated apartment for /apartments/[slug]. */
export async function getUnit(slug: string): Promise<Unit | null> {
  const { data: u } = await sanityFetch<
    | (RawUnit & {
        amenities?: { inside?: Amenity[]; building?: Amenity[] };
        terms?: Term[];
      })
    | null
  >({ query: unitQuery, params: { slug } });
  if (!u) return null;

  return {
    _id: `unit-${u.slug}`,
    _type: "unit",
    slug: u.slug,
    code: u.code,
    name: u.name,
    tagline: u.tagline,
    priceUsd: u.priceUsd,
    priceNightlyUsd: u.priceNightlyUsd,
    availableFrom: u.availableFrom,
    spec: u.spec,
    chips: u.chips ?? [],
    keywords: u.keywords ?? "",
    image: img(u.coverImage, u.name),
    about: blocksToParagraphs(u.about),
    space: u.space ?? [],
    amenities: {
      inside: u.amenities?.inside ?? [],
      building: u.amenities?.building ?? [],
    },
    terms: u.terms ?? [],
    gallery: (u.gallery ?? []).map((g) => img(g, u.name)),
    tour: mapTour(u.tour),
  };
}

/** Slugs for generateStaticParams. */
export async function getUnitSlugs(): Promise<string[]> {
  const { data } = await sanityFetch<{ units: { slug: string }[] }>({
    query: landingQuery,
  });
  return data.units.map((u) => u.slug);
}
