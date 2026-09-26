"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { requireAdmin } from "@/lib/admin/session";
import { formerSlugs, toSlug } from "@/lib/slug";
import { extractDoc, sourceHash, type RawDoc } from "@/lib/i18n/fingerprint";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/locales";
import type {
  AdminUnitInput,
  AdminBookingInput,
  AdminPropertyInput,
  CommonAreaRow,
  AdminHeroInput,
  AdminLocationInput,
  PropertyAmenityRow,
  UnitTranslationInput,
  SettingsTranslationInput,
  HeroTranslationInput,
  LocationTranslationInput,
} from "@/lib/admin/types";

const key = () => randomUUID().replace(/-/g, "").slice(0, 12);

/**
 * Normalises an orientation angle for photo-sphere-viewer.
 *
 * Two traps, both from its `parseAngle`: a bare number means RADIANS (never what
 * someone typing into /admin means), and an unrecognised unit *throws*, which
 * takes the whole 360° tour down to the flat fallback. So stamp "deg" onto a
 * plain number, accept the spellings people actually type (°, spaces, "degrees"),
 * and return undefined for anything still unparseable so the caller can reject
 * it rather than store a value that breaks the viewer.
 */
function degrees(input: string | undefined): string | undefined {
  // Whitespace is tolerated only between the number and its unit — stripping it
  // everywhere would silently weld "20 30" into a perfectly valid "2030deg".
  const v = (input ?? "").trim().toLowerCase().replace(/[°˚]/g, "deg");
  if (!v) return undefined;
  const m = v.match(/^(-?\d+(?:\.\d+)?)\s*(deg|degs|degree|degrees|rad|rads|radian|radians)?$/);
  if (!m) return undefined;
  const unit = m[2]?.startsWith("rad") ? "rad" : "deg";
  return `${m[1]}${unit}`;
}

/** A YouTube id: exactly 11 characters of the URL-safe alphabet. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Reduces whatever lands in the walkthrough field to a bare YouTube id.
 *
 * VideoModal builds `embed/${videoId}`, so a pasted watch URL becomes
 * `embed/https://www.youtube.com/watch?v=...` — a dead player with nothing in
 * the console, the same silent shape as a mistyped hotspot id. Nobody has the
 * id to hand; they have the link. So accept the forms people actually paste and
 * return undefined for anything else, leaving the caller to reject it rather
 * than store an embed that cannot load.
 */
function youtubeId(input: string | undefined): string | undefined {
  const v = (input ?? "").trim();
  if (!v) return undefined;
  if (YOUTUBE_ID.test(v)) return v;
  const m = v.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : undefined;
}

/** Chips as they should be stored: trimmed, no blanks, no repeats. */
function cleanChips(chips: string[]): string[] {
  return [...new Set(chips.map((c) => c.trim()).filter(Boolean))];
}

function textToBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((para) => ({
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: key(), text: para, marks: [] }],
    }));
}

// The public pages are ISR — nudge them to rebuild after an edit.
function revalidateSite() {
  revalidatePath("/", "layout");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ── Translation rows ───────────────────────────────────────────────────────

  Every translation write lands in the document's own `i18n` array, on the
  PUBLISHED document, exactly like every other admin save. No drafts: the review
  gate that drafts used to provide is this editor — Henrik reads the Spanish
  beside the English and saves when it reads right.

  Two rules the writer enforces, both of which matter more than they look:

  1. The row is MERGED, not replaced. A row may hold fields this editor doesn't
     show (the SEO pair on siteSettings today, whatever is added later) and a
     wholesale replace would silently drop them.

  2. sourceHash is stamped by the SERVER from the current English, never sent by
     the client — a client that could choose its own fingerprint could mark copy
     as reviewed without anyone reading it.

  Stamping on every save means "saved in the editor" is what clears a stale
  badge. That is the intent: the editor shows the English beside the field being
  translated, so saving IS the act of confirming the Spanish against today's
  English.
*/

type I18nRow = Record<string, unknown> & { locale?: string };

async function writeTranslationRow(
  docId: string,
  type: string,
  locale: Locale,
  fields: Record<string, unknown>,
): Promise<void> {
  if (locale === DEFAULT_LOCALE) throw new Error("English is the document, not a translation row.");
  if (!isLocale(locale)) throw new Error(`"${locale}" is not a configured language.`);

  const client = getWriteClient();
  const doc = await client.getDocument(docId);
  if (!doc) throw new Error(`${docId} not found`);

  const rows = ((doc as RawDoc).i18n ?? []) as I18nRow[];
  const prior = rows.find((r) => r?.locale === locale) ?? {};

  /*
    Undefined means "I am not the editor for this field", not "clear it".

    Several screens write into the SAME row — the amenity tiles and the trust
    paragraph both live on siteSettings — and each sends only what it owns.
    Spreading an explicit undefined would overwrite, so one screen saving its
    half would silently blank the other's. Dropping them first is what makes the
    merge a merge.
  */
  const given = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  );

  const row = {
    ...prior,
    _type: `${type}Translation`,
    _key: locale,
    locale,
    ...given,
    // Last, so neither can be overridden by a caller's field map.
    sourceHash: sourceHash(extractDoc(type, doc as RawDoc)),
    // A person just read this and pressed Save — that is the whole definition.
    machine: false,
  };

  await client
    .patch(docId)
    .set({ i18n: [...rows.filter((r) => r?.locale !== locale), row] })
    .commit();
}

