import "server-only";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { sanityFetch } from "@/sanity/lib/live";
import { urlFor } from "@/sanity/lib/image";
import { panoramaUrl } from "@/lib/panorama";
import { landingQuery, unitQuery, availabilityQuery } from "@/sanity/lib/queries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locales";
import type {
  SiteContent,
  Unit,
  ImageRef,
  TourNode,
  SphereCorrection,
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

const DEFAULT_HOST_NOTE =
  "Henrik owns and runs these apartments himself. There is no front desk between you and the person responsible — if something breaks on a Sunday, you message him and he answers.";

// Used until Henrik sets his own in /admin → Property details.
const DEFAULT_STAY = {
  checkIn: "3:00 PM",
  checkOut: "12:00 PM",
  note: "Henrik meets you at the gate with the keys. Flying out later in the day? Leave your bags with him and spend the last morning on the beach.",
};

// A Sanity image field: an asset reference plus our custom `alt`.
type SanityImage = SanityImageSource & { alt?: string };

/**
 * The object form of an image, which is what these queries actually return.
 *
 * `SanityImageSource` also admits a bare asset-id string, and TypeScript will
 * not spread a union containing one — so translating alt text needs the narrower
 * type rather than a runtime guard for a shape GROQ never gives us here. `_key`
 * comes along because gallery alts are matched by key, not by position.
 */
type SanityImageObject = Extract<SanityImageSource, object> & {
  alt?: string;
  _key?: string;
};

/**
 * Sanity encodes the real pixel size in the asset id —
 * "image-<hash>-3000x2000-jpg" — so the intrinsic dimensions come free.
 * They were hardcoded to 1600×1067, which was wrong for anything not 3:2.
 */
function assetSize(source: SanityImage): { width: number; height: number } | null {
  const ref =
    typeof source === "string"
      ? source
      : ((source as { asset?: { _ref?: string } }).asset?._ref ?? null);
  const match = ref?.match(/-(\d+)x(\d+)-[a-z]+$/);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

/**
 * The untransformed asset URL. next/image asks the CDN for the exact width it
 * needs via the loader in lib/sanity-image-loader.ts, so baking a size in here
 * would just cost quality twice. Anything outside next/image sizes it with the
 * helpers in lib/image-url.ts.
 */
function img(source: SanityImage | undefined, fallbackAlt = ""): ImageRef {
  if (!source) return { url: "", alt: fallbackAlt, width: 1600, height: 1067 };
  const size = assetSize(source) ?? { width: 1600, height: 1067 };
  return {
    url: urlFor(source).url(),
    alt: source.alt ?? fallbackAlt,
    width: size.width,
    height: size.height,
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

/**
 * Only pass a correction along when an axis is actually set — an object of
 * empty strings is not the same as "leave this panorama alone".
 */
function mapSphereCorrection(
  c: RawTourStop["sphereCorrection"],
): SphereCorrection | undefined {
  const out: SphereCorrection = {};
  if (c?.pan) out.pan = c.pan;
  if (c?.tilt) out.tilt = c.tilt;
  if (c?.roll) out.roll = c.roll;
  return Object.keys(out).length > 0 ? out : undefined;
}

function mapTour(tour: RawTourStop[] | undefined): TourNode[] {
  return (tour ?? []).map((stop) => ({
    _id: stop.stopId,
    _type: "tourNode",
    name: stop.name,
    caption: "",
    panorama: panoramaUrl(stop.panorama ?? ""),
    sphereCorrection: mapSphereCorrection(stop.sphereCorrection),
    links: (stop.links ?? []).map((l) => ({ to: l.to, yaw: l.yaw })),
  }));
}

// ── Raw GROQ result shapes (only the fields we read) ──────────────────────────
interface RawTourStop {
  stopId: string;
  name: string;
  panorama?: string;
  sphereCorrection?: { pan?: string; tilt?: string; roll?: string };
  links?: { to: string; yaw: string }[];
}
/**
 * One row of `unit.i18n` — the same prose fields, in another language. Written
 * by scripts/i18n/apply.mjs; everything absent falls back to the English.
 */
interface RawTranslation {
  locale: string;
  tagline?: string;
  keywords?: string;
  saleNote?: string;
  chips?: string[];
  coverAlt?: string;
  galleryAlts?: { _key: string; alt?: string }[];
  about?: Block[];
  space?: SpaceItem[];
  termsOverride?: Term[];
  amenitiesOverride?: { inside?: Amenity[]; building?: Amenity[] };
}

interface RawUnit {
  slug: string;
  name: string;
  code: string;
  tagline: string;
  priceUsd: number;
  priceNightlyUsd: number;
  deposits?: { fromMonths: number; amountUsd: number }[];
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string };
  chips: string[];
  keywords: string;
  forSale?: boolean;
  salePriceUsd?: number;
  saleNote?: string;
  coverImage?: SanityImageObject;
  gallery?: SanityImageObject[];
  tour?: RawTourStop[];
  about?: Block[];
  space?: SpaceItem[];
  amenities?: { inside?: Amenity[]; building?: Amenity[] };
  terms?: Term[];
  /** This language's row, or null. See `translated()`. */
  tr?: RawTranslation | null;
  /** Did this unit override the shared Stay defaults, or inherit them? */
  hasOwnAmenities?: boolean;
  hasOwnTerms?: boolean;
  /** The shared Stay defaults in this language, for the inheriting case. */
  sharedTr?: {
    amenities?: { inside?: Amenity[]; building?: Amenity[] };
    houseRules?: Term[];
  } | null;
}

/**
 * The unit as it reads in the requested language, falling back to English field
 * by field.
 *
 * Field by field, not all-or-nothing: a half-finished translation should show
 * the Spanish it has and English for the rest, rather than reverting the whole
 * apartment to English because one field is missing.
 *
 * Doing this here rather than in the components is the point — everything
 * downstream (pages, JSON-LD, the share panel) keeps consuming the same `Unit`
 * shape and needs no idea that translations exist.
 *
 * Photos are never duplicated: only their alt text is translated, matched by
 * _key so reordering the gallery cannot move alt text onto the wrong picture.
 */
function translated(u: RawUnit): RawUnit {
  /*
    No early return when the unit has no translation row of its own: the shared
    Stay defaults may still have one, and an apartment that inherits them should
    show the Spanish house rules rather than English ones just because nobody has
    translated that apartment's own copy yet.
  */
  const t: Partial<RawTranslation> = u.tr ?? {};
  const alts = new Map((t.galleryAlts ?? []).map((g) => [g._key, g.alt]));
  return {
    ...u,
    tagline: t.tagline ?? u.tagline,
    keywords: t.keywords ?? u.keywords,
    saleNote: t.saleNote ?? u.saleNote,
    chips: t.chips ?? u.chips,
    about: t.about ?? u.about,
    space: t.space ?? u.space,
    coverImage:
      u.coverImage && t.coverAlt ? { ...u.coverImage, alt: t.coverAlt } : u.coverImage,
    gallery: (u.gallery ?? []).map((g) => {
      const alt = g._key ? alts.get(g._key) : undefined;
      return alt ? { ...g, alt } : g;
    }),
    /*
      Four levels, in order: this unit's translated override, its English
      override, the translated shared defaults, the English shared defaults.
      The middle two are already collapsed into u.amenities / u.terms by the
      query's coalesce, so hasOwn* is what says which of them it holds.
    */
    amenities:
      t.amenitiesOverride ?? (u.hasOwnAmenities ? u.amenities : u.sharedTr?.amenities ?? u.amenities),
    terms: t.termsOverride ?? (u.hasOwnTerms ? u.terms : u.sharedTr?.houseRules ?? u.terms),
  };
}
interface RawSettings {
  propertyName: string;
  city: string;
  region: string;
  whatsappNumber: string;
  languages?: string[];
  ownerSince?: string;
  replyTime?: string;
  hostNote?: string;
  checkIn?: string;
  checkOut?: string;
  stayNote?: string;
  fxRate: number;
  /** when the rate last changed (falls back to the document's last save) */
  fxRateUpdatedAt?: string;
  powerBaseUsd: number;
  discounts?: { months: number; pct: number }[];
  propertyAmenities?: { icon: string; title: string; desc: string }[];
  tr?: {
    hostNote?: string;
    stayNote?: string;
    propertyAmenities?: { title?: string; desc?: string }[];
    seo?: { title?: string; description?: string };
  } | null;
}

/**
 * Translated rows on the shared singletons.
 *
 * Merged positionally for the tile arrays rather than by _key: the translation
 * is rebuilt from the English array in order, so index i is the same tile. A
 * missing entry leaves the English one untouched.
 */
function mergeRows<T extends object>(
  english: T[] | undefined,
  translated: Partial<T>[] | undefined,
): T[] {
  const rows = english ?? [];
  if (!translated?.length) return rows;
  return rows.map((row, i) => ({ ...row, ...(translated[i] ?? {}) }));
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
    deposits: u.deposits ?? [],
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
export async function getSiteContent(locale: Locale = DEFAULT_LOCALE): Promise<SiteContent> {
  const [{ data: landing }, { data: bookings }] = await Promise.all([
    sanityFetch<{
      hero: {
        eyebrow: string;
        headline: string;
        sub: string;
        videoId: string;
        background?: SanityImageObject;
        stats?: { value: string; label: string }[];
        tr?: {
          eyebrow?: string;
          headline?: string;
          sub?: string;
          backgroundAlt?: string;
          stats?: { value?: string; label?: string }[];
        } | null;
      };
      location: {
        heading: string;
        addressLine: string;
        distances?: { label: string; value: string }[];
        tr?: {
          heading?: string;
          addressLine?: string;
          distances?: { label?: string; value?: string }[];
        } | null;
      };
      settings: RawSettings;
      units: RawUnit[];
    }>({ query: landingQuery, params: { locale } }),
    sanityFetch<{ unit: string | null; start: string; end: string }[]>({
      query: availabilityQuery,
    }),
  ]);

  const s = landing.settings;
  // English is the fallback for every one of these, field by field — a
  // half-finished singleton should show the Spanish it has rather than reverting
  // the whole page.
  const heroTr = landing.hero?.tr;
  const locTr = landing.location?.tr;
  const setTr = s?.tr;

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
      eyebrow: heroTr?.eyebrow ?? landing.hero.eyebrow,
      headline: heroTr?.headline ?? landing.hero.headline,
      sub: heroTr?.sub ?? landing.hero.sub,
      videoId: landing.hero.videoId,
      stats: mergeRows(landing.hero.stats, heroTr?.stats),
      background: img(
        heroTr?.backgroundAlt && landing.hero.background
          ? { ...landing.hero.background, alt: heroTr.backgroundAlt }
          : landing.hero.background,
        heroTr?.headline ?? landing.hero.headline,
      ),
    },
    host: {
      languages: s.languages ?? [],
      ownerSince: s.ownerSince ?? "",
      replyTime: s.replyTime ?? "",
      note: setTr?.hostNote || s.hostNote || DEFAULT_HOST_NOTE,
    },
    stay: {
      checkIn: s.checkIn || DEFAULT_STAY.checkIn,
      checkOut: s.checkOut || DEFAULT_STAY.checkOut,
      note: setTr?.stayNote || s.stayNote || DEFAULT_STAY.note,
    },
    fxRate: s.fxRate,
    fxRateAsOf: s.fxRateUpdatedAt?.slice(0, 10) ?? "",
    units: landing.units.map((u) => cardUnit(translated(u))),
    amenities: mergeRows(s.propertyAmenities, setTr?.propertyAmenities),
    power: { baseUsd: s.powerBaseUsd },
    discounts: s.discounts ?? [],
    // Per-unit availability: a booking with a unit blocks that unit; one without
    // a unit is a whole-property closure that blocks every unit.
    availability: buildAvailability(bookings),
    location: {
      heading: locTr?.heading ?? landing.location?.heading ?? "",
      addressLine: locTr?.addressLine ?? landing.location?.addressLine ?? "",
      distances: mergeRows(landing.location?.distances, locTr?.distances),
    },
  };
}

/** One fully-populated apartment for /apartments/[slug]. */
export async function getUnit(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<Unit | null> {
  const { data: raw } = await sanityFetch<
    | (RawUnit & {
        amenities?: { inside?: Amenity[]; building?: Amenity[] };
        terms?: Term[];
      })
    | null
  >({ query: unitQuery, params: { slug, locale } });
  if (!raw) return null;
  const u = translated(raw);

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
    deposits: u.deposits ?? [],
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
  // Slugs are language-neutral, but the query takes $locale — GROQ errors on an
  // undefined parameter, so pass the default rather than leaving it out.
  const { data } = await sanityFetch<{ units: { slug: string }[] }>({
    query: landingQuery,
    params: { locale: DEFAULT_LOCALE },
  });
  return data.units.map((u) => u.slug);
}
