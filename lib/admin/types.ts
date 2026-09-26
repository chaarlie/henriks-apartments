// Shapes shared between the admin server (reads/actions) and the client UI.

import type { AreaCaption } from "@/lib/common-area-captions";
import type { Locale } from "@/lib/locales";
import type { CommonAreaKind } from "@/lib/content";

export interface AmenityRow {
  label: string;
  included: boolean;
}
export interface SpaceRow {
  key: string;
  title: string;
  desc: string;
}
export interface TermRow {
  icon: string;
  title: string;
  desc: string;
}
export interface StatRow {
  value: string;
  label: string;
}
export interface DistanceRow {
  label: string;
  value: string;
}

export interface MediaImage {
  ref: string;
  url: string;
  alt: string;
  /**
   * The array key Sanity stores this image under, for gallery photos.
   *
   * Carried through the editor because translated alt text is matched to a
   * photo BY this key, never by position — so a save that invented a new key
   * would detach every translation from its picture. Empty for a photo just
   * added in the browser, which the server then keys on write.
   */
  key?: string;
}

export interface TourLinkRow {
  to: string;
  yaw: string;
}
/** Orientation fix for one panorama. Empty strings mean "no correction". */
export interface SphereCorrectionRow {
  pan: string;
  tilt: string;
  roll: string;
}

export interface TourStopRow {
  stopId: string;
  name: string;
  /** Supabase bucket object path, e.g. "101/101-living-room.JPG". */
  panorama: string;
  sphereCorrection: SphereCorrectionRow;
  links: TourLinkRow[];
}

/*
  ── Translations ────────────────────────────────────────────────────────────

  One interface per document type, carrying ONLY the fields lib/i18n/schema.ts
  declares translatable. That is the point: a shape that cannot hold a price or
  a slug is a shape that cannot fork one. Everything absent falls back to the
  English, field by field, in lib/sanity.server.ts.

  `sourceHash` is the fingerprint of the English this row was translated from.
  Compared against the document's `englishHash` below, it answers "has the
  English moved since someone last read this Spanish?" — the one question a
  half-translated site needs asked continuously.
*/

/** Marks every translation row: what English it was written against. */
export interface TranslationMeta {
  /** "" when the row predates fingerprints — shows as "no baseline". */
  sourceHash: string;
  /**
   * Written by the translation scripts and not yet read by a person.
   *
   * Deliberately separate from sourceHash. The hash answers "which English is
   * this Spanish made from", which is what catches a translation going stale;
   * this answers "has anyone looked at it". Folding the two together — by
   * leaving the hash off a machine pass — made every applied document look
   * permanently stale to i18n:extract, which then re-translated it on every run.
   */
  machine: boolean;
}

/** One apartment's prose in one language. Mirrors TYPES.unit. */
export interface UnitTranslation extends TranslationMeta {
  tagline: string;
  keywords: string;
  saleNote: string;
  chips: string[];
  /** Paragraphs joined with blank lines, like AdminUnit.about. */
  about: string;
  space: SpaceRow[];
  amenities: { inside: AmenityRow[]; building: AmenityRow[] };
  terms: TermRow[];
  coverAlt: string;
  /** Gallery alt text by image _key — never by position. */
  galleryAlts: Record<string, string>;
  /**
   * The bed configuration, e.g. "1 cama king".
   *
   * Flattened out of the row's `spec` object because it is the only subfield
   * that translates — area, baths and sleeps are a number and a unit, identical
   * in every language. See the note in lib/i18n/schema.ts.
   */
  beds: string;
}

/** The shared property prose. Mirrors TYPES.siteSettings. */
export interface SettingsTranslation extends TranslationMeta {
  /** Keyed by the source photo; omitted by editors that do not own captions. */
  commonAreas?: AreaCaption[];
  hostNote: string;
  stayNote: string;
  /** Positional: index i is tile i of the English list. */
  propertyAmenities: { title: string; desc: string }[];
}

