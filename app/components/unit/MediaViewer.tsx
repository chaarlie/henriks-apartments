"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { type Unit } from "@/lib/content";
import { sized } from "@/lib/image-url";
import Tour from "@/app/components/tour/Tour";
import { useUi } from "@/lib/i18n/client";

type Mode = "gallery" | "tour";

/**
 * Reusable unit media panel: a toggle that switches the panel between the 360°
 * tour and the photo gallery. The tour is the page's one unique asset, so it
 * opens first whenever the unit has one.
 */
export default function MediaViewer({ unit }: { unit: Unit }) {
  const t = useUi();
  const photos = unit.gallery.length ? unit.gallery : [unit.image];
  const hasTour = unit.tour.length > 0;
  const [mode, setMode] = useState<Mode>(hasTour ? "tour" : "gallery");
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) => setLightbox((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, move]);

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
          {hasTour && seg("tour", t.tour360)}
          {seg("gallery", t.photosCount(photos.length))}
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
            onClick={() => setLightbox(active)}
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
                aria-current={i === active ? "true" : undefined}
                aria-label={p.alt}
                className={`relative aspect-3/2 h-[76px] shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === active ? "border-deep" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image src={p.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink/[0.93] p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button type="button" onClick={() => setLightbox(null)} aria-label={t.close}
            className="absolute right-5 top-5 flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-xl text-white hover:bg-white/[0.28]">✕</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label={t.previous}
            className="absolute left-5 top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-xl text-white hover:bg-white/[0.28]">‹</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label={t.next}
            className="absolute right-5 top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-xl text-white hover:bg-white/[0.28]">›</button>
          {/*
            A plain <img>, deliberately: this one is centred and keeps its own
            aspect ratio, sized by the max-h/max-w below, which next/image's
            `fill` does not do well.

            But it MUST carry its own width. `photos[].url` is the untransformed
            asset URL — img() in sanity.server.ts returns it that way so
            next/image can request an exact size — and nothing here adds one. It
            was rendering 6244px, 9.9MB originals into a box capped at 1100px,
            one per arrow press. 2000 covers that box on a 2× screen, and
            `fit=max` never enlarges a photo that was smaller to begin with.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sized(photos[lightbox].url, { width: 2000 })}
            alt={photos[lightbox].alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[76vh] max-w-[min(1100px,92vw)] rounded-lg shadow-2xl"
          />
          <div className="mt-4 text-base text-white">{photos[lightbox].alt}</div>
          <div className="mt-1 font-mono text-xs tracking-[0.1em] text-white/60">
            {lightbox + 1} / {photos.length}
          </div>
        </div>
      )}
    </section>
  );
}
