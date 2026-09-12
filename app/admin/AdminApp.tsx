"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { panoramaUrl } from "@/lib/panorama";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { urlFor } from "@/sanity/lib/image";
import { signOut } from "@/lib/admin/login";
import {
  saveUnit,
  setUnitHidden,
  saveBooking,
  deleteBooking,
  saveAmenities,
  saveProperty,
} from "@/lib/admin/actions";
import type {
  AdminUnit,
  AdminBooking,
  AdminSettings,
  AdminPropertyInput,
  PropertyAmenityRow,
  DepositRow,
  UnitOption,
  AmenityRow,
  SpaceRow,
  TermRow,
  MediaImage,
  TourStopRow,
  AdminBookingInput,
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

/** Uploads one file to /admin/api/upload → { ref, url, alt }. */
async function uploadImage(file: File): Promise<MediaImage> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/admin/api/upload", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json as MediaImage;
}

type View = "apartments" | "bookings" | "amenities" | "property";

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
  adminName,
}: {
  units: AdminUnit[];
  bookings: AdminBooking[];
  unitOptions: UnitOption[];
  settings: AdminSettings;
  adminName: string;
}) {
  const [units, setUnits] = useState(initUnits);
  const [settings, setSettings] = useState(initSettings);
  const [bookings, setBookings] = useState(initBookings);
  const [view, setView] = useState<View>("apartments");
  const [selectedId, setSelectedId] = useState(initUnits[0]?._id ?? "");
  const [tab, setTab] = useState<Tab>("Overview");
  const [listSearch, setListSearch] = useState("");

  const selected = units.find((u) => u._id === selectedId) ?? null;
  const rows = units.filter((u) =>
    `${u.name} ${u.code}`.toLowerCase().includes(listSearch.toLowerCase()),
  );

  function onUnitSaved(updated: AdminUnit) {
    setUnits((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
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

        <div className="grp">Content</div>
        <NavItem icon={NAV_ICON.apartments} label="Apartments" count={units.length} active={view === "apartments"} onClick={() => setView("apartments")} />
        <NavItem icon={NAV_ICON.amenities} label="Amenities" count={settings.amenities.length} active={view === "amenities"} onClick={() => setView("amenities")} />

        <div className="grp">Booking</div>
        <NavItem icon={NAV_ICON.bookings} label="Bookings" count={bookings.length} active={view === "bookings"} onClick={() => setView("bookings")} />

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

        {view === "apartments" &&
          (selected ? (
            <ApartmentEditor
              key={selected._id}
              unit={selected}
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

        {view === "bookings" && (
          <BookingsView
            bookings={bookings}
            setBookings={setBookings}
            unitOptions={unitOptions}
          />
        )}

        {view === "amenities" && (
          <AmenitiesView
            initial={settings.amenities}
            onSaved={(amenities) => setSettings((s) => ({ ...s, amenities }))}
          />
        )}

        {view === "property" && (
          <PropertyView
            initial={settings}
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
  tab,
  onTab,
  onSaved,
}: {
  unit: AdminUnit;
  tab: Tab;
  onTab: (t: Tab) => void;
  onSaved: (u: AdminUnit) => void;
}) {
  const [d, setD] = useState<AdminUnit>(unit);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [chipDraft, setChipDraft] = useState("");

  const set = <K extends keyof AdminUnit>(k: K, v: AdminUnit[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setSpec = (k: keyof AdminUnit["spec"], v: string) =>
    setD((p) => ({ ...p, spec: { ...p.spec, [k]: v } }));

  async function doSave() {
    setSaving(true);
    setMsg(null);
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
      gallery: d.gallery.map((g) => ({ ref: g.ref, alt: g.alt })),
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

  const status = (
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
        </span>
        <span className="status">{status}</span>
        <div className="ed-actions">
          <button type="button" className="btn primary" onClick={doSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn" onClick={toggleHidden}>
            {d.hidden ? "Unhide" : "Hide"}
          </button>
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
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <span className={`pill ${d.hidden ? "draft" : "pub"}`}>
            {d.hidden ? "Hidden" : "Live"}
          </span>
        </div>

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
                    <input className="ctrl" value={d.name} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <Field label="Unit code">
                    <input className="ctrl" value={d.code} onChange={(e) => set("code", e.target.value)} />
                  </Field>
                </div>
                <Field label="Tagline">
                  <input className="ctrl" value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
                </Field>
                <div className="grid2">
                  <Field label="Page address" opt="(URL)">
                    <div className="prefix">
                      <span>/apartments/</span>
                      <input value={d.slug} aria-label="Page address" onChange={(e) => set("slug", e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Available from">
                    <input
                      className="ctrl"
                      type="date"
                      value={d.availableFrom}
                      onChange={(e) => set("availableFrom", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="card">
                <h3>Pricing</h3>
                <p className="hint">In US dollars (the site also shows pesos). Stays under 28 nights bill nightly, longer stays monthly.</p>
                <div className="grid2">
                  <Field label="Monthly rent (USD)" req>
                    <div className="prefix">
                      <span>$</span>
                      <input
                        type="number"
                        aria-label="Monthly rent in US dollars"
                        value={d.priceUsd}
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
                {d.deposits.map((t, i) => (
                  <div className="disc-row" key={i}>
                    <Field label="Stays from">
                      <div className="prefix">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          aria-label={`Deposit ${i + 1}: from months`}
                          value={t.fromMonths}
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
                          value={t.amountUsd}
                          onChange={(e) =>
                            set("deposits", d.deposits.map((x, j) => (j === i ? { ...x, amountUsd: Number(e.target.value) } : x)))
                          }
                        />
                      </div>
                    </Field>
                    <button type="button" className="btn ghost" onClick={() => set("deposits", d.deposits.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                ))}
                {d.deposits.length === 0 && (
                  <p className="field-note" style={{ marginBottom: 12 }}>
                    No deposit — guests pay only the rent and the metered power.
                  </p>
                )}
                <button
                  type="button"
                  className="addrow"
                  onClick={() => set("deposits", [...d.deposits, { fromMonths: 0, amountUsd: 0 }])}
                >
                  ＋ Add deposit step
                </button>
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
                <div className="grid3">
                  <Field label="Area">
                    <input className="ctrl" value={d.spec.area} onChange={(e) => setSpec("area", e.target.value)} />
                  </Field>
                  <Field label="Bathrooms">
                    <input className="ctrl" value={d.spec.bath} onChange={(e) => setSpec("bath", e.target.value)} />
                  </Field>
                  <Field label="Sleeps">
                    <input className="ctrl" value={d.spec.sleeps} onChange={(e) => setSpec("sleeps", e.target.value)} />
                  </Field>
                </div>
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
                <Field label="Search words" opt="(helps guests find it with the search box)">
                  <textarea className="ctrl" aria-label="Search words" value={d.keywords} onChange={(e) => set("keywords", e.target.value)} />
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
                  <Sw on={d.forSale} label="This apartment is for sale" onClick={() => set("forSale", !d.forSale)} />
                </div>
                {d.forSale && (
                  <>
                    <Field label="Asking price (USD)" opt="(leave 0 for “price on request”)">
                      <div className="prefix">
                        <span>$</span>
                        <input
                          type="number"
                          min="0"
                          aria-label="Asking price in US dollars"
                          value={d.salePriceUsd}
                          onChange={(e) => set("salePriceUsd", Number(e.target.value))}
                        />
                      </div>
                    </Field>
                    <Field label="Sale note" opt="(one line, shown with the price)">
                      <input
                        className="ctrl"
                        aria-label="Sale note"
                        placeholder="Sold furnished · rental history available"
                        value={d.saleNote}
                        onChange={(e) => set("saleNote", e.target.value)}
                      />
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
              />
              <TourCard tour={d.tour} onChange={(tour) => set("tour", tour)} />
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
                    value={d.about}
                    onChange={(e) => set("about", e.target.value)}
                  />
                </Field>
              </div>

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
            </>
          )}

          {tab === "Amenities" && (
            <div className="card">
              <h3>What this place offers</h3>
              <p className="hint">Switch off anything that isn’t included — it shows with a cross on the page.</p>
              <div className="grid2">
                <AmenityColumn
                  label="Inside"
                  rows={d.amenities.inside}
                  onChange={(inside) => set("amenities", { ...d.amenities, inside })}
                />
                <AmenityColumn
                  label="Building & connectivity"
                  rows={d.amenities.building}
                  onChange={(building) => set("amenities", { ...d.amenities, building })}
                />
              </div>
            </div>
          )}

          {tab === "Terms" && (
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
          )}

          {tab === "Share" && <SharePanel unit={unit} />}
        </div>

        <div className="rail">
          <div className="st status">{status}</div>
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

function MediaCard({
  cover,
  gallery,
  onCover,
  onGallery,
}: {
  cover: MediaImage | null;
  gallery: MediaImage[];
  onCover: (c: MediaImage | null) => void;
  onGallery: (g: MediaImage[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCover(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      onCover(await uploadImage(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGallery(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const uploaded = await Promise.all(Array.from(files).map(uploadImage));
      onGallery([...gallery, ...uploaded]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Photos</h3>
      <p className="hint">
        The cover photo leads the apartment card and the shared link; the gallery fills the apartment page.{" "}
        {busy && <b>Uploading…</b>}
      </p>
      {err && <p className="err" role="alert">{err}</p>}

      <div className="field">
        <span className="fl">Cover photo <span className="req">*</span></span>
        <label className="cover" style={cover ? { backgroundImage: `url(${cover.url})` } : undefined}>
          {!cover && <span className="ph">⤒ Tap to upload a photo</span>}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleCover(e.target.files?.[0])}
          />
        </label>
        {cover && (
          <div className="cover-alt">
            <input
              className="ctrl"
              placeholder="Describe the photo (for screen readers and Google)"
              aria-label="Cover photo description"
              value={cover.alt}
              onChange={(e) => onCover({ ...cover, alt: e.target.value })}
            />
            <button type="button" className="btn ghost" onClick={() => onCover(null)}>Remove</button>
          </div>
        )}
      </div>

      <div className="field">
        <span className="fl">Gallery <span className="opt">({gallery.length} photos)</span></span>
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
            <input type="file" accept="image/*" multiple hidden onChange={(e) => handleGallery(e.target.files)} />
          </label>
        </div>
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
            <span className="fl" style={{ marginTop: 14 }}>Hotspots</span>
            {stop.links.map((l, li) => (
              <div className="grid2" key={li} style={{ alignItems: "end" }}>
                <Field label="Links to Stop ID">
                  <input className="ctrl" value={l.to} onChange={(e) => upd(i, { ...stop, links: stop.links.map((x, k) => (k === li ? { ...x, to: e.target.value } : x)) })} />
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
        onClick={() => onChange([...tour, { stopId: "", name: "", panorama: "", links: [] }])}
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
}: {
  label: string;
  rows: AmenityRow[];
  onChange: (rows: AmenityRow[]) => void;
}) {
  return (
    <div>
      <span className="fl">{label}</span>
      {rows.map((a, i) => (
        <div className="amen" key={i}>
          <input
            className="aname"
            aria-label={`${label} item ${i + 1}`}
            value={a.label}
            onChange={(e) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
            }
          />
          <Sw
            on={a.included}
            label={`${a.label || "Item"} included`}
            onClick={() =>
              onChange(rows.map((r, j) => (j === i ? { ...r, included: !r.included } : r)))
            }
          />
          <button type="button" className="del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="addrow" onClick={() => onChange([...rows, { label: "", included: true }])}>
        ＋ Add item
      </button>
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
  initial,
  onSaved,
}: {
  initial: PropertyAmenityRow[];
  onSaved: (rows: PropertyAmenityRow[]) => void;
}) {
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
    const res = await saveAmenities(rows);
    setSaving(false);
    if (res.ok) {
      setSaved(rows);
      onSaved(rows);
      setMsg("Saved · live on site within a minute");
    } else {
      setMsg(`Error: ${res.error}`);
    }
  }

  return (
    <>
      <SaveBar
        title="Amenities"
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
        {msg && (!dirty || msg.startsWith("Error")) && <Notice msg={msg} />}

        <div className="card">
          <h3>Amenity tiles <span className="opt">({rows.length})</span></h3>
          <p className="hint">Add, change, reorder or remove tiles. Nothing changes on the site until you save.</p>

          {rows.map((row, i) => (
            <div className="arr-item tile-item" key={i}>
              <div className="tile-head">
                <span className="num">Tile {i + 1}</span>
                <button type="button" className="icon-btn" aria-label={`Move “${row.title || `tile ${i + 1}`}” up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="icon-btn" aria-label={`Move “${row.title || `tile ${i + 1}`}” down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button type="button" className="del" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
              <div className="grid-tile">
                <Field label="Icon">
                  <IconSelect label={`Icon for tile ${i + 1}`} value={row.icon} onChange={(icon) => upd(i, { ...row, icon })} />
                </Field>
                <Field label="Title" req>
                  <input className="ctrl" aria-label={`Title for tile ${i + 1}`} placeholder="Shared pool & sun deck" value={row.title} onChange={(e) => upd(i, { ...row, title: e.target.value })} />
                </Field>
              </div>
              <Field label="Description">
                <textarea className="ctrl short" aria-label={`Description for tile ${i + 1}`} value={row.desc} onChange={(e) => upd(i, { ...row, desc: e.target.value })} />
              </Field>
            </div>
          ))}

          <button type="button" className="addrow" onClick={() => setRows((prev) => [...prev, { icon: ICONS.House, title: "", desc: "" }])}>
            ＋ Add amenity
          </button>
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
  onSaved,
}: {
  initial: AdminSettings;
  onSaved: (saved: AdminPropertyInput & { fxRateAsOf: string }) => void;
}) {
  const [d, setD] = useState(() => propertyFields(initial));
  const [saved, setSaved] = useState(() => propertyFields(initial));
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
        title="Property details"
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
          <p className="sub">Contact details and the numbers behind every price and estimate on the site.</p>
        </div>
        {msg && (!dirty || msg.startsWith("Error")) && <Notice msg={msg} />}

        <div className="card">
          <h3>Property</h3>
          <p className="hint">Shown in the header, the footer and the page titles on Google.</p>
          <Field label="Property name" req>
            <input className="ctrl" aria-label="Property name" value={d.propertyName} onChange={(e) => set("propertyName", e.target.value)} />
          </Field>
          <div className="grid2">
            <Field label="City">
              <input className="ctrl" aria-label="City" value={d.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Region">
              <input className="ctrl" aria-label="Region" value={d.region} onChange={(e) => set("region", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="card">
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
          <div className="grid2">
            <Field label="Owner since" opt="(year)">
              <input className="ctrl" aria-label="Owner since" placeholder="2026" value={d.ownerSince} onChange={(e) => set("ownerSince", e.target.value)} />
            </Field>
            <Field label="Typical WhatsApp reply">
              <input className="ctrl" aria-label="Typical WhatsApp reply" placeholder="< 1 h" value={d.replyTime} onChange={(e) => set("replyTime", e.target.value)} />
            </Field>
          </div>
          <Field label="Languages Henrik speaks" opt="(separate with commas)">
            <input
              className="ctrl"
              aria-label="Languages"
              placeholder="English, Finnish, Norwegian, Spanish, German"
              value={langText}
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
          </Field>
        </div>

        <div className="card">
          <h3>Arrival &amp; departure</h3>
          <p className="hint">Shown on every apartment page, under “Terms &amp; house rules”.</p>
          <div className="grid2">
            <Field label="Check-in from" req>
              <input className="ctrl" aria-label="Check-in time" placeholder="3:00 PM" value={d.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
            </Field>
            <Field label="Check-out by" req>
              <input className="ctrl" aria-label="Check-out time" placeholder="12:00 PM" value={d.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
            </Field>
          </div>
          <Field label="Note for guests" opt="(one or two lines)">
            <textarea className="ctrl short" aria-label="Arrival note" value={d.stayNote} onChange={(e) => set("stayNote", e.target.value)} />
          </Field>
        </div>

        <div className="card">
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
                  onChange={(e) => set("powerBaseUsd", Number(e.target.value))}
                />
              </div>
              <p className="field-note">Added per month to long-stay estimates as “Electricity, metered estimate”.</p>
            </Field>
          </div>
        </div>

        <div className="card">
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
                    onChange={(e) => setDiscount(i, { percent: Number(e.target.value) })}
                  />
                  <span className="after">% off</span>
                </div>
              </Field>
              <button type="button" className="btn ghost" onClick={() => set("discounts", d.discounts.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          {d.discounts.length === 0 && <p className="field-note" style={{ marginBottom: 12 }}>No discounts — long stays pay the full monthly rent.</p>}
          <button
            type="button"
            className="addrow"
            onClick={() => set("discounts", [...d.discounts, { months: 6, percent: 5 }])}
          >
            ＋ Add discount
          </button>
        </div>
      </div>
    </>
  );
}
