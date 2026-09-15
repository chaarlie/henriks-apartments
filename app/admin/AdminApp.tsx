"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { panoramaUrl } from "@/lib/panorama";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { urlFor } from "@/sanity/lib/image";
import { signOut } from "@/lib/admin/login";
import { toSlug } from "@/lib/slug";
import { shrinkImage } from "@/lib/image-shrink";
import {
  saveUnit,
  saveUnitTranslation,
  setUnitHidden,
  saveBooking,
  deleteBooking,
  saveAmenities,
  saveProperty,
  saveSettingsTranslation,
  saveHero,
  saveHeroTranslation,
  saveLocation,
  saveLocationTranslation,
} from "@/lib/admin/actions";
import { LOCALES, DEFAULT_LOCALE, LANGUAGE_NAME, type Locale } from "@/lib/locales";
import type {
  AdminUnit,
  AdminBooking,
  AdminSettings,
  AdminHero,
  AdminLocation,
  AdminPropertyInput,
  PropertyAmenityRow,
  DepositRow,
  UnitOption,
  AmenityRow,
  SpaceRow,
  TermRow,
  StatRow,
  DistanceRow,
  MediaImage,
  TourStopRow,
  AdminBookingInput,
  UnitTranslation,
  SettingsTranslation,
  HeroTranslation,
  LocationTranslation,
} from "@/lib/admin/types";

const BRAND = "Henrik Sosúa";

/** The deposit a stay of this many whole months pays — mirrors depositFor in lib/dates. */
function depositAt(rows: DepositRow[], months: number): number {
  const tier = rows
    .filter((t) => months >= t.fromMonths)
    .reduce<DepositRow | null>((best, t) => (!best || t.fromMonths > best.fromMonths ? t : best), null);
  return Math.max(0, tier?.amountUsd ?? 0);
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** The host refused the request body outright — only a smaller file will go. */
class TooLargeError extends Error {}

/**
 * Uploads one file to /admin/api/upload → { ref, url, alt }.
 * Errors can arrive as plain text (a 413 from the platform is literally
 * "Request Entity Too Large"), so never assume the body is JSON.
 */
async function uploadImage(file: File): Promise<MediaImage> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/admin/api/upload", { method: "POST", body });
  const text = await res.text();

  let payload: MediaImage | { error?: string } | null = null;
  try {
    payload = JSON.parse(text) as MediaImage | { error?: string };
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status === 413) throw new TooLargeError("Too large to send whole");
    if (res.status === 401) throw new Error("Signed out — sign in again and retry.");
    const named = payload && "error" in payload ? payload.error : undefined;
    throw new Error(named ?? `Upload failed (${res.status})`);
  }
  if (!payload || !("ref" in payload)) throw new Error("The server didn’t return the photo details.");
  return payload;
}

/**
 * Shrink before sending above this, rather than after a refusal.
 *
 * A proxied request body — /admin/:path* all is — gets buffered and then
 * TRUNCATED at next.config.ts's proxyClientMaxBodySize, so a photo near that
 * ceiling arrives unparseable instead of being refused cleanly. Sending
 * something smaller beats depending on which error a given host produces at its
 * own limit, which differs between `next dev` and a serverless deploy.
 */
const SHRINK_ABOVE_BYTES = 9_000_000;

/**
 * Full quality first, for everything small enough that the original is likely
 * to survive the trip. Anything bigger is shrunk up front, and a photo the host
 * still refuses is shrunk again — so originals survive wherever they're allowed.
 */
async function uploadOne(file: File): Promise<{ image: MediaImage; resized: boolean }> {
  let candidate = file;
  let resized = false;

  // Anything the browser can't decode (HEIC, typically) comes back unchanged;
  // it goes as-is and the server answers for it.
  if (file.size > SHRINK_ABOVE_BYTES) {
    const smaller = await shrinkImage(file);
    if (smaller !== file) {
      candidate = smaller;
      resized = true;
    }
  }

  try {
    return { image: await uploadImage(candidate), resized };
  } catch (e) {
    if (!(e instanceof TooLargeError)) throw e;
    const smaller = await shrinkImage(candidate);
    if (smaller === candidate) throw new Error("Too large to upload, and the browser couldn’t resize it.");
    return { image: await uploadImage(smaller), resized: true };
  }
}

/** Upload three at a time, keeping whatever succeeds. */
async function uploadMany(
  files: File[],
  onProgress: (done: number) => void,
): Promise<{ uploaded: MediaImage[]; failed: { file: File; reason: string }[]; resized: number }> {
  const uploaded: MediaImage[] = [];
  const failed: { file: File; reason: string }[] = [];
  let resized = 0;
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < files.length) {
      const file = files[next++];
      try {
        const result = await uploadOne(file);
        uploaded.push(result.image);
        if (result.resized) resized++;
      } catch (e) {
        failed.push({ file, reason: e instanceof Error ? e.message : "Upload failed" });
      } finally {
        onProgress(++done);
      }
    }
  }

  await Promise.all([worker(), worker(), worker()]);
  return { uploaded, failed, resized };
}

/*
  "hero" and "location" are new with the language work. Both documents were
  Studio-only, which meant the copy the homepage opens with — the headline, the
  sub-copy, the stat cards, the getting-around distances — was the one thing
  Henrik could not fix here, in either language.
*/
type View = "apartments" | "bookings" | "amenities" | "property" | "hero" | "location";

const TABS = ["Overview", "Media", "Content", "Amenities", "Terms", "Share"] as const;
type Tab = (typeof TABS)[number];

// Icons for amenity tiles and house rules, by the name Henrik picks (SVG path
// data) — mirrors ICON in lib/content.ts.
const ICONS: Record<string, string> = {
  Pool: "M4 20a8 8 0 0 1 16 0M4 14h16M8 14V6a2 2 0 0 1 4 0",
  "Wi-Fi": "M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01",
  Power: "M13 2 3 14h7l-1 8 10-12h-7z",
  "Gate / entrance": "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  House: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  Location: "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zM12 9h.01",
  Tick: "M20 7 9 18l-5-5M3 21h18",
  Water: "M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z",
  Calendar: "M16 2v4M8 2v4M3 10h18M3 4h18v18H3z",
  Money: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  "No smoking": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4.9 4.9l14.2 14.2",
};

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

// Line icons in the site's style (replaces the emoji nav).
const NAV_ICON = {
  apartments: <Svg><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>,
  amenities: <Svg><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></Svg>,
  bookings: <Svg><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>,
  property: <Svg><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></Svg>,
  hero: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m21 16-5-5-4 4-2-2-4 4" /></Svg>,
  location: <Svg><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="1.2" /></Svg>,
};

