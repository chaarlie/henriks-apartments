"use client";

import { useState } from "react";
import Image from "next/image";
import { type ImageRef, type Unit } from "@/lib/content";
import Tour from "@/app/components/tour/Tour";
import { useUi } from "@/lib/i18n/client";
import { Lightbox, useLightboxControls, useLightboxPhoto } from "@/app/components/media/Lightbox";

type Mode = "gallery" | "tour";

/**
 * Reusable unit media panel: a toggle that switches the panel between the photo
 * gallery and the 360° tour.
 *
 * The GALLERY opens first. The tour used to, on the grounds that it is the page's
 * one unique asset — but someone landing on an apartment page wants to see the
 * apartment, and a panorama viewer is a thing you have to operate before it shows
 * you anything. The photos answer "what does it look like" immediately; the tour
 * is one click away for whoever wants it.
 *
 * It also fixes the LCP: the gallery's hero <Image> carries `priority`, which did
 * nothing while the tour was default, because the whole gallery branch was
 * unmounted on first paint.
 *
 * The full-screen viewer is Lightbox, shared with the landing page's common
 * areas. It replaced a hand-rolled one here that re-implemented Escape, had no
 * focus trap, and fetched a w=2000 rendition nothing had ever loaded — ~825ms
 * of empty screen per click.
 */
export default function MediaViewer({ unit }: { unit: Unit }) {
  const photos = unit.gallery.length ? unit.gallery : [unit.image];
  return (
    // Eager: someone on an apartment page came to look at the photos, so the
    // strip should be there when they reach for it rather than loading under
    // their thumb. The landing band mounts the same viewer lazily.
    <Lightbox.Provider photos={photos} loading="eager">
      <Panel unit={unit} photos={photos} />
    </Lightbox.Provider>
  );
}

function Panel({ unit, photos }: { unit: Unit; photos: ImageRef[] }) {
  const t = useUi();
  const { open, warm } = useLightboxControls();
  const hasTour = unit.tour.length > 0;
  const [mode, setMode] = useState<Mode>("gallery");
  const [active, setActive] = useState(0);

  const seg = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`rounded-[9px] px-[18px] py-2 text-[15px] font-bold transition-colors ${
        mode === m ? "bg-deep text-white" : "text-ink hover:text-deep"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section id="tour" className="scroll-mt-28">
      {/* Controls on top */}
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-[3px] rounded-xl bg-sand p-1" role="group" aria-label={t.viewLabel}>
          {seg("gallery", t.photosCount(photos.length))}
          {hasTour && seg("tour", t.tour360)}
        </div>
        <span className="ml-auto hidden font-mono text-xs uppercase tracking-[0.12em] text-copy sm:inline">
          {mode === "tour" ? t.dragToLookAround : t.photoOf(active + 1, photos.length)}
        </span>
      </div>

      {/* Panel */}
      {mode === "tour" ? (
        <Tour nodes={unit.tour} />
      ) : (
        <div>
          <button
            type="button"
            onClick={() => open(active)}
            onPointerEnter={() => warm(photos[active].url)}
            onFocus={() => warm(photos[active].url)}
            aria-label={t.openPhotoFullScreen}
            className="relative block aspect-video w-full overflow-hidden rounded-2xl border-[1.5px] border-line-card bg-ink"
          >
            <Image
              key={photos[active].url}
              src={photos[active].url}
              alt={photos[active].alt}
              fill
              priority
              sizes="(min-width:1200px) 1140px, 100vw"
              placeholder={photos[active].blurDataURL ? "blur" : "empty"}
              blurDataURL={photos[active].blurDataURL}
              className="object-cover"
            />
            {/* Always visible — hover-only hints never show on touch screens */}
            <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-ink shadow-[0_10px_24px_-10px_rgba(6,43,68,0.6)]">
              {t.fullScreen}
            </span>
          </button>

          <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={p.url}
                type="button"
                onClick={() => setActive(i)}
                onPointerEnter={() => warm(p.url)}
                aria-current={i === active ? "true" : undefined}
                aria-label={p.alt}
                className={`relative aspect-3/2 h-[76px] shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === active ? "border-deep" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={p.url}
                  alt=""
                  fill
                  sizes="120px"
                  loading="eager"
                  placeholder={p.blurDataURL ? "blur" : "empty"}
                  blurDataURL={p.blurDataURL}
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/*
        A unit gallery has no area names — the alt text is the whole caption,
        so this composes the same parts the common areas do, minus the label.
      */}
      <Lightbox.Dialog>
        <Lightbox.Stage>
          <Lightbox.Prev />
          <Lightbox.Next />
          <Lightbox.Close />
        </Lightbox.Stage>
        <Lightbox.Caption>
          <PhotoAlt />
          <Lightbox.Counter />
        </Lightbox.Caption>
        <Lightbox.Thumbs />
      </Lightbox.Dialog>
    </section>
  );
}

function PhotoAlt() {
  const photo = useLightboxPhoto();
  if (!photo?.alt) return <span />;
  return <p className="min-w-0 max-w-[62ch] text-[15px] text-white/[0.78]">{photo.alt}</p>;
}
