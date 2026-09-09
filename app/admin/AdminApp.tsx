"use client";

import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { panoramaUrl } from "@/lib/panorama";
import {
  saveUnit,
  setUnitHidden,
  saveBooking,
  deleteBooking,
} from "@/lib/admin/actions";
import type {
  AdminUnit,
  AdminBooking,
  UnitOption,
  AmenityRow,
  SpaceRow,
  TermRow,
  MediaImage,
  TourStopRow,
  AdminBookingInput,
} from "@/lib/admin/types";

/** Uploads one file to /admin/api/upload → { ref, url, alt }. */
async function uploadImage(file: File): Promise<MediaImage> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/admin/api/upload", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json as MediaImage;
}

type View = "apartments" | "bookings" | "hero" | "amenities" | "property";

// House-rule icons (SVG path data) — mirrors lib/content.ts ICON.
const ICONS: Record<string, string> = {
  calendar: "M16 2v4M8 2v4M3 10h18M3 4h18v18H3z",
  money: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  house: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  "no-smoke": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4.9 4.9l14.2 14.2",
  wifi: "M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01",
  bolt: "M13 2 3 14h7l-1 8 10-12h-7z",
  pool: "M4 20a8 8 0 0 1 16 0M4 14h16M8 14V6a2 2 0 0 1 4 0",
};

function Sw({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`sw ${on ? "on" : ""}`}
      aria-pressed={on}
      onClick={onClick}
    />
  );
}