/** The homepage cover. Mirrors TYPES.hero. */
export interface HeroTranslation extends TranslationMeta {
  eyebrow: string;
  headline: string;
  sub: string;
  backgroundAlt: string;
  stats: StatRow[];
}

/** "Getting around". Mirrors TYPES.location. */
export interface LocationTranslation extends TranslationMeta {
  heading: string;
  addressLine: string;
  distances: DistanceRow[];
}

/** Rows by language. A missing language simply has no row yet. */
export type Translations<T> = Partial<Record<Locale, T>>;

/** Every translatable document carries the fingerprint of its own English. */
export interface Translatable<T> {
  englishHash: string;
  i18n: Translations<T>;
}

export interface AdminUnit extends Translatable<UnitTranslation> {
  _id: string;
  slug: string;
  name: string;
  code: string;
  tagline: string;
  hidden: boolean;
  priceUsd: number;
  priceNightlyUsd: number;
  /** refundable deposit by length of stay */
  deposits: DepositRow[];
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string; beds: string };
  /** This apartment's room on the Booking.com listing, #RD… fragment included. */
  bookingUrl: string;
  chips: string[];
  keywords: string;
  /** also on the market — badge on the card + the homepage For sale section */
  forSale: boolean;
  /** asking price in USD; 0 means "price on request" */
  salePriceUsd: number;
  saleNote: string;
  /** Paragraphs joined with blank lines for the textarea editor. */
  about: string;
  space: SpaceRow[];
  amenities: { inside: AmenityRow[]; building: AmenityRow[] };
  terms: TermRow[];
  bookingCount: number;
  cover: MediaImage | null;
  gallery: MediaImage[];
  tour: TourStopRow[];
}

/** The homepage cover — new to /admin with the language work. */
export interface AdminHero extends Translatable<HeroTranslation> {
  eyebrow: string;
  headline: string;
  sub: string;
  /** YouTube id for the walkthrough — the same video in every language. */
  videoId: string;
  background: MediaImage | null;
  stats: StatRow[];
}

/** The shared address and distances — new to /admin with the language work. */
export interface AdminLocation extends Translatable<LocationTranslation> {
  heading: string;
  addressLine: string;
  distances: DistanceRow[];
}

export interface AdminBooking {
  _id: string;
  unitId: string | null;
  unit: string | null;
  start: string;
  end: string;
  status: "held" | "confirmed" | "cancelled";
  source: string;
  note: string;
  guest: { name: string; phone: string; email: string };
}

export interface UnitOption {
  _id: string;
  name: string;
}

/** Payload the client sends back to saveUnit. */
export interface AdminUnitInput {
  _id: string;
  name: string;
  code: string;
  tagline: string;
  slug: string;
  hidden: boolean;
  priceUsd: number;
  priceNightlyUsd: number;
  deposits: DepositRow[];
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string; beds: string };
  /** This apartment's room on the Booking.com listing, #RD… fragment included. */
  bookingUrl: string;
  chips: string[];
  keywords: string;
  forSale: boolean;
  salePriceUsd: number;
  saleNote: string;
  about: string;
  space: SpaceRow[];
  amenities: { inside: AmenityRow[]; building: AmenityRow[] };
  terms: TermRow[];
  cover: { ref: string; alt: string } | null;
  /** `key` carries each photo's existing array key so the save preserves it — see MediaImage. */
  gallery: { ref: string; alt: string; key?: string }[];
  tour: TourStopRow[];
}

/*
  Translation payloads: a document's translation shape minus everything the
  SERVER stamps — which is exactly TranslationMeta.

  Both of its fields are judgements the client must not get to make. A client
  that could set its own sourceHash could mark stale copy as current; one that
  could set its own `machine` flag could mark unread machine output as reviewed.
  Omitting `keyof TranslationMeta` rather than naming fields one by one keeps
  that true for whatever gets added to it later.
*/
export type UnitTranslationInput = Omit<UnitTranslation, keyof TranslationMeta>;
export type SettingsTranslationInput = Omit<SettingsTranslation, keyof TranslationMeta>;
export type HeroTranslationInput = Omit<HeroTranslation, keyof TranslationMeta>;
export type LocationTranslationInput = Omit<LocationTranslation, keyof TranslationMeta>;