function Sw({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`sw ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
    />
  );
}

export default function AdminApp({
  units: initUnits,
  bookings: initBookings,
  unitOptions,
  settings: initSettings,
  hero: initHero,
  location: initLocation,
  adminName,
}: {
  units: AdminUnit[];
  bookings: AdminBooking[];
  unitOptions: UnitOption[];
  settings: AdminSettings;
  hero: AdminHero;
  location: AdminLocation;
  adminName: string;
}) {
  const [units, setUnits] = useState(initUnits);
  const [settings, setSettings] = useState(initSettings);
  const [bookings, setBookings] = useState(initBookings);
  const [hero, setHero] = useState(initHero);
  const [location, setLocation] = useState(initLocation);
  const [view, setView] = useState<View>("apartments");
  const [selectedId, setSelectedId] = useState(initUnits[0]?._id ?? "");
  const [tab, setTab] = useState<Tab>("Overview");
  const [listSearch, setListSearch] = useState("");

  /*
    The language being edited, for every view at once.

    Deliberately NOT remembered between visits. A persisted language means
    opening the admin and editing Spanish in the belief it is English — which is
    the one mistake this whole feature exists to prevent. It resets to English
    on every load; switching is one click away.
  */
  const [lang, setLang] = useState<Locale>(DEFAULT_LOCALE);
  const translating = lang !== DEFAULT_LOCALE;

  /*
    How much still needs someone's eyes, in the language being edited.

    This has to live here, beside the switch, because an untranslated page is
    invisible from the outside: the site falls back to English field by field
    and reads perfectly well. Nothing about looking at /es tells you a document
    was never translated — which is exactly how eight of them sat unpublished
    without anyone noticing. A number next to the language is the prompt.
  */
  const translatable = [
    ...units.map((u) => [u.englishHash, u.i18n[lang]] as const),
    [hero.englishHash, hero.i18n[lang]] as const,
    [location.englishHash, location.i18n[lang]] as const,
    [settings.englishHash, settings.i18n[lang]] as const,
  ];
  const needsReview = translating
    ? translatable.filter(
        ([englishHash, row]) =>
          transStatus(englishHash, row?.sourceHash, row?.machine).pill !== "pub",
      ).length
    : 0;

  const selected = units.find((u) => u._id === selectedId) ?? null;
  const rows = units.filter((u) =>
    `${u.name} ${u.code}`.toLowerCase().includes(listSearch.toLowerCase()),
  );

  function onUnitSaved(updated: AdminUnit) {
    setUnits((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
  }

  /*
    Bookings are guest records, not content — lib/i18n/schema.ts has no entry
    for them and never will. Leaving the tab reachable in Spanish would promise
    an edit that has nowhere to go, so it hides, and a switch away from it lands
    somewhere that does translate.
  */
  function switchLang(next: Locale) {
    setLang(next);
    if (next !== DEFAULT_LOCALE && view === "bookings") setView("apartments");
  }

  const noList = view !== "apartments";

  return (
    <div className={`app ${noList ? "no-list" : ""}`}>
      {/* Sidebar — a top bar on phones */}
      <aside className="side" aria-label="Admin navigation">
        <div className="brand">
          <span className="mark" aria-hidden />
          <span className="brand-name">
            {BRAND}
            <small>Content studio</small>
          </span>
        </div>

        {LOCALES.length > 1 && (
          <>
            <div className="grp">Language</div>
            <div className="langsw" role="group" aria-label="Editing language">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={lang === l ? "active" : ""}
                  aria-pressed={lang === l}
                  onClick={() => switchLang(l)}
                >
                  {LANGUAGE_NAME[l]}
                </button>
              ))}
            </div>
            {translating && (
              <p className={`langnote ${needsReview ? "work" : ""}`} role="status">
                {needsReview === 0
                  ? `All ${translatable.length} up to date`
                  : `${needsReview} of ${translatable.length} need review`}
              </p>
            )}
          </>
        )}

        <div className="grp">Content</div>
        <NavItem icon={NAV_ICON.apartments} label="Apartments" count={units.length} active={view === "apartments"} onClick={() => setView("apartments")} />
        <NavItem icon={NAV_ICON.hero} label="Homepage cover" active={view === "hero"} onClick={() => setView("hero")} />
        <NavItem icon={NAV_ICON.location} label="Getting around" active={view === "location"} onClick={() => setView("location")} />
        <NavItem icon={NAV_ICON.amenities} label="Amenities" count={settings.amenities.length} active={view === "amenities"} onClick={() => setView("amenities")} />

        {!translating && (
          <>
            <div className="grp">Booking</div>
            <NavItem icon={NAV_ICON.bookings} label="Bookings" count={bookings.length} active={view === "bookings"} onClick={() => setView("bookings")} />
          </>
        )}

        <div className="grp">Settings</div>
        <NavItem icon={NAV_ICON.property} label="Property details" active={view === "property"} onClick={() => setView("property")} />

        <div className="foot">
          <span className="dot" aria-hidden />
          <span className="who">{adminName}</span>
          <form action={signOut} className="signout">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Document list (apartments only; hidden on phones — see .m-switch) */}
      {view === "apartments" && (
        <section className="list" aria-label="Apartments">
          <div className="top">
            <h2>Apartments</h2>
            <div className="search">
              <Svg><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
              <input
                placeholder="Search apartments…"
                aria-label="Search apartments"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="rows">
            {rows.map((u) => (
              <button
                key={u._id}
                type="button"
                className={`row ${u._id === selectedId ? "active" : ""}`}
                aria-current={u._id === selectedId ? "true" : undefined}
                onClick={() => setSelectedId(u._id)}
              >
                <span
                  className="thumb"
                  style={u.cover ? { backgroundImage: `url(${u.cover.url})` } : undefined}
                  aria-hidden
                >
                  {!u.cover && <span>{u.name.charAt(0)}</span>}
                </span>
                <span className="rmeta">
                  <span className="rname">{u.name}</span>
                  <span className="rsub">
                    {[u.code, `$${u.priceUsd.toLocaleString("en-US")}/mo`, u.spec.sleeps]
                      .filter(Boolean)
                      .map((s, i) => (
                        <span key={i}>{i > 0 && " · "}{s}</span>
                      ))}
                  </span>
                </span>
                <span className={`pill ${u.hidden ? "draft" : "pub"}`}>
                  {u.hidden ? "Hidden" : "Live"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Editor / views */}
      <main className="editor">
        {view === "apartments" && units.length > 0 && (
          <div className="m-switch">
            <label className="fl" htmlFor="m-unit">Apartment</label>
            <select id="m-unit" className="ctrl" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {units.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}{u.hidden ? " (hidden)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/*
          Every editor below keeps its form in useState(initial), so the key
          carries the language: without it, switching to Español would leave the
          English text sitting in the fields, one save away from overwriting the
          translation with it.
        */}
        {view === "apartments" &&
          (selected ? (
            <ApartmentEditor
              key={`${selected._id}-${lang}`}
              unit={selected}
              lang={lang}
              tab={tab}
              onTab={setTab}
              onSaved={onUnitSaved}
            />
          ) : (
            <div className="ed-body">
              <div className="placeholder-view">
                <h2>No apartments</h2>
              </div>
            </div>
          ))}

        {view === "hero" && (
          <HeroView key={lang} hero={hero} lang={lang} onSaved={setHero} />
        )}

        {view === "location" && (
          <LocationView key={lang} location={location} lang={lang} onSaved={setLocation} />
        )}

        {view === "bookings" && (
          <BookingsView
            bookings={bookings}
            setBookings={setBookings}
            unitOptions={unitOptions}
          />
        )}

        {view === "amenities" && (
          <AmenitiesView
            key={lang}
            settings={settings}
            lang={lang}
            onSaved={setSettings}
          />
        )}

        {view === "property" && (
          <PropertyView
            key={lang}
            initial={settings}
            lang={lang}
            onSaved={(saved) => setSettings((s) => ({ ...s, ...saved }))}
          />
        )}
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`navitem ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={label}
      onClick={onClick}
    >
      {icon}
      <span className="label">{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  );
}

// ── Apartment editor ─────────────────────────────────────────────────────────
function ApartmentEditor({
  unit,
  lang,
  tab,
  onTab,
  onSaved,
}: {
  unit: AdminUnit;
  lang: Locale;
  tab: Tab;
  onTab: (t: Tab) => void;
  onSaved: (u: AdminUnit) => void;
}) {
  const translating = lang !== DEFAULT_LOCALE;
  const tr: UnitTranslation | undefined = unit.i18n[lang];
  const status = transStatus(unit.englishHash, tr?.sourceHash, tr?.machine);

  const [d, setD] = useState<AdminUnit>(unit);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [chipDraft, setChipDraft] = useState("");

  /*
    The translation being edited.

    Every list is seeded to the ENGLISH length, because translations pair with
    the English by position (rooms, rules, highlights, amenity lines) or by key
    (gallery alt text). Seeding from the English rather than from whatever the
    row happens to hold is what keeps the two lists in step when someone adds a
    room in English before anyone has translated it.
  */
  const [t, setT] = useState<UnitTranslation>(() => ({
    tagline: tr?.tagline ?? "",
    keywords: tr?.keywords ?? "",
    saleNote: tr?.saleNote ?? "",
    about: tr?.about ?? "",
    chips: unit.chips.map((_, i) => tr?.chips[i] ?? ""),
    space: unit.space.map((s, i) => ({
      key: s.key,
      title: tr?.space[i]?.title ?? "",
      desc: tr?.space[i]?.desc ?? "",
    })),
    amenities: {
      inside: unit.amenities.inside.map((a, i) => ({
        label: tr?.amenities.inside[i]?.label ?? "",
        included: a.included,
      })),
      building: unit.amenities.building.map((a, i) => ({
        label: tr?.amenities.building[i]?.label ?? "",
        included: a.included,
      })),
    },
    terms: unit.terms.map((x, i) => ({
      icon: x.icon,
      title: tr?.terms[i]?.title ?? "",
      desc: tr?.terms[i]?.desc ?? "",
    })),
    coverAlt: tr?.coverAlt ?? "",
    galleryAlts: Object.fromEntries(
      unit.gallery
        .filter((g) => g.key)
        .map((g) => [g.key as string, tr?.galleryAlts[g.key as string] ?? ""]),
    ),
    sourceHash: tr?.sourceHash ?? "",
    machine: tr?.machine ?? false,
  }));

  const set = <K extends keyof AdminUnit>(k: K, v: AdminUnit[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setSpec = (k: keyof AdminUnit["spec"], v: string) =>
    setD((p) => ({ ...p, spec: { ...p.spec, [k]: v } }));
  const tset = <K extends keyof UnitTranslation>(k: K, v: UnitTranslation[K]) =>
    setT((p) => ({ ...p, [k]: v }));

  async function doSave() {
    setSaving(true);
    setMsg(null);

    if (translating) {
      const res = await saveUnitTranslation(unit._id, lang, {
        tagline: t.tagline,
        keywords: t.keywords,
        saleNote: t.saleNote,
        about: t.about,
        chips: t.chips,
        space: t.space,
        amenities: t.amenities,
        terms: t.terms,
        coverAlt: t.coverAlt,
        galleryAlts: t.galleryAlts,
      });
      setSaving(false);
      if (!res.ok) {
        setMsg(`Error: ${res.error}`);
        return;
      }
      // The server stamps the English fingerprint we already hold, so the
      // "needs review" badge clears here without a reload.
      onSaved({
        ...unit,
        i18n: {
          ...unit.i18n,
          [lang]: { ...t, sourceHash: unit.englishHash, machine: false },
        },
      });
      setMsg("Saved · live on site within a minute");
      return;
    }

    const res = await saveUnit({
      _id: d._id,
      name: d.name,
      code: d.code,
      tagline: d.tagline,
      slug: d.slug,
      hidden: d.hidden,
      priceUsd: Number(d.priceUsd),
      priceNightlyUsd: Number(d.priceNightlyUsd),
      deposits: d.deposits,
      availableFrom: d.availableFrom,
      spec: d.spec,
      chips: d.chips,
      keywords: d.keywords,
      forSale: d.forSale,
      salePriceUsd: Number(d.salePriceUsd),
      saleNote: d.saleNote,
      about: d.about,
      space: d.space,
      amenities: d.amenities,
      terms: d.terms,
      cover: d.cover ? { ref: d.cover.ref, alt: d.cover.alt } : null,
      // `key` rides along so the save keeps each photo's array key — translated
      // alt text is matched to a photo by it.
      gallery: d.gallery.map((g) => ({ ref: g.ref, alt: g.alt, key: g.key })),
      tour: d.tour,
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Saved · live on site within a minute");
      onSaved(d);
    } else {
      setMsg(`Error: ${res.error}`);
    }
  }

  async function toggleHidden() {
    const next = !d.hidden;
    set("hidden", next);
    const res = await setUnitHidden(d._id, next);
    if (res.ok) onSaved({ ...d, hidden: next });
    else {
      set("hidden", !next);
      setMsg(`Error: ${res.error}`);
    }
  }

  const liveStatus = (
    <>
      <i className={d.hidden ? "is-hidden" : ""} aria-hidden />
      <span>{d.hidden ? "Hidden from site" : "Live on site"}</span>
    </>
  );

  return (
    <>
      <div className="ed-bar">
        <span className="crumb">
          Apartments / <b>{d.name}</b>
          {translating && ` · ${LANGUAGE_NAME[lang]}`}
        </span>
        <span className="status">{liveStatus}</span>
        <div className="ed-actions">
          <button type="button" className="btn primary" onClick={doSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {/* Hiding an apartment hides it in every language, so it stays English-only. */}
          {!translating && (
            <button type="button" className="btn" onClick={toggleHidden}>
              {d.hidden ? "Unhide" : "Hide"}
            </button>
          )}
        </div>
      </div>

      <div className="ed-body">
        <div className="doc-title">
          <div className="big">
            <div className="code">{d.code || "—"}</div>
            <input
              className="title"
              aria-label="Apartment name"
              value={d.name}
              disabled={translating}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <span className={`pill ${translating ? status.pill : d.hidden ? "draft" : "pub"}`}>
            {translating ? status.text : d.hidden ? "Hidden" : "Live"}
          </span>
        </div>

        <StaleNotice show={translating && status.pill === "stale"} />

        {msg && (
          <div className={`notice ${msg.startsWith("Error") ? "err" : "ok"}`} role="status">
            {msg}
          </div>
        )}

        <div className="tabs" role="tablist" aria-label="Apartment sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`ed-tab-${t}`}
              aria-selected={tab === t}
              aria-controls="ed-panel"
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => onTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="ed-panel" aria-labelledby={`ed-tab-${tab}`}>
          {tab === "Overview" && (
            <>
              <div className="card">
                <h3>Basics</h3>
                <p className="hint">Shown on the apartment card and the top of the apartment page.</p>
                <div className="grid2">
                  <Field label="Name" req>
                    <input className="ctrl" value={d.name} disabled={translating} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <Field label="Unit code">
                    <input className="ctrl" value={d.code} disabled={translating} onChange={(e) => set("code", e.target.value)} />
                  </Field>
                </div>
                <Field label="Tagline">
                  <input
                    className="ctrl"
                    value={translating ? t.tagline : d.tagline}
                    onChange={(e) =>
                      translating ? tset("tagline", e.target.value) : set("tagline", e.target.value)
                    }
                  />
                  {translating && <Ref value={unit.tagline} />}
                </Field>
                <div className={`grid2 ${translating ? "locked" : ""}`}>
                  <Field label="Page address" opt="(the link guests open)">
                    <div className="prefix">
                      <span>/apartments/</span>
                      <input
                        value={d.slug}
                        aria-label="Page address"
                        disabled={translating}
                        onChange={(e) => set("slug", e.target.value)}
                        onBlur={() => set("slug", toSlug(d.slug) || toSlug(d.name))}
                      />
                    </div>
                    <p className="field-note">
                      {translating
                        ? "One address per apartment, shared by every language."
                        : toSlug(d.slug) || toSlug(d.name)
                          ? `Saves as /apartments/${toSlug(d.slug) || toSlug(d.name)} — no spaces or capitals.`
                          : "Needs letters or numbers."}
                    </p>
                  </Field>
                  <Field label="Available from">
                    <input
                      className="ctrl"
                      type="date"
                      value={d.availableFrom}
                      disabled={translating}
                      onChange={(e) => set("availableFrom", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="card">
                <h3>Pricing</h3>
                <p className="hint">In US dollars (the site also shows pesos). Stays under 28 nights bill nightly, longer stays monthly.</p>
                <div className={`grid2 ${translating ? "locked" : ""}`}>
                  <Field label="Monthly rent (USD)" req>
                    <div className="prefix">
                      <span>$</span>
                      <input
                        type="number"
                        aria-label="Monthly rent in US dollars"
                        value={d.priceUsd}
                        disabled={translating}
                        onChange={(e) => set("priceUsd", Number(e.target.value))}
                      />
                    </div>
                  </Field>
                  <Field label="Nightly rate (USD)" req>
                    <div className="prefix">
                      <span>$</span>
                      <input
                        type="number"
                        aria-label="Nightly rate in US dollars"
                        value={d.priceNightlyUsd}
                        disabled={translating}
                        onChange={(e) => set("priceNightlyUsd", Number(e.target.value))}
                      />
                    </div>
                  </Field>
                </div>
              </div>

              <div className="card">
                <h3>Deposit</h3>
                <p className="hint">
                  Refundable, added on top of the estimate for this apartment. The row with the highest months
                  the stay reaches is the one that applies — use 0 months to cover short nightly stays, and $0
                  wherever you don’t want a deposit.
                </p>
                {d.deposits.map((row, i) => (
                  <div className={`disc-row ${translating ? "locked" : ""}`} key={i}>
                    <Field label="Stays from">
                      <div className="prefix">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          aria-label={`Deposit ${i + 1}: from months`}
                          value={row.fromMonths}
                          disabled={translating}
                          onChange={(e) =>
                            set("deposits", d.deposits.map((x, j) => (j === i ? { ...x, fromMonths: Number(e.target.value) } : x)))
                          }
                        />
                        <span className="after">months</span>
                      </div>
                    </Field>
                    <Field label="Deposit">
                      <div className="prefix">
                        <span>$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          aria-label={`Deposit ${i + 1}: amount in US dollars`}
                          value={row.amountUsd}
                          disabled={translating}
                          onChange={(e) =>
                            set("deposits", d.deposits.map((x, j) => (j === i ? { ...x, amountUsd: Number(e.target.value) } : x)))
                          }
                        />
                      </div>
                    </Field>
                    {!translating && (
                      <button type="button" className="btn ghost" onClick={() => set("deposits", d.deposits.filter((_, j) => j !== i))}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {d.deposits.length === 0 && (
                  <p className="field-note" style={{ marginBottom: 12 }}>
                    No deposit — guests pay only the rent and the metered power.
                  </p>
                )}
                {!translating && (
                  <button
                    type="button"
                    className="addrow"
                    onClick={() => set("deposits", [...d.deposits, { fromMonths: 0, amountUsd: 0 }])}
                  >
                    ＋ Add deposit step
                  </button>
                )}
                <p className="field-note">
                  {([
                    ["A 2-week stay", 0],
                    ["A 3-month stay", 3],
                    ["A 12-month stay", 12],
                  ] as [string, number][])
                    .map(([label, m]) => `${label} pays ${usd(depositAt(d.deposits, m))}`)
                    .join(" · ")}
                </p>
              </div>

              <div className="card">
                <h3>Specs &amp; highlights</h3>
                <p className="hint">Size, baths and sleeps show on the card and the page. Highlights show on the apartment card and page.</p>
                <div className={`grid3 ${translating ? "locked" : ""}`}>
                  <Field label="Area">
                    <input className="ctrl" value={d.spec.area} disabled={translating} onChange={(e) => setSpec("area", e.target.value)} />
                  </Field>
                  <Field label="Bathrooms">
                    <input className="ctrl" value={d.spec.bath} disabled={translating} onChange={(e) => setSpec("bath", e.target.value)} />
                  </Field>
                  <Field label="Sleeps">
                    <input className="ctrl" value={d.spec.sleeps} disabled={translating} onChange={(e) => setSpec("sleeps", e.target.value)} />
                  </Field>
                </div>
                {translating ? (
                  /*
                    Highlights pair with the English by position — one box per
                    English chip — so the Spanish cannot drift to a different
                    number of them.
                  */
                  <Field label="Highlights">
                    {t.chips.map((c, i) => (
                      <div className="field" key={i}>
                        <input
                          className="ctrl"
                          aria-label={`Highlight ${i + 1}`}
                          value={c}
                          onChange={(e) => tset("chips", t.chips.map((x, j) => (j === i ? e.target.value : x)))}
                        />
                        <Ref value={unit.chips[i] ?? ""} />
                      </div>
                    ))}
                  </Field>
                ) : (
                  <Field label="Highlights" opt="(press Enter to add)">
                    <div className="tags">
                      {d.chips.map((c, i) => (
                        <span className="tag" key={i}>
                          {c}
                          <button type="button" aria-label={`Remove ${c}`} onClick={() => set("chips", d.chips.filter((_, j) => j !== i))}>
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        placeholder="Add highlight…"
                        aria-label="Add highlight"
                        value={chipDraft}
                        onChange={(e) => setChipDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && chipDraft.trim()) {
                            e.preventDefault();
                            set("chips", [...d.chips, chipDraft.trim()]);
                            setChipDraft("");
                          }
                        }}
                      />
                    </div>
                  </Field>
                )}
                <Field label="Search words" opt="(helps guests find it with the search box)">
                  <textarea
                    className="ctrl"
                    aria-label="Search words"
                    value={translating ? t.keywords : d.keywords}
                    onChange={(e) =>
                      translating ? tset("keywords", e.target.value) : set("keywords", e.target.value)
                    }
                  />
                  {translating && <Ref value={unit.keywords} />}
                </Field>
              </div>

              <div className="card">
                <h3>Also for sale</h3>
                <p className="hint">
                  Turn this on to put a “For sale” badge on the apartment card and list it in the For sale section
                  on the homepage. The section is always on the homepage — this decides what it lists.
                </p>
                <div className="switch-row">
                  <span className="fl">This apartment is for sale</span>
                  {translating ? (
                    <span className={`pill ${d.forSale ? "pub" : "draft"}`}>
                      {d.forSale ? "For sale" : "Not for sale"}
                    </span>
                  ) : (
                    <Sw on={d.forSale} label="This apartment is for sale" onClick={() => set("forSale", !d.forSale)} />
                  )}
                </div>
                {d.forSale && (
                  <>
                    <Field label="Asking price (USD)" opt="(leave 0 for “price on request”)">
                      <div className={`prefix ${translating ? "locked" : ""}`}>
                        <span>$</span>
                        <input
                          type="number"
                          min="0"
                          aria-label="Asking price in US dollars"
                          value={d.salePriceUsd}
                          disabled={translating}
                          onChange={(e) => set("salePriceUsd", Number(e.target.value))}
                        />
                      </div>
                    </Field>
                    <Field label="Sale note" opt="(one line, shown with the price)">
                      <input
                        className="ctrl"
                        aria-label="Sale note"
                        placeholder="Sold furnished · rental history available"
                        value={translating ? t.saleNote : d.saleNote}
                        onChange={(e) =>
                          translating ? tset("saleNote", e.target.value) : set("saleNote", e.target.value)
                        }
                      />
                      {translating && <Ref value={unit.saleNote} />}
                    </Field>
                  </>
                )}
              </div>
            </>
          )}

          {tab === "Media" && (
            <>
              <MediaCard
                cover={d.cover}
                gallery={d.gallery}
                onCover={(cover) => set("cover", cover)}
                onGallery={(gallery) => set("gallery", gallery)}
                translating={translating}
                alts={{ cover: t.coverAlt, gallery: t.galleryAlts }}
                onAlts={(a) => {
                  tset("coverAlt", a.cover);
                  tset("galleryAlts", a.gallery);
                }}
              />
              {/*
                The 360° tour is not in lib/i18n/schema.ts — a panorama and its
                orientation are the same in every language, and stop names ride
                on the panorama itself.
              */}
              {!translating && <TourCard tour={d.tour} onChange={(tour) => set("tour", tour)} />}
            </>
          )}

          {tab === "Content" && (
            <>
              <div className="card">
                <h3>About this apartment</h3>
                <p className="hint">One paragraph per blank line. The first paragraph is also the description when the link is shared.</p>
                <Field label="">
                  <textarea
                    className="ctrl"
                    aria-label="About this apartment"
                    style={{ minHeight: 160 }}
                    value={translating ? t.about : d.about}
                    onChange={(e) =>
                      translating ? tset("about", e.target.value) : set("about", e.target.value)
                    }
                  />
                  {translating && <Ref value={unit.about} />}
                </Field>
              </div>

              {translating ? (
                /*
                  Rooms pair with the English by position, so translating cannot
                  add or remove one. The room NAME is not translated either —
                  lib/i18n/schema.ts lists only title and desc for `space`.
                */
                <div className="card">
                  <h3>The space</h3>
                  <p className="hint">Each room’s short value and description, with the English underneath.</p>
                  {t.space.map((row, i) => (
                    <div className="arr-item locked" key={i}>
                      <div className="arr-inner">
                        <div className="grid2">
                          <Field label="Room">
                            <input className="ctrl" aria-label={`Room ${i + 1}`} value={unit.space[i]?.key ?? ""} disabled />
                          </Field>
                          <Field label="Value">
                            <input
                              className="ctrl"
                              aria-label={`Room ${i + 1} value`}
                              value={row.title}
                              onChange={(e) =>
                                tset("space", t.space.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))
                              }
                            />
                            <Ref value={unit.space[i]?.title ?? ""} />
                          </Field>
                        </div>
                        <Field label="Description">
                          <input
                            className="ctrl"
                            aria-label={`Room ${i + 1} description`}
                            value={row.desc}
                            onChange={(e) =>
                              tset("space", t.space.map((r, j) => (j === i ? { ...r, desc: e.target.value } : r)))
                            }
                          />
                          <Ref value={unit.space[i]?.desc ?? ""} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ArrayEditor<SpaceRow>
                  title="The space"
                  hint="One block per room: the room name, a short value (for example “Full” or “En-suite”) and a description."
                  rows={d.space}
                  onChange={(rows) => set("space", rows)}
                  blank={{ key: "", title: "", desc: "" }}
                  render={(row, upd) => (
                    <>
                      <div className="grid2">
                        <Field label="Room"><input className="ctrl" placeholder="Kitchen" value={row.key} onChange={(e) => upd({ ...row, key: e.target.value })} /></Field>
                        <Field label="Value"><input className="ctrl" placeholder="Full" value={row.title} onChange={(e) => upd({ ...row, title: e.target.value })} /></Field>
                      </div>
                      <Field label="Description"><input className="ctrl" value={row.desc} onChange={(e) => upd({ ...row, desc: e.target.value })} /></Field>
                    </>
                  )}
                  addLabel="＋ Add room"
                />
              )}
            </>
          )}

          {tab === "Amenities" && (
            <div className="card">
              <h3>What this place offers</h3>
              <p className="hint">
                {translating
                  ? "The wording of each line. Whether it’s included is a fact about the building — change that in English."
                  : "Switch off anything that isn’t included — it shows with a cross on the page."}
              </p>
              <div className="grid2">
                <AmenityColumn
                  label="Inside"
                  rows={translating ? t.amenities.inside : d.amenities.inside}
                  locked={translating}
                  refs={unit.amenities.inside}
                  onChange={(inside) =>
                    translating
                      ? tset("amenities", { ...t.amenities, inside })
                      : set("amenities", { ...d.amenities, inside })
                  }
                />
                <AmenityColumn
                  label="Building & connectivity"
                  rows={translating ? t.amenities.building : d.amenities.building}
                  locked={translating}
                  refs={unit.amenities.building}
                  onChange={(building) =>
                    translating
                      ? tset("amenities", { ...t.amenities, building })
                      : set("amenities", { ...d.amenities, building })
                  }
                />
              </div>
            </div>
          )}

          {tab === "Terms" &&
            (translating ? (
              /*
                Rules pair with the English by position, so translating cannot
                add or remove one — and the icon is the same picture in every
                language.
              */
              <div className="card">
                <h3>Terms &amp; house rules</h3>
                <p className="hint">The wording of each rule, with the English underneath.</p>
                {t.terms.map((row, i) => (
                  <div className="arr-item locked" key={i}>
                    <div className="arr-inner">
                      <div className="grid3">
                        <Field label="Icon">
                          <span className="iconbox" aria-hidden>
                            {row.icon && <Svg><path d={row.icon} /></Svg>}
                          </span>
                        </Field>
                        <div style={{ gridColumn: "span 2" }}>
                          <Field label="Title">
                            <input
                              className="ctrl"
                              aria-label={`Rule ${i + 1} title`}
                              value={row.title}
                              onChange={(e) =>
                                tset("terms", t.terms.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))
                              }
                            />
                            <Ref value={unit.terms[i]?.title ?? ""} />
                          </Field>
                        </div>
                      </div>
                      <Field label="Description">
                        <input
                          className="ctrl"
                          aria-label={`Rule ${i + 1} description`}
                          value={row.desc}
                          onChange={(e) =>
                            tset("terms", t.terms.map((r, j) => (j === i ? { ...r, desc: e.target.value } : r)))
                          }
                        />
                        <Ref value={unit.terms[i]?.desc ?? ""} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ArrayEditor<TermRow>
                title="Terms & house rules"
                hint="One block per rule: an icon, a title and a description."
                rows={d.terms}
                onChange={(rows) => set("terms", rows)}
                blank={{ icon: ICONS.Calendar, title: "", desc: "" }}
                render={(row, upd) => (
                  <>
                    <div className="grid3">
                      <Field label="Icon">
                        <IconSelect label="Icon" value={row.icon} onChange={(icon) => upd({ ...row, icon })} />
                      </Field>
                      <div style={{ gridColumn: "span 2" }}>
                        <Field label="Title"><input className="ctrl" value={row.title} onChange={(e) => upd({ ...row, title: e.target.value })} /></Field>
                      </div>
                    </div>
                    <Field label="Description"><input className="ctrl" value={row.desc} onChange={(e) => upd({ ...row, desc: e.target.value })} /></Field>
                  </>
                )}
                addLabel="＋ Add rule"
              />
            ))}

          {/* Share composes an English caption and link for social — not content. */}
          {tab === "Share" && !translating && <SharePanel unit={unit} />}
        </div>

        <div className="rail">
          <div className="st status">{liveStatus}</div>
          <div className="meta">
            {d.bookingCount} booking{d.bookingCount === 1 ? "" : "s"} ·{" "}
            <a href={`/apartments/${unit.slug}`} target="_blank" rel="noopener noreferrer">View page ↗</a>
            <br />
            Document ID <b>{d._id}</b>
          </div>
          <div className="rowbtns">
            <button type="button" className="btn primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn" onClick={toggleHidden}>
              {d.hidden ? "Unhide" : "Hide"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  req,
  opt,
  children,
}: {
  label: string;
  req?: boolean;
  opt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      {label && (
        <label className="fl">
          {label} {req && <span className="req">*</span>}
          {opt && <span className="opt"> {opt}</span>}
        </label>
      )}
      {children}
    </div>
  );
}

// ── Promote & share ─────────────────────────────────────────────────────────
const noopSubscribe = () => () => {};

function defaultCaption(u: AdminUnit, url: string): string {
  const facts = [u.spec.area, u.spec.sleeps].filter(Boolean).join(" · ");
  const price = [
    u.priceUsd ? `from $${u.priceUsd.toLocaleString("en-US")}/month` : "",
    u.priceNightlyUsd ? `$${u.priceNightlyUsd}/night` : "",
  ]
    .filter(Boolean)
    .join(" or ");
  return [
    `${u.name}${u.tagline ? ` — ${u.tagline}` : ""}`,
    [facts, price].filter(Boolean).join(" · "),
    "Book direct with Henrik on WhatsApp.",
    url,
    "#Sosúa #DominicanRepublic #monthlyrental",
  ]
    .filter(Boolean)
    .join("\n");
}

function SharePanel({ unit }: { unit: AdminUnit }) {
  const url = absoluteUrl(`/apartments/${unit.slug}`);
  const [caption, setCaption] = useState(() => defaultCaption(unit, url));
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);
  // The phone's share sheet (Instagram, Messages, …) — only where the browser has one.
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  const description = (unit.about.split(/\n{2,}/)[0] ?? unit.tagline).trim();
  const shortDescription = description.length > 150 ? `${description.slice(0, 147).trimEnd()}…` : description;
  const preview = unit.cover ? urlFor(unit.cover.ref).width(840).height(440).fit("crop").url() : null;

  async function copy(text: string, what: "link" | "caption") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(what);
    window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 2200);
  }

  // Instagram doesn't accept links in posts: copy the caption and hand over the cover photo.
  async function instagram() {
    await copy(caption, "caption");
    if (!unit.cover) return;
    const a = document.createElement("a");
    a.href = urlFor(unit.cover.ref).width(2000).forceDownload(`${unit.slug}.jpg`).url();
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: `${unit.name} · ${BRAND}`, text: caption, url });
    } catch {
      // cancelled — nothing to do
    }
  }

  return (
    <div className="card">
      <h3>Promote this apartment</h3>
      <p className="hint">Send the apartment page to people or post it. The preview shows how the link looks once it’s posted.</p>

      {unit.hidden && (
        <div className="notice err" role="status" style={{ marginTop: 0, marginBottom: 16 }}>
          This apartment is hidden, so the link shows “page not found” until you unhide it.
        </div>
      )}

      <div className="promote">
        <div>
          <div className="field">
            <label className="fl" htmlFor="share-link">Link</label>
            <div className="copyrow">
              <input id="share-link" className="ctrl" value={url} readOnly onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={`btn ${copied === "link" ? "done" : ""}`} onClick={() => copy(url, "link")}>
                {copied === "link" ? "Copied ✓" : "Copy link"}
              </button>
            </div>
          </div>

          <div className="share-btns">
            <a className="sbtn wa" href={`https://wa.me/?text=${encodeURIComponent(caption)}`} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4z" /></svg>
              WhatsApp
            </a>
            <a className="sbtn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" className="fb" aria-hidden><path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V11H7v3h2.6v8H13z" /></svg>
              Facebook
            </a>
            <button type="button" className="sbtn" onClick={instagram}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ig" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>
              Instagram
            </button>
            {canNativeShare && (
              <button type="button" className="sbtn" onClick={nativeShare}>
                <Svg><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></Svg>
                More apps…
              </button>
            )}
            <a className="sbtn" href={`/apartments/${unit.slug}`} target="_blank" rel="noopener noreferrer">
              <Svg><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></Svg>
              Open page
            </a>
          </div>

          <div className="field share-cap">
            <label className="fl" htmlFor="share-caption">Caption / post text</label>
            <textarea id="share-caption" className="ctrl" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <div className="caprow">
              <button type="button" className={`btn ghost ${copied === "caption" ? "done" : ""}`} onClick={() => copy(caption, "caption")}>
                {copied === "caption" ? "Caption copied ✓" : "Copy caption"}
              </button>
              <button type="button" className="linkish" onClick={() => setCaption(defaultCaption(unit, url))}>
                Reset caption
              </button>
            </div>
          </div>
          <p className="og-note">
            WhatsApp sends the caption with the link. Facebook shares the link and shows the preview. Instagram doesn’t
            allow links in posts, so “Instagram” copies the caption and downloads the cover photo for you to post.
          </p>
        </div>

        <div>
          <span className="fl">Link preview</span>
          <div className="og">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="img" src={preview} alt="" />
            ) : (
              <div className="img empty">Add a cover photo in Media</div>
            )}
            <div className="body">
              <div className="dom">{new URL(SITE_URL).host}</div>
              <div className="ttl">{unit.name} · {BRAND}</div>
              {shortDescription && <div className="desc">{shortDescription}</div>}
            </div>
          </div>
          <p className="og-note">Uses the saved page — the name, the first “About” paragraph and the cover photo. Save first if you just changed them.</p>
        </div>
      </div>
    </div>
  );
}

/** Translated alt text: the cover's, and each gallery photo's by its array key. */
type AltEdits = { cover: string; gallery: Record<string, string> };

function MediaCard({
  cover,
  gallery,
  onCover,
  onGallery,
  translating = false,
  alts,
  onAlts,
}: {
  cover: MediaImage | null;
  gallery: MediaImage[];
  onCover: (c: MediaImage | null) => void;
  onGallery: (g: MediaImage[]) => void;
  /**
   * Translating. The photos themselves never translate — only what they are
   * described as, which is what a screen reader reads out and what Google
   * indexes. So uploading, removing and reordering are English-only.
   */
  translating?: boolean;
  alts?: AltEdits;
  onAlts?: (a: AltEdits) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<{ file: File; reason: string }[]>([]);
  const [resized, setResized] = useState(0);

  async function handleCover(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      onCover((await uploadOne(file)).image);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // Whatever uploads is kept, even when some photos fail.
  async function addPhotos(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    setFailed([]);
    setResized(0);
    setProgress({ done: 0, total: files.length });
    const { uploaded, failed: fails, resized: shrunk } = await uploadMany(files, (done) =>
      setProgress({ done, total: files.length }),
    );
    if (uploaded.length) onGallery([...gallery, ...uploaded]);
    setFailed(fails);
    setResized(shrunk);
    setProgress(null);
    setBusy(false);
  }

  return (
    <div className="card">
      <h3>Photos</h3>
      <p className="hint">
        The cover photo leads the apartment card and the shared link; the gallery fills the apartment page.
        Photos keep their original size and quality — only one the server refuses outright is resized to fit.
      </p>
      {resized > 0 && (
        <p className="field-note" style={{ marginBottom: 12 }}>
          {resized} photo{resized === 1 ? " was" : "s were"} too large to send whole, so {resized === 1 ? "it was" : "they were"}{" "}
          uploaded slightly smaller. Everything else kept its original quality.
        </p>
      )}
      {progress && (
        <p className="upload-progress" role="status">
          Uploading {progress.done} of {progress.total}…
        </p>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      {failed.length > 0 && (
        <div className="upload-failed" role="alert">
          <b>
            {failed.length} photo{failed.length === 1 ? "" : "s"} didn’t upload
          </b>
          <ul>
            {failed.map(({ file, reason }, i) => (
              <li key={`${file.name}-${i}`}>
                {file.name} — {reason}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => addPhotos(failed.map((f) => f.file))}
          >
            Try these again
          </button>
        </div>
      )}

      <div className="field">
        <span className="fl">Cover photo <span className="req">*</span></span>
        <label className="cover" style={cover ? { backgroundImage: `url(${cover.url})` } : undefined}>
          {!cover && !translating && <span className="ph">⤒ Tap to upload a photo</span>}
          {!translating && (
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleCover(e.target.files?.[0])}
            />
          )}
        </label>
        {cover && (
          <div className="cover-alt">
            <input
              className="ctrl"
              placeholder="Describe the photo (for screen readers and Google)"
              aria-label="Cover photo description"
              value={translating ? (alts?.cover ?? "") : cover.alt}
              onChange={(e) =>
                translating
                  ? onAlts?.({ cover: e.target.value, gallery: alts?.gallery ?? {} })
                  : onCover({ ...cover, alt: e.target.value })
              }
            />
            {!translating && (
              <button type="button" className="btn ghost" onClick={() => onCover(null)}>Remove</button>
            )}
          </div>
        )}
        {translating && cover && <Ref value={cover.alt} />}
      </div>

      <div className="field">
        <span className="fl">Gallery <span className="opt">({gallery.length} photos)</span></span>
        {translating ? (
          /*
            One description per photo, keyed by the photo's own array key — the
            same key lib/sanity.server.ts matches on, so reordering the gallery
            in English can never move a Spanish description onto another picture.
          */
          <>
            <p className="hint">
              What each photo shows. The photos themselves are the same in every language.
            </p>
            {gallery.map((g, i) => (
              <div className="arr-item" key={g.key ?? g.ref + i}>
                <div className="arr-inner">
                  <div
                    className="pano-thumb"
                    style={{
                      backgroundImage: `url(${g.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      height: 120,
                    }}
                    aria-hidden
                  />
                  <Field label={`Photo ${i + 1} description`}>
                    <input
                      className="ctrl"
                      aria-label={`Photo ${i + 1} description`}
                      value={g.key ? (alts?.gallery[g.key] ?? "") : ""}
                      disabled={!g.key}
                      onChange={(e) =>
                        g.key &&
                        onAlts?.({
                          cover: alts?.cover ?? "",
                          gallery: { ...(alts?.gallery ?? {}), [g.key]: e.target.value },
                        })
                      }
                    />
                    <Ref value={g.alt} />
                  </Field>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="gal">
            {gallery.map((g, i) => (
              <div className="g" key={g.ref + i} style={{ backgroundImage: `url(${g.url})` }}>
                <button
                  type="button"
                  className="x"
                  aria-label="Remove photo"
                  onClick={() => onGallery(gallery.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <label className="add">
              ＋<span>Add photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={busy}
                onChange={(e) => {
                  addPhotos(Array.from(e.target.files ?? []));
                  e.target.value = ""; // let the same files be picked again after a failure
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function TourCard({
  tour,
  onChange,
}: {
  tour: TourStopRow[];
  onChange: (t: TourStopRow[]) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/admin/api/panoramas")
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        setOptions(j.panoramas ?? []);
        if (j.error) setHint(j.error);
      })
      .catch(() => setHint("Couldn’t list the bucket — type paths manually."));
    return () => {
      live = false;
    };
  }, []);

  const upd = (i: number, next: TourStopRow) =>
    onChange(tour.map((s, j) => (j === i ? next : s)));

  /*
    Hotspot targets are chosen, not typed. A link to a Stop ID that doesn't
    exist — a typo, a leading space, a stop since renamed — makes
    photo-sphere-viewer throw and drops the entire tour to a flat image, which
    is a lot to pay for one character.
  */
  const stopIds = tour.map((s) => s.stopId).filter(Boolean);

  return (
    <div className="card">
      <h3>360° tour</h3>
      <p className="hint">
        Each stop is a panorama from the Supabase bucket. Pick a file (or paste
        its path). Hotspots link one stop to another by its Stop ID, at a yaw
        angle. {hint && <b>{hint}</b>}
      </p>

      {tour.map((stop, i) => (
        <div className="arr-item" key={i}>
          <button type="button" className="del" onClick={() => onChange(tour.filter((_, j) => j !== i))}>
            Remove
          </button>
          <div className="arr-inner">
            <div className="grid2">
              <Field label="Stop ID" opt="(e.g. living)">
                <input className="ctrl" value={stop.stopId} onChange={(e) => upd(i, { ...stop, stopId: e.target.value })} />
              </Field>
              <Field label="Stop name">
                <input className="ctrl" value={stop.name} onChange={(e) => upd(i, { ...stop, name: e.target.value })} />
              </Field>
            </div>
            <Field label="Panorama (bucket path)">
              {options.length > 0 && (
                <select
                  className="ctrl"
                  value={options.includes(stop.panorama) ? stop.panorama : ""}
                  onChange={(e) => upd(i, { ...stop, panorama: e.target.value })}
                  style={{ marginBottom: 8 }}
                >
                  <option value="">— pick from bucket —</option>
                  {options.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
              <input
                className="ctrl"
                value={stop.panorama}
                placeholder="101/101-living-room.JPG"
                onChange={(e) => upd(i, { ...stop, panorama: e.target.value })}
              />
            </Field>
            {stop.panorama && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={panoramaUrl(stop.panorama)} alt="" className="pano-thumb" />
            )}
            <span className="fl" style={{ marginTop: 14 }}>Orientation</span>
            <p className="hint">
              Straightens a crooked or mis-aimed panorama. Pan turns it left/right,
              tilt aims up/down, roll levels the horizon. Leave blank for no
              correction — a plain number is read as degrees.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(["pan", "tilt", "roll"] as const).map((axis) => (
                <Field key={axis} label={axis[0].toUpperCase() + axis.slice(1)} opt='(e.g. "30deg")'>
                  <input
                    className="ctrl"
                    value={stop.sphereCorrection?.[axis] ?? ""}
                    placeholder="0deg"
                    onChange={(e) =>
                      upd(i, {
                        ...stop,
                        sphereCorrection: {
                          ...(stop.sphereCorrection ?? { pan: "", tilt: "", roll: "" }),
                          [axis]: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            <span className="fl" style={{ marginTop: 14 }}>Hotspots</span>
            {stop.links.map((l, li) => (
              <div className="grid2" key={li} style={{ alignItems: "end" }}>
                <Field label="Links to Stop ID">
                  <select
                    className="ctrl"
                    value={l.to}
                    onChange={(e) => upd(i, { ...stop, links: stop.links.map((x, k) => (k === li ? { ...x, to: e.target.value } : x)) })}
                  >
                    <option value="">— pick a stop —</option>
                    {stopIds
                      .filter((id) => id !== stop.stopId)
                      .map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    {/* Whatever is already saved stays visible even when it
                        matches no stop, so a broken link can be seen and fixed
                        rather than silently reset to blank. */}
                    {l.to && !stopIds.includes(l.to) && (
                      <option value={l.to}>{l.to} — no such stop</option>
                    )}
                  </select>
                </Field>
                <Field label="Yaw" opt='(e.g. "30deg")'>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="ctrl" value={l.yaw} onChange={(e) => upd(i, { ...stop, links: stop.links.map((x, k) => (k === li ? { ...x, yaw: e.target.value } : x)) })} />
                    <button type="button" className="btn ghost" aria-label="Remove hotspot" onClick={() => upd(i, { ...stop, links: stop.links.filter((_, k) => k !== li) })}>×</button>
                  </div>
                </Field>
              </div>
            ))}
            <button type="button" className="addrow" onClick={() => upd(i, { ...stop, links: [...stop.links, { to: "", yaw: "0deg" }] })}>
              ＋ Add hotspot
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="addrow"
        onClick={() =>
          onChange([
            ...tour,
            {
              stopId: "",
              name: "",
              panorama: "",
              sphereCorrection: { pan: "", tilt: "", roll: "" },
              links: [],
            },
          ])
        }
      >
        ＋ Add tour stop
      </button>
    </div>
  );
}

function AmenityColumn({
  label,
  rows,
  onChange,
  locked = false,
  refs,
}: {
  label: string;
  rows: AmenityRow[];
  onChange: (rows: AmenityRow[]) => void;
  /**
   * Translating. Only the wording is editable: whether an amenity is included
   * is a fact about the building, and the list pairs with the English by
   * position, so adding or removing a line here would repoint every row.
   */
  locked?: boolean;
  /** The English list, shown under each line while translating. */
  refs?: AmenityRow[];
}) {
  return (
    <div>
      <span className="fl">{label}</span>
      {rows.map((a, i) => (
        <div key={i}>
          <div className="amen">
            <input
              className="aname"
              aria-label={`${label} item ${i + 1}`}
              value={a.label}
              onChange={(e) =>
                onChange(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
              }
            />
            {locked ? (
              <span className={`pill ${a.included ? "pub" : "draft"}`}>
                {a.included ? "Included" : "Not included"}
              </span>
            ) : (
              <Sw
                on={a.included}
                label={`${a.label || "Item"} included`}
                onClick={() =>
                  onChange(rows.map((r, j) => (j === i ? { ...r, included: !r.included } : r)))
                }
              />
            )}
            {!locked && (
              <button type="button" className="del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                Remove
              </button>
            )}
          </div>
          {locked && <Ref value={refs?.[i]?.label ?? ""} />}
        </div>
      ))}
      {!locked && (
        <button type="button" className="addrow" onClick={() => onChange([...rows, { label: "", included: true }])}>
          ＋ Add item
        </button>
      )}
    </div>
  );
}

function ArrayEditor<T>({
  title,
  hint,
  rows,
  onChange,
  blank,
  render,
  addLabel,
}: {
  title: string;
  hint: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: T;
  render: (row: T, upd: (next: T) => void) => React.ReactNode;
  addLabel: string;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="hint">{hint}</p>
      {rows.map((row, i) => (
        <div className="arr-item" key={i}>
          <button type="button" className="del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            Remove
          </button>
          <div className="arr-inner">
            {render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}
          </div>
        </div>
      ))}
      <button type="button" className="addrow" onClick={() => onChange([...rows, { ...blank }])}>
        {addLabel}
      </button>
    </div>
  );
}

// ── Bookings ───────────────────────────────────────────────────────────────
function BookingsView({
  bookings,
  setBookings,
  unitOptions,
}: {
  bookings: AdminBooking[];
  setBookings: React.Dispatch<React.SetStateAction<AdminBooking[]>>;
  unitOptions: UnitOption[];
}) {
  const [q, setQ] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<AdminBooking | "new" | null>(null);

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        if (unitFilter && b.unitId !== unitFilter) return false;
        if (statusFilter && b.status !== statusFilter) return false;
        if (q) {
          const hay = `${b.guest.name} ${b.guest.phone} ${b.unit ?? ""}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [bookings, q, unitFilter, statusFilter],
  );

  async function onDelete(id: string) {
    if (!confirm("Delete this booking? This frees its dates on the site.")) return;
    const res = await deleteBooking(id);
    if (res.ok) setBookings((prev) => prev.filter((b) => b._id !== id));
    else alert(res.error);
  }

  function exportCsv() {
    const cols = ["Apartment", "Check-in", "Check-out", "Guest", "Phone/WhatsApp", "Email", "Status", "Note"];
    const cell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [cols.join(",")].concat(
      filtered.map((b) =>
        [b.unit ?? "Whole property", b.start, b.end, b.guest.name, b.guest.phone, b.guest.email, b.status, b.note]
          .map(cell)
          .join(","),
      ),
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "henriks-bookings.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="ed-body">
      <div className="bk-head">
        <div>
          <h2>Bookings</h2>
          <div className="sub">Blocked stays &amp; guest contacts — private to the admin.</div>
        </div>
        <div className="bk-actions">
          <button type="button" className="btn" onClick={exportCsv}>⤓ Download Excel</button>
          <button type="button" className="btn primary" onClick={() => setModal("new")}>＋ New booking</button>
        </div>
      </div>

      <div className="bk-filters">
        <span className="fx">
          <Svg><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
          <input placeholder="Search guest or phone…" aria-label="Search guest or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </span>
        <span className="fx">
          <label htmlFor="bk-unit">Apartment</label>
          <select id="bk-unit" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">All apartments</option>
            {unitOptions.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </span>
        <span className="fx">
          <label htmlFor="bk-status">Status</label>
          <select id="bk-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="held">Held</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </span>
        <button type="button" className="clear" onClick={() => { setQ(""); setUnitFilter(""); setStatusFilter(""); }}>
          Clear
        </button>
      </div>

      <div className="bk-scroll">
        <table className="bk-table">
          <thead>
            <tr>
              <th>Apartment</th><th>Check-in</th><th>Check-out</th><th>Guest</th><th>Contact</th><th>Status</th><th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="bk-empty">No bookings — add one with “New booking”.</td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b._id}>
                  <td className="u">{b.unit ?? "Whole property"}</td>
                  <td className="dt">{b.start}</td>
                  <td className="dt">{b.end}</td>
                  <td className="g">{b.guest.name || "—"}</td>
                  <td className="contact">{b.guest.phone || "—"}</td>
                  <td><span className={`pill ${b.status === "confirmed" ? "pub" : "draft"}`}>{b.status}</span></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button type="button" className="bk-rowbtn" onClick={() => setModal(b)}>Edit</button>{" "}
                    <button type="button" className="bk-rowbtn" onClick={() => onDelete(b._id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <BookingModal
          booking={modal === "new" ? null : modal}
          unitOptions={unitOptions}
          onClose={() => setModal(null)}
          onSaved={(saved) =>
            setBookings((prev) => {
              const exists = prev.some((b) => b._id === saved._id);
              return exists ? prev.map((b) => (b._id === saved._id ? saved : b)) : [saved, ...prev];
            })
          }
        />
      )}
    </div>
  );
}

function BookingModal({
  booking,
  unitOptions,
  onClose,
  onSaved,
}: {
  booking: AdminBooking | null;
  unitOptions: UnitOption[];
  onClose: () => void;
  onSaved: (b: AdminBooking) => void;
}) {
  const [unitId, setUnitId] = useState(booking?.unitId ?? "");
  const [status, setStatus] = useState<AdminBooking["status"]>(booking?.status ?? "confirmed");
  const [start, setStart] = useState(booking?.start ?? "");
  const [end, setEnd] = useState(booking?.end ?? "");
  const [name, setName] = useState(booking?.guest.name ?? "");
  const [phone, setPhone] = useState(booking?.guest.phone ?? "");
  const [email, setEmail] = useState(booking?.guest.email ?? "");
  const [note, setNote] = useState(booking?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setErr(null);
    const input: AdminBookingInput = {
      _id: booking?._id ?? null,
      unitId: unitId || null,
      start,
      end,
      status,
      guest: { name, phone, email },
      note,
    };
    const res = await saveBooking(input);
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onSaved({
      _id: res.id,
      unitId: unitId || null,
      unit: unitOptions.find((u) => u._id === unitId)?.name ?? null,
      start,
      end,
      status,
      source: "manual",
      note,
      guest: { name, phone, email },
    });
    onClose();
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
        <div className="m-head">
          <h3 id="bk-modal-title">{booking ? "Edit booking" : "New booking"}</h3>
          <button type="button" className="m-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="m-body">
          <div className="grid2">
            <Field label="Apartment" opt="(blank = whole property)">
              <select className="ctrl" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Whole property</option>
                {unitOptions.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="ctrl" value={status} onChange={(e) => setStatus(e.target.value as AdminBooking["status"])}>
                <option value="confirmed">Confirmed</option>
                <option value="held">Held (tentative)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>
          <div className="grid2">
            <Field label="Check-in" req><input className="ctrl" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Check-out" req><input className="ctrl" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
          <Field label="Guest name"><input className="ctrl" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria López" /></Field>
          <div className="grid2">
            <Field label="Phone / WhatsApp"><input className="ctrl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 …" /></Field>
            <Field label="Email" opt="(optional)"><input className="ctrl" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
          <Field label="Private note" opt="(only you see this)"><textarea className="ctrl" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Deposit paid, returning guest…" /></Field>
          {err && <p className="err" role="alert" style={{ marginTop: 10 }}>{err}</p>}
        </div>
        <div className="m-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save booking"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Shared settings: Amenities + Property details ────────────────────────────
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function SaveBar({
  title,
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  title: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="ed-bar">
      <span className="crumb"><b>{title}</b></span>
      <span className="status">
        <i className={dirty ? "is-dirty" : ""} aria-hidden />
        <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
      </span>
      <div className="ed-actions">
        {dirty && (
          <button type="button" className="btn ghost" onClick={onDiscard} disabled={saving}>
            Discard
          </button>
        )}
        <button type="button" className="btn primary" onClick={onSave} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Notice({ msg }: { msg: string }) {
  return (
    <div className={`notice ${msg.startsWith("Error") ? "err" : "ok"}`} role="status">
      {msg}
    </div>
  );
}

function IconSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (path: string) => void;
}) {
  const known = Object.values(ICONS).includes(value);
  return (
    <div className="iconpick">
      <span className="iconbox" aria-hidden>
        {value && <Svg><path d={value} /></Svg>}
      </span>
      <select className="ctrl" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {!known && <option value={value}>{value ? "Current icon" : "Pick an icon"}</option>}
        {Object.entries(ICONS).map(([name, path]) => (
          <option key={name} value={path}>{name}</option>
        ))}
      </select>
    </div>
  );
}

function AmenitiesView({
  settings,
  lang,
  onSaved,
}: {
  settings: AdminSettings;
  lang: Locale;
  onSaved: (next: AdminSettings) => void;
}) {
  const translating = lang !== DEFAULT_LOCALE;
  const tr: SettingsTranslation | undefined = settings.i18n[lang];
  const status = transStatus(settings.englishHash, tr?.sourceHash, tr?.machine);
  const english = settings.amenities;

  /*
    Tiles merge POSITIONALLY — index i is tile i of the English list — so the
    translated array is always seeded to the English length. That is also why
    reordering, adding and removing are English-only: the two lists are paired
    by position, and shuffling one language would repoint every Spanish tile at
    a different icon.
  */
  const initial: PropertyAmenityRow[] = translating
    ? english.map((a, i) => ({
        icon: a.icon,
        title: tr?.propertyAmenities[i]?.title ?? "",
        desc: tr?.propertyAmenities[i]?.desc ?? "",
      }))
    : english;

  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = !same(rows, saved);

  const upd = (i: number, next: PropertyAmenityRow) =>
    setRows((prev) => prev.map((r, j) => (j === i ? next : r)));
  const move = (i: number, by: -1 | 1) =>
    setRows((prev) => {
      const j = i + by;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setSaving(true);
    setMsg(null);
    /*
      The trust paragraph and the arrival note live on this same row but belong
      to Property details. They are passed through unchanged — the server drops
      empty values rather than writing them, so this save cannot blank them.
    */
    const res = translating
      ? await saveSettingsTranslation(lang, {
          hostNote: tr?.hostNote ?? "",
          stayNote: tr?.stayNote ?? "",
          propertyAmenities: rows.map((r) => ({ title: r.title, desc: r.desc })),
        })
      : await saveAmenities(rows);
    setSaving(false);
    if (!res.ok) {
      setMsg(`Error: ${res.error}`);
      return;
    }
    setSaved(rows);
    onSaved(
      translating
        ? {
            ...settings,
            i18n: {
              ...settings.i18n,
              [lang]: {
                hostNote: tr?.hostNote ?? "",
                stayNote: tr?.stayNote ?? "",
                propertyAmenities: rows.map((r) => ({ title: r.title, desc: r.desc })),
                sourceHash: settings.englishHash,
                machine: false,
              },
            },
          }
        : { ...settings, amenities: rows },
    );
    setMsg("Saved · live on site within a minute");
  }

  return (
    <>
      <SaveBar
        title={translating ? `Amenities · ${LANGUAGE_NAME[lang]}` : "Amenities"}
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setRows(saved);
          setMsg(null);
        }}
      />
      <div className="ed-body">
        <div className="view-head">
          <h2>Amenities</h2>
          <p className="sub">
            The “What’s on site” tiles on the homepage. The power and internet tiles are shown large automatically;
            the rest follow in the order below.
          </p>
        </div>
        {translating && <span className={`pill ${status.pill}`}>{status.text}</span>}
        <StaleNotice show={translating && status.pill === "stale"} />
        {msg && (!dirty || msg.startsWith("Error")) && <Notice msg={msg} />}

        <div className="card">
          <h3>Amenity tiles <span className="opt">({rows.length})</span></h3>
          <p className="hint">
            {translating
              ? "Each tile’s wording, with the English underneath. Icons and the order are the same in every language — change those in English."
              : "Add, change, reorder or remove tiles. Nothing changes on the site until you save."}
          </p>

          {rows.map((row, i) => (
            <div className={`arr-item tile-item ${translating ? "locked" : ""}`} key={i}>
              <div className="tile-head">
                <span className="num">Tile {i + 1}</span>
                {!translating && (
                  <>
                    <button type="button" className="icon-btn" aria-label={`Move “${row.title || `tile ${i + 1}`}” up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Move “${row.title || `tile ${i + 1}`}” down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                      ↓
                    </button>
                    <button type="button" className="del" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </>
                )}
              </div>
              <div className="grid-tile">
                <Field label="Icon">
                  {translating ? (
                    <div className="iconpick">
                      <span className="iconbox" aria-hidden>
                        {row.icon && <Svg><path d={row.icon} /></Svg>}
                      </span>
                      <input className="ctrl" aria-label={`Icon for tile ${i + 1}`} value="Same in every language" disabled />
                    </div>
                  ) : (
                    <IconSelect label={`Icon for tile ${i + 1}`} value={row.icon} onChange={(icon) => upd(i, { ...row, icon })} />
                  )}
                </Field>
                <Field label="Title" req>
                  <input className="ctrl" aria-label={`Title for tile ${i + 1}`} placeholder="Shared pool & sun deck" value={row.title} onChange={(e) => upd(i, { ...row, title: e.target.value })} />
                  {translating && <Ref value={english[i]?.title ?? ""} />}
                </Field>
              </div>
              <Field label="Description">
                <textarea className="ctrl short" aria-label={`Description for tile ${i + 1}`} value={row.desc} onChange={(e) => upd(i, { ...row, desc: e.target.value })} />
                {translating && <Ref value={english[i]?.desc ?? ""} />}
              </Field>
            </div>
          ))}

          {!translating && (
            <button type="button" className="addrow" onClick={() => setRows((prev) => [...prev, { icon: ICONS.House, title: "", desc: "" }])}>
              ＋ Add amenity
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const propertyFields = (s: AdminSettings): AdminPropertyInput => ({
  propertyName: s.propertyName,
  city: s.city,
  region: s.region,
  whatsappNumber: s.whatsappNumber,
  languages: s.languages,
  ownerSince: s.ownerSince,
  replyTime: s.replyTime,
  hostNote: s.hostNote,
  checkIn: s.checkIn,
  checkOut: s.checkOut,
  stayNote: s.stayNote,
  fxRate: s.fxRate,
  powerBaseUsd: s.powerBaseUsd,
  discounts: s.discounts,
});

function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PropertyView({
  initial,
  lang,
  onSaved,
}: {
  initial: AdminSettings;
  lang: Locale;
  onSaved: (saved: AdminPropertyInput & { fxRateAsOf: string }) => void;
}) {
  const translating = lang !== DEFAULT_LOCALE;
  const tr: SettingsTranslation | undefined = initial.i18n[lang];
  const status = transStatus(initial.englishHash, tr?.sourceHash, tr?.machine);

  /*
    Only the two paragraphs translate — lib/i18n/schema.ts lists hostNote and
    stayNote and nothing else here. The rest is one fact in every language: a
    second copy of the WhatsApp number or the exchange rate is just a second
    thing to keep in step, and the first one to fall out of it is the one
    nobody is looking at. They stay on screen, disabled, so the translator can
    see what they are describing.
  */
  const seed = (): AdminPropertyInput =>
    translating
      ? { ...propertyFields(initial), hostNote: tr?.hostNote ?? "", stayNote: tr?.stayNote ?? "" }
      : propertyFields(initial);

  const [d, setD] = useState(seed);
  const [saved, setSaved] = useState(seed);
  // Languages are typed as one comma-separated line but stored as a list.
  const [langText, setLangText] = useState(() => initial.languages.join(", "));
  const [asOf, setAsOf] = useState(initial.fxRateAsOf);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = !same(d, saved);
  const digits = d.whatsappNumber.replace(/\D/g, "");

  const set = <K extends keyof AdminPropertyInput>(k: K, v: AdminPropertyInput[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setDiscount = (i: number, patch: Partial<AdminPropertyInput["discounts"][number]>) =>
    set("discounts", d.discounts.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    setSaving(true);
    setMsg(null);

    if (translating) {
      /*
        The amenity tiles live on this same row but belong to the Amenities
        view. They are passed through unchanged — the server drops empty values
        rather than writing them, so this save cannot blank them.
      */
      const res = await saveSettingsTranslation(lang, {
        hostNote: d.hostNote,
        stayNote: d.stayNote,
        propertyAmenities: tr?.propertyAmenities ?? [],
      });
      setSaving(false);
      if (!res.ok) {
        setMsg(`Error: ${res.error}`);
        return;
      }
      setSaved(d);
      setMsg("Saved · live on site within a minute");
      return;
    }

    const res = await saveProperty(d);
    setSaving(false);
    if (!res.ok) {
      setMsg(`Error: ${res.error}`);
      return;
    }
    // Mirror what the server stored so the form reads as saved.
    const stored: AdminPropertyInput = {
      ...d,
      propertyName: d.propertyName.trim(),
      city: d.city.trim(),
      region: d.region.trim(),
      whatsappNumber: digits,
      languages: d.languages.map((l) => l.trim()).filter(Boolean),
      discounts: [...d.discounts].sort((a, b) => a.months - b.months),
    };
    setD(stored);
    setSaved(stored);
    setLangText(stored.languages.join(", "));
    setAsOf(res.fxRateAsOf);
    onSaved({ ...stored, fxRateAsOf: res.fxRateAsOf });
    setMsg("Saved · live on site within a minute");
  }

  return (
    <>
      <SaveBar
        title={translating ? `Property details · ${LANGUAGE_NAME[lang]}` : "Property details"}
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setD(saved);
          setLangText(saved.languages.join(", "));
          setMsg(null);
        }}
      />
      <div className="ed-body">
        <div className="view-head">
          <h2>Property details</h2>
          <p className="sub">
            {translating
              ? `The two paragraphs guests read, in ${LANGUAGE_NAME[lang]}. The numbers and contact details below are the same in every language.`
              : "Contact details and the numbers behind every price and estimate on the site."}
          </p>
        </div>
        {translating && <span className={`pill ${status.pill}`}>{status.text}</span>}
        <StaleNotice show={translating && status.pill === "stale"} />
        {msg && (!dirty || msg.startsWith("Error")) && <Notice msg={msg} />}

        <div className={`card ${translating ? "locked" : ""}`}>
          <h3>Property</h3>
          <p className="hint">Shown in the header, the footer and the page titles on Google.</p>
          <Field label="Property name" req>
            <input className="ctrl" aria-label="Property name" value={d.propertyName} disabled={translating} onChange={(e) => set("propertyName", e.target.value)} />
          </Field>
          <div className="grid2">
            <Field label="City">
              <input className="ctrl" aria-label="City" value={d.city} disabled={translating} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Region">
              <input className="ctrl" aria-label="Region" value={d.region} disabled={translating} onChange={(e) => set("region", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className={`card ${translating ? "locked" : ""}`}>
          <h3>WhatsApp</h3>
          <p className="hint">Every WhatsApp button on the site opens a chat with this number.</p>
          <Field label="WhatsApp number" req opt="(country code first)">
            <input
              className="ctrl"
              id="prop-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              aria-label="WhatsApp number"
              placeholder="1 809 555 0142"
              value={d.whatsappNumber}
              disabled={translating}
              onChange={(e) => set("whatsappNumber", e.target.value)}
            />
            <p className="field-note">
              {digits.length >= 8 ? (
                <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                  Test this number in WhatsApp ↗
                </a>
              ) : (
                "Type the full number, including the country code (1 for the Dominican Republic)."
              )}
            </p>
          </Field>
        </div>

        <div className="card">
          <h3>Who you&rsquo;re renting from</h3>
          <p className="hint">The trust section on the homepage. No photo — just the facts guests ask about.</p>
          <div className={`grid2 ${translating ? "locked" : ""}`}>
            <Field label="Owner since" opt="(year)">
              <input className="ctrl" aria-label="Owner since" placeholder="2026" value={d.ownerSince} disabled={translating} onChange={(e) => set("ownerSince", e.target.value)} />
            </Field>
            <Field label="Typical WhatsApp reply">
              <input className="ctrl" aria-label="Typical WhatsApp reply" placeholder="< 1 h" value={d.replyTime} disabled={translating} onChange={(e) => set("replyTime", e.target.value)} />
            </Field>
          </div>
          <Field label="Languages Henrik speaks" opt="(separate with commas)">
            <input
              className="ctrl"
              aria-label="Languages"
              placeholder="English, Finnish, Norwegian, Spanish, German"
              value={langText}
              disabled={translating}
              onChange={(e) => {
                setLangText(e.target.value);
                set("languages", e.target.value.split(",").map((l) => l.trim()).filter(Boolean));
              }}
            />
            <p className="field-note">
              {d.languages.length ? `Shown as ${d.languages.length} languages: ${d.languages.join(" · ")}` : "None yet — the languages tile is hidden."}
            </p>
          </Field>
          <Field label="About Henrik" opt="(the paragraph guests read)">
            <textarea className="ctrl" style={{ minHeight: 130 }} aria-label="About Henrik" value={d.hostNote} onChange={(e) => set("hostNote", e.target.value)} />
            {translating && <Ref value={initial.hostNote} />}
          </Field>
        </div>

        <div className="card">
          <h3>Arrival &amp; departure</h3>
          <p className="hint">Shown on every apartment page, under “Terms &amp; house rules”.</p>
          <div className={`grid2 ${translating ? "locked" : ""}`}>
            <Field label="Check-in from" req>
              <input className="ctrl" aria-label="Check-in time" placeholder="3:00 PM" value={d.checkIn} disabled={translating} onChange={(e) => set("checkIn", e.target.value)} />
            </Field>
            <Field label="Check-out by" req>
              <input className="ctrl" aria-label="Check-out time" placeholder="12:00 PM" value={d.checkOut} disabled={translating} onChange={(e) => set("checkOut", e.target.value)} />
            </Field>
          </div>
          <Field label="Note for guests" opt="(one or two lines)">
            <textarea className="ctrl short" aria-label="Arrival note" value={d.stayNote} onChange={(e) => set("stayNote", e.target.value)} />
            {translating && <Ref value={initial.stayNote} />}
          </Field>
        </div>

        <div className={`card ${translating ? "locked" : ""}`}>
          <h3>Prices &amp; estimates</h3>
          <p className="hint">Apartment prices are set in US dollars. The site converts them to pesos with this rate.</p>
          <div className="grid2">
            <Field label="Exchange rate" req>
              <div className="prefix">
                <span>RD$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  aria-label="Pesos per US dollar"
                  value={d.fxRate}
                  disabled={translating}
                  onChange={(e) => set("fxRate", Number(e.target.value))}
                />
                <span className="after">per US$1</span>
              </div>
              <p className="field-note">
                {asOf ? `Rate as of ${prettyDate(asOf)}.` : "No date yet."} The date updates when you change the rate.
              </p>
            </Field>
            <Field label="Electricity estimate" opt="(per month)">
              <div className="prefix">
                <span>$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  aria-label="Electricity estimate in US dollars per month"
                  value={d.powerBaseUsd}
                  disabled={translating}
                  onChange={(e) => set("powerBaseUsd", Number(e.target.value))}
                />
              </div>
              <p className="field-note">Added per month to long-stay estimates as “Electricity, metered estimate”.</p>
            </Field>
          </div>
        </div>

        <div className={`card ${translating ? "locked" : ""}`}>
          <h3>Long-stay discounts</h3>
          <p className="hint">Taken off the rent in monthly estimates. When a stay qualifies for more than one, the biggest discount applies.</p>
          {d.discounts.map((x, i) => (
            <div className="disc-row" key={i}>
              <Field label="Stays of at least">
                <div className="prefix">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    aria-label={`Discount ${i + 1}: minimum months`}
                    value={x.months}
                    disabled={translating}
                    onChange={(e) => setDiscount(i, { months: Number(e.target.value) })}
                  />
                  <span className="after">months</span>
                </div>
              </Field>
              <Field label="Get">
                <div className="prefix">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max="50"
                    step="0.5"
                    aria-label={`Discount ${i + 1}: percent off`}
                    value={x.percent}
                    disabled={translating}
                    onChange={(e) => setDiscount(i, { percent: Number(e.target.value) })}
                  />
                  <span className="after">% off</span>
                </div>
              </Field>
              {!translating && (
                <button type="button" className="btn ghost" onClick={() => set("discounts", d.discounts.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {d.discounts.length === 0 && <p className="field-note" style={{ marginBottom: 12 }}>No discounts — long stays pay the full monthly rent.</p>}
          {!translating && (
            <button
              type="button"
              className="addrow"
              onClick={() => set("discounts", [...d.discounts, { months: 6, percent: 5 }])}
            >
              ＋ Add discount
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Translating ────────────────────────────────────────────────────────────

  The English, shown under the field being translated.

  Reference, never an input. Seeing the original beside the Spanish is what
  makes saving an act of review rather than a guess — and it is the reason
  saving stamps the translation as current (see writeTranslationRow in
  lib/admin/actions.ts).
*/
function Ref({ value, label = "English" }: { value: string; label?: string }) {
  const text = value.trim();
  return (
    <p className={`ref ${text ? "" : "empty"}`}>
      <b>{label}</b>
      {text || "Nothing written in English yet."}
    </p>
  );
}

/**
 * How one document's translation stands, for the editor bar.
 *
 * "Needs review" is not "wrong" — it means the English moved after this was
 * translated, so nobody has confirmed the two still say the same thing.
 */
function transStatus(englishHash: string, rowHash: string | undefined, machine = false) {
  if (rowHash === undefined) return { pill: "untranslated", text: "Not translated yet" } as const;
  // Two different reasons to look at it, one badge: the English moved under it,
  // or a model wrote it and nobody has read it. Both mean "not confirmed".
  if (rowHash !== englishHash) return { pill: "stale", text: "Needs review" } as const;
  if (machine) return { pill: "stale", text: "Needs review" } as const;
  return { pill: "pub", text: "Translated" } as const;
}

/** The banner above a translation nobody has confirmed. */
function StaleNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="notice err" role="status">
      Nobody has confirmed this yet — either a machine wrote it, or the English
      changed after it was translated. Read it against the English below, then save.
    </div>
  );
}

/* ── Homepage cover ───────────────────────────────────────────────────────── */

function HeroView({
  hero,
  lang,
  onSaved,
}: {
  hero: AdminHero;
  lang: Locale;
  onSaved: (h: AdminHero) => void;
}) {
  const translating = lang !== DEFAULT_LOCALE;
  const tr: HeroTranslation | undefined = hero.i18n[lang];
  const status = transStatus(hero.englishHash, tr?.sourceHash, tr?.machine);

  /*
    Stat cards merge POSITIONALLY — index i is card i of the English list — so
    the translated array is always seeded to the English length. A row the
    translator leaves blank falls back to the English on the site rather than
    blanking the card.
  */
  const initial = translating
    ? {
        eyebrow: tr?.eyebrow ?? "",
        headline: tr?.headline ?? "",
        sub: tr?.sub ?? "",
        backgroundAlt: tr?.backgroundAlt ?? "",
        stats: hero.stats.map((_, i) => tr?.stats[i] ?? { value: "", label: "" }),
        /*
          Carried so both branches keep the same shape and `set` stays typed.
          It is never rendered while translating (the field sits behind
          !translating) and never sent — saveHeroTranslation does not take it,
          because the video is the same in every language.
        */
        videoId: hero.videoId,
      }
    : {
        eyebrow: hero.eyebrow,
        headline: hero.headline,
        sub: hero.sub,
        backgroundAlt: hero.background?.alt ?? "",
        stats: hero.stats,
        videoId: hero.videoId,
      };

  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = !same(d, saved);

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setStat = (i: number, patch: Partial<StatRow>) =>
    set("stats", d.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = translating
      ? await saveHeroTranslation(lang, {
          eyebrow: d.eyebrow,
          headline: d.headline,
          sub: d.sub,
          backgroundAlt: d.backgroundAlt,
          stats: d.stats,
        })
      : await saveHero({
          eyebrow: d.eyebrow,
          headline: d.headline,
          sub: d.sub,
          videoId: d.videoId,
          backgroundAlt: d.backgroundAlt,
          stats: d.stats,
        });
    setSaving(false);
    if (!res.ok) {
      setMsg(`Error: ${res.error}`);
      return;
    }
    setSaved(d);
    /*
      A translation save stamps the CURRENT English fingerprint, which is the
      one already in hand — so the badge clears here without a reload. An
      English save moves that fingerprint server-side, and the badge on the
      other languages only catches up on the next load.
    */
    onSaved(
      translating
        ? {
            ...hero,
            i18n: {
              ...hero.i18n,
              [lang]: { ...d, sourceHash: hero.englishHash, machine: false },
            },
          }
        : {
            ...hero,
            eyebrow: d.eyebrow,
            headline: d.headline,
            sub: d.sub,
            stats: d.stats,
            videoId: d.videoId,
            background: hero.background ? { ...hero.background, alt: d.backgroundAlt } : null,
          },
    );
    setMsg("Saved · live on site within a minute");
  }

  return (
    <>
      <SaveBar
        title={translating ? `Homepage cover · ${LANGUAGE_NAME[lang]}` : "Homepage cover"}
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setD(saved);
          setMsg(null);
        }}
      />
      <div className="ed-body">
        <div className="view-head">
          <h2>Homepage cover</h2>
          <p className="sub">
            The first thing a guest reads. {translating
              ? `Editing the ${LANGUAGE_NAME[lang]} — the English is shown under each field.`
              : "The headline, the line beneath it and the three small cards."}
          </p>
        </div>
        {translating && <span className={`pill ${status.pill}`}>{status.text}</span>}
        <StaleNotice show={translating && status.pill === "stale"} />
        {msg && (!dirty || msg.startsWith("Error")) && <Notice msg={msg} />}

        <div className="card">
          <h3>Headline</h3>
          <p className="hint">Short and specific beats clever — this is what Google shows too.</p>
          <Field label="Eyebrow" opt="(the small line above)">
            <input className="ctrl" aria-label="Eyebrow" value={d.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
            {translating && <Ref value={hero.eyebrow} />}
          </Field>
          <Field label="Headline" req>
            <input className="ctrl" aria-label="Headline" value={d.headline} onChange={(e) => set("headline", e.target.value)} />
            {translating && <Ref value={hero.headline} />}
          </Field>
          <Field label="Sub-copy" opt="(one or two lines)">
            <textarea className="ctrl short" aria-label="Sub-copy" value={d.sub} onChange={(e) => set("sub", e.target.value)} />
            {translating && <Ref value={hero.sub} />}
          </Field>
        </div>

        <div className="card">
          <h3>Stat cards</h3>
          <p className="hint">
            The three small cards over the photo. {translating
              ? "Values translate too — “Any length” is copy, not a number."
              : "A short value and the line under it."}
          </p>
          {d.stats.map((s, i) => (
            <div className="arr-item" key={i}>
              <div className="arr-inner">
                <div className="grid2">
                  <Field label="Value">
                    <input className="ctrl" aria-label={`Card ${i + 1} value`} value={s.value} onChange={(e) => setStat(i, { value: e.target.value })} />
                    {translating && <Ref value={hero.stats[i]?.value ?? ""} />}
                  </Field>
                  <Field label="Label">
                    <input className="ctrl" aria-label={`Card ${i + 1} label`} value={s.label} onChange={(e) => setStat(i, { label: e.target.value })} />
                    {translating && <Ref value={hero.stats[i]?.label ?? ""} />}
                  </Field>
                </div>
              </div>
            </div>
          ))}
          {!translating && (
            <button type="button" className="addrow" onClick={() => set("stats", [...d.stats, { value: "", label: "" }])}>
              ＋ Add card
            </button>
          )}
        </div>

        <div className="card">
          <h3>Background photo</h3>
          <p className="hint">
            The photo itself is the same in every language — only the description changes.
          </p>
          <Field label="Photo description" opt="(for screen readers and Google)">
            <input className="ctrl" aria-label="Background photo description" value={d.backgroundAlt} onChange={(e) => set("backgroundAlt", e.target.value)} />
            {translating && <Ref value={hero.background?.alt ?? ""} />}
          </Field>
          {!translating && (
            <Field label="Walkthrough video" opt="(YouTube link or id)">
              <input
                className="ctrl"
                aria-label="YouTube video id"
                placeholder="3EA0J6JyIcA — or paste the full YouTube link"
                value={d.videoId}
                onChange={(e) => set("videoId", e.target.value)}
              />
              <p className="field-note">
                The same video in every language. Paste the whole watch link if that is
                easier — it is reduced to the id on save.
              </p>
            </Field>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Getting around ───────────────────────────────────────────────────────── */

function LocationView({
  location,
  lang,
  onSaved,
}: {
  location: AdminLocation;
  lang: Locale;
  onSaved: (l: AdminLocation) => void;
}) {
  const translating = lang !== DEFAULT_LOCALE;
  const tr: LocationTranslation | undefined = location.i18n[lang];
  const status = transStatus(location.englishHash, tr?.sourceHash, tr?.machine);

  const initial = translating
    ? {
        heading: tr?.heading ?? "",
        addressLine: tr?.addressLine ?? "",
        distances: location.distances.map((_, i) => tr?.distances[i] ?? { label: "", value: "" }),
      }
    : {
        heading: location.heading,
        addressLine: location.addressLine,
        distances: location.distances,
      };

  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = !same(d, saved);

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setRow = (i: number, patch: Partial<DistanceRow>) =>
    set("distances", d.distances.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = translating
      ? await saveLocationTranslation(lang, d)
      : await saveLocation(d);
    setSaving(false);
    if (!res.ok) {
      setMsg(`Error: ${res.error}`);
      return;
    }
    setSaved(d);
    onSaved(
      translating
        ? {
            ...location,
            i18n: {
              ...location.i18n,
              [lang]: { ...d, sourceHash: location.englishHash, machine: false },
            },
          }
        : { ...location, ...d },
    );
    setMsg("Saved · live on site within a minute");
  }

  return (
    <>
      <SaveBar
        title={translating ? `Getting around · ${LANGUAGE_NAME[lang]}` : "Getting around"}
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setD(saved);
          setMsg(null);
        }}
      />
      <div className="ed-body">
        <div className="view-head">
          <h2>Getting around</h2>
          <p className="sub">
            The address and how far things are — shared by every apartment, edited once.
          </p>
        </div>
        {translating && <span className={`pill ${status.pill}`}>{status.text}</span>}
        <StaleNotice show={translating && status.pill === "stale"} />
        {msg && (!dirty || msg.startsWith("Error")) && <Notice msg={msg} />}

        <div className="card">
          <h3>Address</h3>
          <p className="hint">Shown on the homepage and on every apartment page.</p>
          <Field label="Eyebrow">
            <input className="ctrl" aria-label="Eyebrow" value={d.heading} onChange={(e) => set("heading", e.target.value)} />
            {translating && <Ref value={location.heading} />}
          </Field>
          <Field label="Address line">
            <input className="ctrl" aria-label="Address line" value={d.addressLine} onChange={(e) => set("addressLine", e.target.value)} />
            {translating && <Ref value={location.addressLine} />}
          </Field>
        </div>

        <div className="card">
          <h3>Nearby places</h3>
          <p className="hint">
            {translating
              ? "Both halves translate — “4 min walk” is a sentence, not a measurement."
              : "A place and how long it takes, for example “Playa Sosúa” and “4 min walk”."}
          </p>
          {d.distances.map((x, i) => (
            <div className="disc-row" key={i}>
              <Field label="Place">
                <input className="ctrl" aria-label={`Place ${i + 1}`} value={x.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                {translating && <Ref value={location.distances[i]?.label ?? ""} />}
              </Field>
              <Field label="Distance">
                <input className="ctrl" aria-label={`Distance ${i + 1}`} value={x.value} onChange={(e) => setRow(i, { value: e.target.value })} />
                {translating && <Ref value={location.distances[i]?.value ?? ""} />}
              </Field>
              {!translating && (
                <button type="button" className="btn ghost" onClick={() => set("distances", d.distances.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {!translating && (
            <button type="button" className="addrow" onClick={() => set("distances", [...d.distances, { label: "", value: "" }])}>
              ＋ Add place
            </button>
          )}
        </div>
      </div>
    </>
  );
}
