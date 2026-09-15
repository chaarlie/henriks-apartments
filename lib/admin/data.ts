import "server-only";
import { getClient } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { extractDoc, sourceHash, type RawDoc } from "@/lib/i18n/fingerprint";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/locales";
import {
  adminUnitsQuery,
  adminBookingsQuery,
  adminUnitOptionsQuery,
  adminSettingsQuery,
  adminHeroQuery,
  adminLocationQuery,
} from "@/sanity/lib/adminQueries";
import type {
  AdminUnit,
  AdminBooking,
  AdminSettings,
  AdminHero,
  AdminLocation,
  UnitOption,
  AmenityRow,
  SpaceRow,
  TermRow,
  StatRow,
  DistanceRow,
  UnitTranslation,
  SettingsTranslation,
  HeroTranslation,
  LocationTranslation,
  Translations,
} from "@/lib/admin/types";

type Block = { _type?: string; children?: { text?: string }[] };
function blocksToText(blocks: Block[] | undefined): string {
  return (blocks ?? [])
    .filter((b) => b._type === "block")
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join("\n\n");
}

/* ── Translation rows ───────────────────────────────────────────────────────

  Each translatable document carries its languages in an `i18n` array. The admin
  wants them by language, and it wants the fingerprint of the CURRENT English
  beside them — the pair is what answers "has the English moved since anyone
  last read this Spanish?", which is the question a half-translated site needs
  asked continuously rather than at deploy time.
*/

type I18nRow = Record<string, unknown> & { locale?: string };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Rows indexed by language.
 *
 * A row whose locale is not a language this site publishes is skipped rather
 * than trusted: LOCALES is the source of truth, and a row left behind by a
 * language that was dropped should not resurface in the editor. English is
 * skipped too — it is the document itself, never a row.
 */
function byLocale<T>(
  i18n: I18nRow[] | undefined,
  map: (row: I18nRow) => T,
): Translations<T> {
  const out: Translations<T> = {};
  for (const row of i18n ?? []) {
    const l = row?.locale;
    if (typeof l !== "string" || l === DEFAULT_LOCALE) continue;
    if (!(LOCALES as readonly string[]).includes(l)) continue;
    out[l as Locale] = map(row);
  }
  return out;
}

/** The fingerprint of a document's current English. See lib/i18n/fingerprint.ts. */
const englishHashOf = (type: string, doc: RawDoc): string =>
  sourceHash(extractDoc(type, doc));

interface RawAdminUnit {
  _id: string;
  slug: string;
  name: string;
  code?: string;
  tagline?: string;
  hidden?: boolean;
  priceUsd?: number;
  priceNightlyUsd?: number;
  deposits?: { fromMonths?: number; amountUsd?: number }[];
  availableFrom?: string;
  spec?: { area?: string; bath?: string; sleeps?: string };
  chips?: string[];
  keywords?: string;
  forSale?: boolean;
  salePriceUsd?: number;
  saleNote?: string;
  about?: Block[];
  space?: SpaceRow[];
  coverImage?: { alt?: string; ref?: string };
  gallery?: { _key?: string; alt?: string; ref?: string }[];
  tour?: {
    stopId?: string;
    name?: string;
    panorama?: string;
    sphereCorrection?: { pan?: string; tilt?: string; roll?: string };
    links?: { to?: string; yaw?: string }[];
  }[];
  amenities?: { inside?: AmenityRow[]; building?: AmenityRow[] };
  terms?: TermRow[];
  i18n?: I18nRow[];
  bookingCount?: number;
}

/**
 * One apartment's prose in one language.
 *
 * The field names differ on purpose: a translation row stores `termsOverride`
 * and `amenitiesOverride` because rebuildDoc copies the source document's own
 * field names, while the editor calls them `terms` and `amenities`. Translating
 * between the two here keeps that detail out of the UI.
 */
function unitTranslation(row: I18nRow): UnitTranslation {
  const amen = (row.amenitiesOverride ?? {}) as {
    inside?: AmenityRow[];
    building?: AmenityRow[];
  };
  const alts = (row.galleryAlts ?? []) as { _key?: string; alt?: string }[];
  return {
    tagline: str(row.tagline),
    keywords: str(row.keywords),
    saleNote: str(row.saleNote),
    chips: (row.chips as string[]) ?? [],
    about: blocksToText(row.about as Block[] | undefined),
    space: ((row.space as SpaceRow[]) ?? []).map((s) => ({
      key: s.key ?? "",
      title: s.title ?? "",
      desc: s.desc ?? "",
    })),
    amenities: { inside: amen.inside ?? [], building: amen.building ?? [] },
    terms: (row.termsOverride as TermRow[]) ?? [],
    coverAlt: str(row.coverAlt),
    galleryAlts: Object.fromEntries(
      alts.filter((g) => g._key).map((g) => [g._key as string, g.alt ?? ""]),
    ),
    sourceHash: str(row.sourceHash),
    machine: row.machine === true,
  };
}