/** Payload the client sends back to saveHero (the English). */
export interface AdminHeroInput {
  eyebrow: string;
  headline: string;
  sub: string;
  videoId: string;
  backgroundAlt: string;
  /**
   * The cover photo's asset ref, or null to leave whatever is there alone.
   * Only a ref that DIFFERS from the stored one replaces the image — see
   * saveHero, which otherwise patches the alt text alone so a hotspot or crop
   * set in Sanity Studio survives an edit made here.
   */
  background: { ref: string } | null;
  stats: StatRow[];
}

/** Payload the client sends back to saveLocation (the English). */
export interface AdminLocationInput {
  heading: string;
  addressLine: string;
  distances: DistanceRow[];
}

/** One "What's on site" tile on the homepage. `icon` is SVG path data. */
export interface PropertyAmenityRow {
  icon: string;
  title: string;
  desc: string;
}

/** One deposit step: from this many months, the deposit is this many dollars. */
export interface DepositRow {
  fromMonths: number;
  amountUsd: number;
}

export interface DiscountRow {
  months: number;
  /** percent off, e.g. 5 for 5% (stored in Sanity as 0.05) */
  percent: number;
}

/** The siteSettings singleton: property details + the homepage amenity tiles. */
/** One shared-area photo: the picture, the two lines over it, and its filter chip. */
export interface CommonAreaRow {
  /**
   * The photo's existing Sanity array key, carried through the editor so a save
   * does not mint a new one. Empty for a photo just added in the browser, which
   * the server then keys on write — the same rule as a unit's gallery.
   */
  key?: string;
  /** Asset reference, e.g. "image-abc123-1600x1067-jpg". */
  ref: string;
  /** A thumbnail URL for the editor. Never written back. */
  url: string;
  /** Short area name over the photo, e.g. "Sun deck". */
  label: string;
  /** The line under it, e.g. "A spot in the sun". */
  title: string;
  /** What the photo shows, for screen readers and Google. */
  alt: string;
  /** Drives the filter chips on the homepage band. */
  kind: CommonAreaKind;
}

export interface AdminSettings extends Translatable<SettingsTranslation> {
  propertyName: string;
  city: string;
  region: string;
  whatsappNumber: string;
  /** languages Henrik speaks, full names */
  languages: string[];
  /** year he took over the apartments, e.g. "2026" */
  ownerSince: string;
  /** typical WhatsApp reply, e.g. "< 1 h" */
  replyTime: string;
  /** the paragraph in "Who you're renting from" */
  hostNote: string;
  /** e.g. "3:00 PM" */
  checkIn: string;
  /** e.g. "12:00 PM" */
  checkOut: string;
  /** the friendly line under the times */
  stayNote: string;
  /**
   * The pool / lounge / gym / grounds photos, in the order the homepage band
   * shows them.
   */
  commonAreas: CommonAreaRow[];
  fxRate: number;
  internetMbps: number;
  /** yyyy-mm-dd the exchange rate last changed */
  fxRateAsOf: string;
  powerBaseUsd: number;
  discounts: DiscountRow[];
  amenities: PropertyAmenityRow[];
}

/** Payload the client sends back to saveProperty. */
export type AdminPropertyInput = Omit<
  AdminSettings,
  "fxRateAsOf" | "amenities" | "englishHash" | "i18n"
>;

/** Payload the client sends back to saveBooking. */
export interface AdminBookingInput {
  _id: string | null;
  unitId: string | null;
  start: string;
  end: string;
  status: "held" | "confirmed" | "cancelled";
  guest: { name: string; phone: string; email: string };
  note: string;
}