export default function AdminApp({
  units: initUnits,
  bookings: initBookings,
  unitOptions,
  adminName,
}: {
  units: AdminUnit[];
  bookings: AdminBooking[];
  unitOptions: UnitOption[];
  adminName: string;
}) {
  const [units, setUnits] = useState(initUnits);
  const [bookings, setBookings] = useState(initBookings);
  const [view, setView] = useState<View>("apartments");
  const [selectedId, setSelectedId] = useState(initUnits[0]?._id ?? "");
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
      {/* Sidebar */}
      <aside className="side">
        <div className="brand">
          <span className="mark" />
          <span className="brand-name">
            Henrik Sosúa<small>Content Studio</small>
          </span>
        </div>

        <div className="grp">Content</div>
        <NavItem icon="🏠" label="Apartments" count={units.length} active={view === "apartments"} onClick={() => setView("apartments")} />
        <NavItem icon="🖼️" label="Homepage / Hero" active={view === "hero"} onClick={() => setView("hero")} />
        <NavItem icon="✨" label="Amenities" active={view === "amenities"} onClick={() => setView("amenities")} />

        <div className="grp">Booking</div>
        <NavItem icon="🗓️" label="Bookings" count={bookings.length} active={view === "bookings"} onClick={() => setView("bookings")} />

        <div className="grp">Settings</div>
        <NavItem icon="⚙️" label="Property details" active={view === "property"} onClick={() => setView("property")} />

        <div className="foot">
          <span className="dot" /> {adminName}
          <SignOutButton>
            <button
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: 0,
                color: "#7fa9c0",
                cursor: "pointer",
                fontSize: 11,
                textDecoration: "underline",
              }}
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Document list (apartments only) */}
      {view === "apartments" && (
        <section className="list">
          <div className="top">
            <h2>Apartments</h2>
            <div className="search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                placeholder="Search apartments…"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="rows">
            {rows.map((u) => (
              <button
                key={u._id}
                className={`row ${u._id === selectedId ? "active" : ""}`}
                onClick={() => setSelectedId(u._id)}
              >
                <span className="thumb"><span>{u.name.split(" ")[0]}</span></span>
                <span className="rmeta">
                  <span className="rname">{u.name}</span>
                  <span className="rsub">
                    {u.code} · ${u.priceUsd.toLocaleString()}/mo · {u.spec.area} · {u.spec.sleeps}
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
        {view === "apartments" &&
          (selected ? (
            <ApartmentEditor
              key={selected._id}
              unit={selected}
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

        {(view === "hero" || view === "amenities" || view === "property") && (
          <GenericView view={view} />
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
  icon: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`navitem ${active ? "active" : ""}`} onClick={onClick}>
      <span className="ic">{icon}</span>
      <span className="label">{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  );
}

// ── Apartment editor ─────────────────────────────────────────────────────────
function ApartmentEditor({
  unit,
  onSaved,
}: {
  unit: AdminUnit;
  onSaved: (u: AdminUnit) => void;
}) {
  const [d, setD] = useState<AdminUnit>(unit);
  const [tab, setTab] = useState("Overview");
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
      availableFrom: d.availableFrom,
      spec: d.spec,
      chips: d.chips,
      keywords: d.keywords,
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

  return (
    <>
      <div className="ed-bar">
        <span className="crumb">
          Apartments / <b>{d.name}</b>
        </span>
        <span className="status">
          <i style={{ background: d.hidden ? "#9a6a00" : "#2f7d32" }} />{" "}
          <span>{d.hidden ? "Hidden from site" : "Live on site"}</span>
        </span>
        <div className="ed-actions">
          <button className="btn primary" onClick={doSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="btn" onClick={toggleHidden}>
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
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <span className={`pill ${d.hidden ? "draft" : "pub"}`}>
            {d.hidden ? "Hidden" : "Live"}
          </span>
        </div>

        {msg && (
          <div
            className="card"
            style={{
              borderColor: msg.startsWith("Error") ? "#e0b4a6" : "#a9d8ab",
              background: msg.startsWith("Error") ? "#fbf0ec" : "#eef7ef",
              color: msg.startsWith("Error") ? "#8f3a24" : "#2f7d32",
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        )}

        <div className="tabs">
          {["Overview", "Media", "Content", "Amenities", "Terms", "SEO"].map((t) => (
            <button
              key={t}
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        <div className="card">
          <h3>Basics</h3>
          <p className="hint">Shown on the apartment card and the top of the unit page.</p>
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
            <Field label="Slug" opt="(URL)">
              <div className="prefix">
                <span>/apartments/</span>
                <input value={d.slug} onChange={(e) => set("slug", e.target.value)} />
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
          <p className="hint">Stored in USD (the site shows DOP too). Short stays bill nightly, long stays monthly.</p>
          <div className="grid2">
            <Field label="Nightly rate (USD)" req>
              <div className="prefix">
                <span>$</span>
                <input
                  type="number"
                  value={d.priceNightlyUsd}
                  onChange={(e) => set("priceNightlyUsd", Number(e.target.value))}
                />
              </div>
            </Field>
            <Field label="Monthly rent (USD)" req>
              <div className="prefix">
                <span>$</span>
                <input
                  type="number"
                  value={d.priceUsd}
                  onChange={(e) => set("priceUsd", Number(e.target.value))}
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="card">
          <h3>Specs &amp; tags</h3>
          <p className="hint">The spec line renders as pills on the unit page.</p>
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
          <Field label="Card chips">
            <div className="tags">
              {d.chips.map((c, i) => (
                <span className="tag" key={i}>
                  {c}{" "}
                  <b onClick={() => set("chips", d.chips.filter((_, j) => j !== i))}>×</b>
                </span>
              ))}
              <input
                placeholder="Add chip…"
                value={chipDraft}
                onChange={(e) => setChipDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chipDraft.trim()) {
                    set("chips", [...d.chips, chipDraft.trim()]);
                    setChipDraft("");
                  }
                }}
              />
            </div>
          </Field>
          <Field label="Search keywords" opt="(for the landing filter)">
            <textarea className="ctrl" value={d.keywords} onChange={(e) => set("keywords", e.target.value)} />
          </Field>
        </div>

        {/* Content */}
        <div className="card">
          <h3>About this apartment</h3>
          <p className="hint">One paragraph per blank line. Renders on the unit detail page.</p>
          <Field label="">
            <textarea
              className="ctrl"
              style={{ minHeight: 140 }}
              value={d.about}
              onChange={(e) => set("about", e.target.value)}
            />
          </Field>
        </div>

        <ArrayEditor<SpaceRow>
          title="The space"
          hint="Repeatable blocks: key · title · description."
          rows={d.space}
          onChange={(rows) => set("space", rows)}
          blank={{ key: "", title: "", desc: "" }}
          render={(row, upd) => (
            <>
              <div className="grid2">
                <Field label="Key"><input className="ctrl" value={row.key} onChange={(e) => upd({ ...row, key: e.target.value })} /></Field>
                <Field label="Title"><input className="ctrl" value={row.title} onChange={(e) => upd({ ...row, title: e.target.value })} /></Field>
              </div>
              <Field label="Description"><input className="ctrl" value={row.desc} onChange={(e) => upd({ ...row, desc: e.target.value })} /></Field>
            </>
          )}
          addLabel="＋ Add space block"
        />

        {/* Amenities */}
        <div className="card">
          <h3>What this place offers</h3>
          <p className="hint">Toggle whether each item is included; unchecked items show struck-through on the page.</p>
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

        {/* Terms */}
        <ArrayEditor<TermRow>
          title="Terms &amp; house rules"
          hint="Repeatable: icon · title · description."
          rows={d.terms}
          onChange={(rows) => set("terms", rows)}
          blank={{ icon: ICONS.calendar, title: "", desc: "" }}
          render={(row, upd) => (
            <>
              <div className="grid3">
                <Field label="Icon">
                  <select
                    className="ctrl"
                    value={row.icon}
                    onChange={(e) => upd({ ...row, icon: e.target.value })}
                  >
                    {!Object.values(ICONS).includes(row.icon) && row.icon && (
                      <option value={row.icon}>(existing)</option>
                    )}
                    {Object.entries(ICONS).map(([name, path]) => (
                      <option key={name} value={path}>{name}</option>
                    ))}
                  </select>
                </Field>
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="Title"><input className="ctrl" value={row.title} onChange={(e) => upd({ ...row, title: e.target.value })} /></Field>
                </div>
              </div>
              <Field label="Description"><input className="ctrl" value={row.desc} onChange={(e) => upd({ ...row, desc: e.target.value })} /></Field>
            </>
          )}
          addLabel="＋ Add term"
        />

        {/* Media */}
        <MediaCard
          cover={d.cover}
          gallery={d.gallery}
          onCover={(cover) => set("cover", cover)}
          onGallery={(gallery) => set("gallery", gallery)}
        />

        {/* 360° tour */}
        <TourCard tour={d.tour} onChange={(tour) => set("tour", tour)} />

        {/* Deferred sections */}
        <div className="card">
          <h3>Promote &amp; SEO</h3>
          <p className="hint">
            The share-to-social panel and SEO fields are managed in the Sanity
            Studio for now — coming to this screen next.
          </p>
        </div>

        <div className="rail">
          <div className="st">
            <i style={{ background: d.hidden ? "#9a6a00" : "#2f7d32" }} />{" "}
            <span>{d.hidden ? "Hidden from site" : "Live on site"}</span>
          </div>
          <div className="meta">
            Document ID <b>{d._id}</b> · type <b>unit</b>
            <br />
            <span>{d.bookingCount} booking{d.bookingCount === 1 ? "" : "s"}</span>.
          </div>
          <div className="rowbtns">
            <button className="btn primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn" onClick={toggleHidden}>
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
          {opt && <span className="opt">{opt}</span>}
        </label>
      )}
      {children}
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
      <h3>Media</h3>
      <p className="hint">
        Cover image and photo gallery. Uploads go straight to Sanity&rsquo;s
        asset pipeline (auto-resized &amp; served from the CDN).{" "}
        {busy && <b>Uploading…</b>}
      </p>
      {err && (
        <div style={{ color: "#b3492f", fontWeight: 600, fontSize: 12.5, marginBottom: 10 }}>
          {err}
        </div>
      )}

      <div className="field">
        <label className="fl">Cover image <span className="req">*</span></label>
        <label
          className="cover"
          style={cover ? { backgroundImage: `url(${cover.url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" } : { cursor: "pointer" }}
        >
          {!cover && <span className="ph">⤒ Drop image or click to upload</span>}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleCover(e.target.files?.[0])}
          />
        </label>
        {cover && (
          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
            <input
              className="ctrl"
              placeholder="Alt text (describe the photo)"
              value={cover.alt}
              onChange={(e) => onCover({ ...cover, alt: e.target.value })}
            />
            <button className="btn ghost" onClick={() => onCover(null)}>Remove</button>
          </div>
        )}
      </div>

      <div className="field">
        <label className="fl">Gallery <span className="opt">({gallery.length} photos)</span></label>
        <div className="gal">
          {gallery.map((g, i) => (
            <div className="g" key={g.ref + i} style={{ backgroundImage: `url(${g.url})`, backgroundSize: "cover" }}>
              <button
                className="x"
                aria-label="Remove photo"
                onClick={() => onGallery(gallery.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <label className="add" style={{ cursor: "pointer" }}>
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
          <button className="del" onClick={() => onChange(tour.filter((_, j) => j !== i))}>
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
              <img
                src={panoramaUrl(stop.panorama)}
                alt=""
                style={{ marginTop: 8, borderRadius: 10, width: "100%", maxHeight: 160, objectFit: "cover", border: "1px solid var(--hair)" }}
              />
            )}
            <label className="fl" style={{ marginTop: 12 }}>Hotspots</label>
            {stop.links.map((l, li) => (
              <div className="grid2" key={li} style={{ alignItems: "end" }}>
                <Field label="Links to Stop ID">
                  <input className="ctrl" value={l.to} onChange={(e) => upd(i, { ...stop, links: stop.links.map((x, k) => (k === li ? { ...x, to: e.target.value } : x)) })} />
                </Field>
                <Field label="Yaw" opt='(e.g. "30deg")'>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="ctrl" value={l.yaw} onChange={(e) => upd(i, { ...stop, links: stop.links.map((x, k) => (k === li ? { ...x, yaw: e.target.value } : x)) })} />
                    <button className="btn ghost" onClick={() => upd(i, { ...stop, links: stop.links.filter((_, k) => k !== li) })}>×</button>
                  </div>
                </Field>
              </div>
            ))}
            <button className="addrow" onClick={() => upd(i, { ...stop, links: [...stop.links, { to: "", yaw: "0deg" }] })}>
              ＋ Add hotspot
            </button>
          </div>
        </div>
      ))}
      <button
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
      <label className="fl">{label}</label>
      {rows.map((a, i) => (
        <div className="amen" key={i}>
          <input
            className="aname"
            value={a.label}
            onChange={(e) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
            }
          />
          <Sw
            on={a.included}
            onClick={() =>
              onChange(rows.map((r, j) => (j === i ? { ...r, included: !r.included } : r)))
            }
          />
          <button className="del" style={{ position: "static" }} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button className="addrow" onClick={() => onChange([...rows, { label: "", included: true }])}>
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
      <h3 dangerouslySetInnerHTML={{ __html: title }} />
      <p className="hint">{hint}</p>
      {rows.map((row, i) => (
        <div className="arr-item" key={i}>
          <button className="del" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            Remove
          </button>
          <div className="arr-inner">
            {render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}
          </div>
        </div>
      ))}
      <button className="addrow" onClick={() => onChange([...rows, { ...blank }])}>
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
          <button className="btn" onClick={exportCsv}>⤓ Download Excel</button>
          <button className="btn primary" onClick={() => setModal("new")}>＋ New booking</button>
        </div>
      </div>

      <div className="bk-filters">
        <span className="fx">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input placeholder="Search guest or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </span>
        <span className="fx">
          <label>Apartment</label>
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">All apartments</option>
            {unitOptions.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </span>
        <span className="fx">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="held">Held</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </span>
        <button className="clear" onClick={() => { setQ(""); setUnitFilter(""); setStatusFilter(""); }}>
          Clear
        </button>
      </div>

      <table className="bk-table">
        <thead>
          <tr>
            <th>Apartment</th><th>Check-in</th><th>Check-out</th><th>Guest</th><th>Contact</th><th>Status</th><th></th>
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
                  <button className="bk-rowbtn" onClick={() => setModal(b)}>Edit</button>{" "}
                  <button className="bk-rowbtn" onClick={() => onDelete(b._id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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
      <div className="modal" role="dialog" aria-modal="true">
        <div className="m-head">
          <h3>{booking ? "Edit booking" : "New booking"}</h3>
          <button className="m-close" onClick={onClose} aria-label="Close">✕</button>
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
          <Field label="Private note" opt="(Henrik-only)"><textarea className="ctrl" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Deposit paid, returning guest…" /></Field>
          {err && <div style={{ color: "#b3492f", fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>{err}</div>}
        </div>
        <div className="m-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save booking"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Singletons (read-only placeholder this pass) ─────────────────────────────
function GenericView({ view }: { view: "hero" | "amenities" | "property" }) {
  const meta = {
    hero: { title: "Homepage / Hero", desc: "The landing hero — eyebrow, headline, sub-copy, walkthrough video, background image and stat cards." },
    amenities: { title: "Amenities", desc: "The property-wide amenity tiles shown on the landing page." },
    property: { title: "Property details", desc: "Global site & contact info — property name, city/region, WhatsApp number, pricing FX, and SEO defaults." },
  }[view];

  return (
    <div className="ed-body">
      <div className="placeholder-view">
        <h2>{meta.title}</h2>
        <p>{meta.desc}</p>
        <div className="sanity-note" style={{ marginTop: 26, textAlign: "left" }}>
          <span className="badge">Sanity</span>
          <div>
            These shared documents are editable in the Sanity Studio
            (<b>npm run studio</b>) for now — they&rsquo;re coming to this screen in
            the next pass. Apartments and Bookings above are fully editable here.
          </div>
        </div>
      </div>
    </div>
  );
}