export async function getAdminUnits(): Promise<AdminUnit[]> {
  const units = await getClient().fetch<RawAdminUnit[]>(
    adminUnitsQuery,
    {},
    { cache: "no-store" },
  );
  return units.map((u) => ({
    _id: u._id,
    slug: u.slug,
    name: u.name,
    code: u.code ?? "",
    tagline: u.tagline ?? "",
    hidden: u.hidden ?? false,
    priceUsd: u.priceUsd ?? 0,
    priceNightlyUsd: u.priceNightlyUsd ?? 0,
    deposits: (u.deposits ?? [])
      .map((t) => ({ fromMonths: t.fromMonths ?? 0, amountUsd: t.amountUsd ?? 0 }))
      .sort((a, b) => a.fromMonths - b.fromMonths),
    availableFrom: u.availableFrom ?? "",
    spec: {
      area: u.spec?.area ?? "",
      bath: u.spec?.bath ?? "",
      sleeps: u.spec?.sleeps ?? "",
    },
    chips: u.chips ?? [],
    keywords: u.keywords ?? "",
    forSale: u.forSale ?? false,
    salePriceUsd: u.salePriceUsd ?? 0,
    saleNote: u.saleNote ?? "",
    about: blocksToText(u.about),
    space: u.space ?? [],
    amenities: {
      inside: u.amenities?.inside ?? [],
      building: u.amenities?.building ?? [],
    },
    terms: u.terms ?? [],
    bookingCount: u.bookingCount ?? 0,
    cover: u.coverImage?.ref
      ? {
          ref: u.coverImage.ref,
          alt: u.coverImage.alt ?? "",
          url: urlFor(u.coverImage.ref).width(480).height(300).fit("crop").url(),
        }
      : null,
    gallery: (u.gallery ?? [])
      .filter((g) => g.ref)
      .map((g) => ({
        ref: g.ref as string,
        alt: g.alt ?? "",
        url: urlFor(g.ref as string).width(300).height(200).fit("crop").url(),
      })),
    tour: (u.tour ?? []).map((s) => ({
      stopId: s.stopId ?? "",
      name: s.name ?? "",
      panorama: s.panorama ?? "",
      sphereCorrection: {
        pan: s.sphereCorrection?.pan ?? "",
        tilt: s.sphereCorrection?.tilt ?? "",
        roll: s.sphereCorrection?.roll ?? "",
      },
      links: (s.links ?? []).map((l) => ({ to: l.to ?? "", yaw: l.yaw ?? "" })),
    })),
    englishHash: englishHashOf("unit", u as unknown as RawDoc),
    i18n: byLocale(u.i18n, unitTranslation),
  }));
}

export async function getAdminBookings(): Promise<AdminBooking[]> {
  const rows = await getClient().fetch<
    {
      _id: string;
      _rev: string;
      holdExpiresAt?: string;
      notificationStatus?: string;
      startDate?: string;
      endDate?: string;
      status?: AdminBooking["status"];
      source?: string;
      note?: string;
      guest?: { name?: string; phone?: string; email?: string };
      unitId?: string | null;
      unit?: string | null;
    }[]
  >(adminBookingsQuery, {}, { cache: "no-store" });
  return rows.map((b) => ({
    _id: b._id,
    revision: b._rev,
    holdExpiresAt: b.holdExpiresAt,
    notificationStatus: b.notificationStatus,
    unitId: b.unitId ?? null,
    unit: b.unit ?? null,
    start: b.startDate ?? "",
    end: b.endDate ?? "",
    status: b.status ?? "confirmed",
    source: b.source ?? "manual",
    note: b.note ?? "",
    guest: {
      name: b.guest?.name ?? "",
      phone: b.guest?.phone ?? "",
      email: b.guest?.email ?? "",
    },
  }));
}