/** Wraps a translation write in the shared auth + revalidate + error shape. */
async function translationAction(
  docId: string,
  type: string,
  locale: Locale,
  fields: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await writeTranslationRow(docId, type, locale, fields);
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function saveUnit(input: AdminUnitInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    // A page address with a space or a capital breaks the apartment's URL.
    const slug = toSlug(input.slug) || toSlug(input.name);
    if (!slug)
      return { ok: false, error: "Give the apartment a page address (letters and numbers)." };
    /*
      One round trip for two questions: is this address free, and what address is
      this apartment moving away from.

      The clash check counts another apartment's FORMER addresses as taken, the
      same way the Studio slug field does. They still resolve — each one
      permanently redirects to whichever apartment owns it — so handing the same
      string to a second apartment would make one URL mean two pages.
    */
    const current = await getWriteClient().fetch<{
      clash: string | null;
      slug: string | null;
      previousSlugs: string[] | null;
    }>(
      `{
        "clash": *[_type == "unit" && _id != $id && ($slug in previousSlugs || slug.current == $slug)][0]._id,
        "slug": *[_id == $id][0].slug.current,
        "previousSlugs": *[_id == $id][0].previousSlugs
      }`,
      { id: input._id, slug },
    );
    if (current.clash)
      return { ok: false, error: `Another apartment already uses the page address “${slug}”.` };

    // The address it is leaving joins the list, so the link Henrik already sent
    // someone keeps working — see formerSlugs() for the rules and the redirect in
    // the apartment page for what consumes it.
    const previousSlugs = formerSlugs(current.slug, current.previousSlugs, slug);

    const badDeposit = input.deposits.some(
      (t) => !Number.isInteger(t.fromMonths) || t.fromMonths < 0 || !(t.amountUsd >= 0),
    );
    if (badDeposit)
      return {
        ok: false,
        error: "Each deposit needs whole months (0 or more) and an amount of $0 or more.",
      };
    const months = input.deposits.map((t) => t.fromMonths);
    if (new Set(months).size !== months.length)
      return { ok: false, error: "Two deposit rows start at the same number of months." };

    // An angle the viewer can't parse throws on load and drops the tour to the
    // flat fallback, so catch it here where it can still be explained.
    for (const s of input.tour) {
      for (const axis of ["pan", "tilt", "roll"] as const) {
        const raw = s.sphereCorrection?.[axis];
        if (raw?.trim() && !degrees(raw))
          return {
            ok: false,
            error: `“${raw}” isn’t a valid ${axis} angle on tour stop “${s.name || s.stopId}”. Use degrees, e.g. 20 or 20deg.`,
          };
      }
    }
    await getWriteClient()
      .patch(input._id)
      .set({
        name: input.name,
        code: input.code,
        tagline: input.tagline,
        slug: { _type: "slug", current: slug },
        previousSlugs,
        hidden: input.hidden,
        priceUsd: input.priceUsd,
        priceNightlyUsd: input.priceNightlyUsd,
        deposits: [...input.deposits]
          .sort((a, b) => a.fromMonths - b.fromMonths)
          .map((t) => ({ _key: key(), fromMonths: t.fromMonths, amountUsd: t.amountUsd })),
        availableFrom: input.availableFrom || undefined,
        spec: input.spec,
        /*
          Set only when there IS a link. `undefined` cannot clear a field:
          .set() is serialised as JSON, which drops undefined keys entirely, so
          it reads as "don't touch this" rather than "remove it". Emptying the
          box is handled by the unset below — and "" is not an option either,
          since Sanity's url type rejects it.
        */
        ...(input.bookingUrl.trim() ? { bookingUrl: input.bookingUrl.trim() } : {}),
        chips: cleanChips(input.chips),
        keywords: input.keywords,
        forSale: input.forSale,
        salePriceUsd: input.salePriceUsd || undefined,
        saleNote: input.saleNote || undefined,
        about: textToBlocks(input.about),
        space: input.space.map((s) => ({ _key: key(), ...s })),
        amenitiesOverride: {
          inside: input.amenities.inside.map((a) => ({
            _key: key(),
            _type: "amenityItem",
            ...a,
          })),
          building: input.amenities.building.map((a) => ({
            _key: key(),
            _type: "amenityItem",
            ...a,
          })),
        },
        termsOverride: input.terms.map((t) => ({ _key: key(), ...t })),
        coverImage: input.cover
          ? {
              _type: "image",
              asset: { _type: "reference", _ref: input.cover.ref },
              alt: input.cover.alt || undefined,
            }
          : undefined,
        /*
          Keep each photo's existing key. Translated alt text is matched to a
          photo by _key (see lib/sanity.server.ts), so minting fresh keys here
          would detach every language's alt text from its picture on the next
          save of the English — silently, because the site just falls back.
        */
        gallery: input.gallery.map((g) => ({
          _type: "image",
          _key: g.key || key(),
          asset: { _type: "reference", _ref: g.ref },
          alt: g.alt || undefined,
        })),
        tour: input.tour.map((s) => ({
          _key: key(),
          stopId: s.stopId,
          name: s.name,
          panorama: s.panorama,
          sphereCorrection: {
            pan: degrees(s.sphereCorrection?.pan),
            tilt: degrees(s.sphereCorrection?.tilt),
            roll: degrees(s.sphereCorrection?.roll),
          },
          links: s.links.map((l) => ({ _key: key(), to: l.to, yaw: l.yaw })),
        })),
      })
      // Emptying the box removes the field. Without this the old link simply
      // stayed, because the set above can only add or replace, never remove.
      .unset(input.bookingUrl.trim() ? [] : ["bookingUrl"])
      .commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

/**
 * One apartment's prose in one language.
 *
 * The field names differ from the editor's on purpose: a translation row stores
 * `termsOverride` and `amenitiesOverride`, mirroring the source document's own
 * names, because that is what rebuildDoc writes and what lib/sanity.server.ts
 * reads back.
 */
export async function saveUnitTranslation(
  unitId: string,
  locale: Locale,
  input: UnitTranslationInput,
): Promise<ActionResult> {
  return translationAction(unitId, "unit", locale, {
    tagline: input.tagline || undefined,
    keywords: input.keywords || undefined,
    saleNote: input.saleNote || undefined,
    /*
      Blanks are dropped, not stored.

      The editor seeds this array to the ENGLISH length with "" for every chip
      nobody has translated yet (see AdminApp), which is the right thing for an
      editor — an empty box to type into. Storing those blanks is not: a locale's
      chips replace the English wholesale, so saving three of eleven used to put
      eight empty strings on the Spanish page, rendering eight ticks with no text
      and giving React two children keyed "".
    */
    chips: cleanChips(input.chips).length ? cleanChips(input.chips) : undefined,

    about: input.about.trim() ? textToBlocks(input.about) : undefined,
    space: input.space.length ? input.space.map((s) => ({ _key: key(), ...s })) : undefined,
    amenitiesOverride: {
      inside: input.amenities.inside.map((a) => ({ _key: key(), _type: "amenityItem", ...a })),
      building: input.amenities.building.map((a) => ({ _key: key(), _type: "amenityItem", ...a })),
    },
    termsOverride: input.terms.length
      ? input.terms.map((t) => ({ _key: key(), ...t }))
      : undefined,
    coverAlt: input.coverAlt || undefined,
    /*
      Only `beds` — the rest of `spec` is a number and a unit, the same fact in
      every language, and lives on the apartment itself. Nested back into a
      `spec` object because that is the shape the translation row stores and
      lib/sanity.server.ts merges.

      Sent even when empty, unlike the `|| undefined` fields above. Undefined
      means "I am not the editor for this field" and writeTranslationRow drops
      it, which made clearing the Spanish silently keep the old translation. An
      empty string is a real answer — "there is no Spanish for this" — and the
      public merge reads it as a fall back to the English.
    */
    spec: { beds: input.beds.trim() },
    /*
      Alt text only — never a second copy of the image asset, and keyed by the
      photo's own _key so reordering the gallery cannot move Spanish alt text
      onto an English photo.
    */
    galleryAlts: Object.entries(input.galleryAlts)
      .filter(([, alt]) => alt.trim())
      .map(([k, alt]) => ({ _key: k, alt })),
  });
}

export async function setUnitHidden(
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await getWriteClient().patch(id).set({ hidden }).commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export type SaveBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveBooking(
  input: AdminBookingInput,
): Promise<SaveBookingResult> {
  try {
    await requireAdmin();
    if (!input.start || !input.end) return { ok: false, error: "Pick both dates." };
    if (input.end <= input.start)
      return { ok: false, error: "Check-out must be after check-in." };

    const id = input._id ?? `booking.${randomUUID()}`;
    await getWriteClient().createOrReplace({
      _id: id,
      _type: "booking",
      ...(input.unitId
        ? { unit: { _type: "reference", _ref: input.unitId } }
        : {}),
      startDate: input.start,
      endDate: input.end,
      status: input.status,
      source: "manual",
      note: input.note || undefined,
      guest: {
        name: input.guest.name || undefined,
        phone: input.guest.phone || undefined,
        email: input.guest.email || undefined,
      },
    });
    revalidateSite();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

// ── Shared settings (the siteSettings singleton) ─────────────────────────────
const SETTINGS_ID = "siteSettings";
const HERO_ID = "hero";
const LOCATION_ID = "location";

/**
 * The site prints "rate as of <date>" next to peso prices. Keep that date on the
 * document so saving the WhatsApp number or an amenity tile doesn't make an old
 * rate look freshly checked. A new rate gets today's date.
 */
async function rateAsOf(nextRate?: number): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const cur = await getWriteClient().fetch<{
    fxRate?: number;
    fxRateAsOf?: string;
    _updatedAt?: string;
  } | null>(`*[_id == $id][0]{fxRate, fxRateAsOf, _updatedAt}`, { id: SETTINGS_ID });
  if (nextRate !== undefined && nextRate !== cur?.fxRate) return today;
  return cur?.fxRateAsOf ?? cur?._updatedAt?.slice(0, 10) ?? today;
}

export async function saveAmenities(rows: PropertyAmenityRow[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const clean = rows.map((r) => ({
      icon: r.icon.trim(),
      title: r.title.trim(),
      desc: r.desc.trim(),
    }));
    if (clean.length === 0)
      return { ok: false, error: "Keep at least one amenity — the homepage section needs it." };
    const untitled = clean.findIndex((r) => !r.title);
    if (untitled >= 0) return { ok: false, error: `Amenity ${untitled + 1} needs a title.` };
    const noIcon = clean.find((r) => !r.icon);
    if (noIcon) return { ok: false, error: `Pick an icon for “${noIcon.title}”.` };

    await getWriteClient()
      .patch(SETTINGS_ID)
      .set({
        fxRateAsOf: await rateAsOf(),
        propertyAmenities: clean.map((r) => ({ _key: key(), ...r })),
      })
      .commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export type SavePropertyResult =
  | { ok: true; fxRateAsOf: string; commonAreas: CommonAreaRow[] }
  | { ok: false; error: string };

export async function saveProperty(input: AdminPropertyInput): Promise<SavePropertyResult> {
  try {
    await requireAdmin();
    const commonAreas = input.commonAreas.filter(c => c.ref).map(c => ({
      ...c, key: c.key || key(), label: c.label.trim(), title: c.title.trim(), alt: c.alt.trim(),
    }));
    if (new Set(commonAreas.map(c => c.key)).size !== commonAreas.length) {
      return { ok: false, error: "Each shared-area photo must have a unique key. Reload and try again." };
    }
    const whatsapp = input.whatsappNumber.replace(/\D/g, "");
    if (!input.propertyName.trim()) return { ok: false, error: "Add the property name." };
    if (whatsapp.length < 8 || whatsapp.length > 15)
      return {
        ok: false,
        error: "Enter the WhatsApp number with its country code — for example 1 809 555 0142.",
      };
    if (!(input.fxRate > 0 && input.fxRate < 1000))
      return { ok: false, error: "Enter the exchange rate as pesos per US dollar — for example 61." };
    // Printed straight into guest-facing copy ("50 Mbps fibre"), so a 0 or a
    // fraction would read as a broken promise rather than a blank field.
    if (!(Number.isInteger(input.internetMbps) && input.internetMbps > 0))
      return { ok: false, error: "Enter the internet speed in Mbps as a whole number — for example 50." };
    if (!(input.powerBaseUsd >= 0))
      return { ok: false, error: "The power estimate can’t be negative." };
    if (!input.checkIn.trim() || !input.checkOut.trim())
      return { ok: false, error: "Fill in both the check-in and check-out times." };
    const badDiscount = input.discounts.some(
      (d) => !Number.isInteger(d.months) || d.months < 1 || !(d.percent > 0 && d.percent <= 50),
    );
    if (badDiscount)
      return {
        ok: false,
        error: "Each discount needs whole months (1 or more) and a percent between 1 and 50.",
      };

    const fxRateAsOf = await rateAsOf(input.fxRate);
    await getWriteClient()
      .patch(SETTINGS_ID)
      .set({
        propertyName: input.propertyName.trim(),
        city: input.city.trim(),
        region: input.region.trim(),
        whatsappNumber: whatsapp,
        languages: input.languages.map((l) => l.trim()).filter(Boolean),
        ownerSince: input.ownerSince.trim(),
        replyTime: input.replyTime.trim(),
        hostNote: input.hostNote.trim(),
        checkIn: input.checkIn.trim(),
        checkOut: input.checkOut.trim(),
        stayNote: input.stayNote.trim(),
        fxRate: input.fxRate,
        internetMbps: input.internetMbps,
        fxRateAsOf,
        powerBaseUsd: input.powerBaseUsd,
        discounts: [...input.discounts]
          .sort((a, b) => a.months - b.months)
          .map((d) => ({ _key: key(), months: d.months, pct: d.percent / 100 })),
        /*
          Keep each photo's existing key, exactly as a unit's gallery does.
          Translated captions are rebuilt against `_key`, so minting fresh ones
          here would detach every language's wording from its picture on the
          next save of the English — silently, because the site just falls back.
        */
        commonAreas: commonAreas
          .map((c) => ({
            _type: "image",
            _key: c.key,
            asset: { _type: "reference", _ref: c.ref },
            label: c.label.trim() || undefined,
            title: c.title.trim() || undefined,
            alt: c.alt.trim() || undefined,
            kind: c.kind,
          })),
      })
      .commit();
    revalidateSite();
    return { ok: true, fxRateAsOf, commonAreas };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

/**
 * The shared prose in one language: the trust paragraph, the arrival note and
 * the amenity tiles.
 *
 * Tiles merge POSITIONALLY — index i is tile i of the English list — which is
 * how lib/sanity.server.ts reads them back. The icon never translates, so a
 * translated tile carries only a title and a description.
 */
export async function saveSettingsTranslation(
  locale: Locale,
  input: SettingsTranslationInput,
): Promise<ActionResult> {
  if (input.commonAreas && (
    input.commonAreas.some(c => !c._key || !/^[a-zA-Z0-9_-]+$/.test(c._key)) ||
    new Set(input.commonAreas.map(c => c._key)).size !== input.commonAreas.length
  )) return { ok: false, error: "Photo captions need unique photo keys. Reload before saving." };
  return translationAction(SETTINGS_ID, "siteSettings", locale, {
    commonAreas: input.commonAreas?.map(c => ({
      _key: c._key, label: c.label?.trim() ?? "", title: c.title?.trim() ?? "", alt: c.alt?.trim() ?? "",
    })),
    hostNote: input.hostNote || undefined,
    stayNote: input.stayNote || undefined,
    propertyAmenities: input.propertyAmenities.map((t) => ({
      _key: key(),
      title: t.title || undefined,
      desc: t.desc || undefined,
    })),
  });
}

/* ── Homepage cover and location ─────────────────────────────────────────────

  Both were Studio-only until the language work. They hold the copy the landing
  page opens with, which made them the one gap that would have left Henrik
  unable to fix a Spanish headline in the editor he uses for everything else.
*/

export async function saveHero(input: AdminHeroInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!input.headline.trim()) return { ok: false, error: "The homepage needs a headline." };

    // Say so now, rather than leaving a player that loads nothing on the
    // homepage. Clearing the field is still allowed — that just drops the video.
    const videoId = youtubeId(input.videoId);
    if (input.videoId.trim() && !videoId) {
      return {
        ok: false,
        error:
          "That does not look like a YouTube video — paste the link from the address bar, or the 11-character id.",
      };
    }

    const client = getWriteClient();
    const current = await client.getDocument(HERO_ID);
    const currentBackground = (current as RawDoc | undefined)?.background as
      | { asset?: { _ref?: string } }
      | undefined;
    const currentRef = currentBackground?.asset?._ref;
    const nextRef = input.background?.ref;
    const alt = input.backgroundAlt.trim() || undefined;

    /*
      A NEW photo replaces the whole object; the same photo patches the alt on
      its own.

      The difference matters: `background` carries the hotspot and crop, which
      are set in Sanity Studio and are properties of that particular image. A
      blanket `set({background})` on every save would silently discard them, and
      a deep `background.alt` patch onto a document with no background at all
      throws.
    */
    const replacingPhoto = Boolean(nextRef && nextRef !== currentRef);
    const backgroundPatch = replacingPhoto
      ? {
          background: {
            _type: "image",
            asset: { _type: "reference", _ref: nextRef },
            alt,
          },
        }
      : currentRef && alt
        ? { "background.alt": alt }
        : {};

    /*
      Emptying the description removes it.

      `{"background.alt": undefined}` cannot: .set() is serialised as JSON,
      which drops undefined keys, so it reads as "leave this alone" and the old
      description survives a deliberate clear. Same trap as bookingUrl in
      saveUnit. Skipped while replacing the photo, since that branch writes a
      whole new object which simply has no alt.
    */
    const clearAlt = !replacingPhoto && currentRef && !alt;

    await client
      .patch(HERO_ID)
      .set({
        eyebrow: input.eyebrow.trim() || undefined,
        headline: input.headline.trim(),
        sub: input.sub.trim() || undefined,
        videoId,
        stats: input.stats
          .filter((s) => s.value.trim() || s.label.trim())
          .map((s) => ({ _key: key(), value: s.value.trim(), label: s.label.trim() })),
        ...backgroundPatch,
      })
      .unset(clearAlt ? ["background.alt"] : [])
      .commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function saveHeroTranslation(
  locale: Locale,
  input: HeroTranslationInput,
): Promise<ActionResult> {
  return translationAction(HERO_ID, "hero", locale, {
    eyebrow: input.eyebrow || undefined,
    headline: input.headline || undefined,
    sub: input.sub || undefined,
    backgroundAlt: input.backgroundAlt || undefined,
    stats: input.stats.map((s) => ({ _key: key(), value: s.value, label: s.label })),
  });
}

export async function saveLocation(input: AdminLocationInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    await getWriteClient()
      .patch(LOCATION_ID)
      .set({
        heading: input.heading.trim() || undefined,
        addressLine: input.addressLine.trim() || undefined,
        distances: input.distances
          .filter((d) => d.label.trim() || d.value.trim())
          .map((d) => ({ _key: key(), label: d.label.trim(), value: d.value.trim() })),
      })
      .commit();
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function saveLocationTranslation(
  locale: Locale,
  input: LocationTranslationInput,
): Promise<ActionResult> {
  return translationAction(LOCATION_ID, "location", locale, {
    heading: input.heading || undefined,
    addressLine: input.addressLine || undefined,
    distances: input.distances.map((d) => ({ _key: key(), label: d.label, value: d.value })),
  });
}

export async function deleteBooking(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await getWriteClient().delete(id);
    revalidateSite();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