/** The shared property prose. Amenity tiles are merged positionally — index i is tile i. */
function settingsTranslation(row: I18nRow): SettingsTranslation {
  const tiles = (row.propertyAmenities ?? []) as { title?: string; desc?: string }[];
  return {
    hostNote: str(row.hostNote),
    stayNote: str(row.stayNote),
    propertyAmenities: tiles.map((t) => ({ title: t.title ?? "", desc: t.desc ?? "" })),
    sourceHash: str(row.sourceHash),
    machine: row.machine === true,
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const s = await getClient().fetch<
    | ({
        propertyName?: string;
        city?: string;
        region?: string;
        whatsappNumber?: string;
        languages?: string[];
        ownerSince?: string;
        replyTime?: string;
        hostNote?: string;
        checkIn?: string;
        checkOut?: string;
        stayNote?: string;
        fxRate?: number;
        fxRateAsOf?: string;
        powerBaseUsd?: number;
        discounts?: { months?: number; pct?: number }[];
        propertyAmenities?: { icon?: string; title?: string; desc?: string }[];
        i18n?: I18nRow[];
      } & RawDoc)
    | null
  >(adminSettingsQuery, {}, { cache: "no-store" });
  return {
    propertyName: s?.propertyName ?? "",
    city: s?.city ?? "",
    region: s?.region ?? "",
    whatsappNumber: s?.whatsappNumber ?? "",
    languages: s?.languages ?? [],
    ownerSince: s?.ownerSince ?? "",
    replyTime: s?.replyTime ?? "",
    hostNote: s?.hostNote ?? "",
    checkIn: s?.checkIn ?? "",
    checkOut: s?.checkOut ?? "",
    stayNote: s?.stayNote ?? "",
    fxRate: s?.fxRate ?? 0,
    fxRateAsOf: s?.fxRateAsOf?.slice(0, 10) ?? "",
    powerBaseUsd: s?.powerBaseUsd ?? 0,
    discounts: (s?.discounts ?? []).map((d) => ({
      months: d.months ?? 0,
      percent: Math.round((d.pct ?? 0) * 1000) / 10,
    })),
    amenities: (s?.propertyAmenities ?? []).map((a) => ({
      icon: a.icon ?? "",
      title: a.title ?? "",
      desc: a.desc ?? "",
    })),
    englishHash: s ? englishHashOf("siteSettings", s) : "",
    i18n: byLocale(s?.i18n, settingsTranslation),
  };
}

function heroTranslation(row: I18nRow): HeroTranslation {
  const stats = (row.stats ?? []) as { value?: string; label?: string }[];
  return {
    eyebrow: str(row.eyebrow),
    headline: str(row.headline),
    sub: str(row.sub),
    backgroundAlt: str(row.backgroundAlt),
    stats: stats.map((s) => ({ value: s.value ?? "", label: s.label ?? "" })),
    sourceHash: str(row.sourceHash),
    machine: row.machine === true,
  };
}

/** The homepage cover — the headline, the sub-copy and the three stat cards. */
export async function getAdminHero(): Promise<AdminHero> {
  const h = await getClient().fetch<
    | ({
        eyebrow?: string;
        headline?: string;
        sub?: string;
        videoId?: string;
        background?: { alt?: string; ref?: string };
        stats?: StatRow[];
        i18n?: I18nRow[];
      } & RawDoc)
    | null
  >(adminHeroQuery, {}, { cache: "no-store" });
  return {
    eyebrow: h?.eyebrow ?? "",
    headline: h?.headline ?? "",
    sub: h?.sub ?? "",
    videoId: h?.videoId ?? "",
    background: h?.background?.ref
      ? {
          ref: h.background.ref,
          alt: h.background.alt ?? "",
          url: urlFor(h.background.ref).width(480).height(270).fit("crop").url(),
        }
      : null,
    stats: (h?.stats ?? []).map((s) => ({ value: s.value ?? "", label: s.label ?? "" })),
    englishHash: h ? englishHashOf("hero", h) : "",
    i18n: byLocale(h?.i18n, heroTranslation),
  };
}

function locationTranslation(row: I18nRow): LocationTranslation {
  const rows = (row.distances ?? []) as { label?: string; value?: string }[];
  return {
    heading: str(row.heading),
    addressLine: str(row.addressLine),
    distances: rows.map((d) => ({ label: d.label ?? "", value: d.value ?? "" })),
    sourceHash: str(row.sourceHash),
    machine: row.machine === true,
  };
}

/** "Getting around" — the shared address and the distances under it. */
export async function getAdminLocation(): Promise<AdminLocation> {
  const l = await getClient().fetch<
    | ({
        heading?: string;
        addressLine?: string;
        distances?: DistanceRow[];
        i18n?: I18nRow[];
      } & RawDoc)
    | null
  >(adminLocationQuery, {}, { cache: "no-store" });
  return {
    heading: l?.heading ?? "",
    addressLine: l?.addressLine ?? "",
    distances: (l?.distances ?? []).map((d) => ({
      label: d.label ?? "",
      value: d.value ?? "",
    })),
    englishHash: l ? englishHashOf("location", l) : "",
    i18n: byLocale(l?.i18n, locationTranslation),
  };
}

export async function getUnitOptions(): Promise<UnitOption[]> {
  return getClient().fetch<UnitOption[]>(
    adminUnitOptionsQuery,
    {},
    { cache: "no-store" },
  );
}
