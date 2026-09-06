"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { type Unit } from "@/lib/content";
import Tour from "@/app/components/tour/Tour";

type Mode = "gallery" | "tour";

/**
 * Reusable unit media panel: a toggle that switches the panel between the photo
 * gallery and the 360° tour. Shared by every unit — pass the unit's
 * `gallery` + `tour`.
 */
export default function MediaViewer({ unit }: { unit: Unit }) {
  const photos = unit.gallery;
  const [mode, setMode] = useState<Mode>("gallery");
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
      className={`rounded-[7px] px-4 py-2 text-[13px] font-semibold transition-colors ${
        mode === m ? "bg-deep text-white" : "text-copy hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section id="tour" className="scroll-mt-28">
      {/* Controls on top */}
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-[3px] rounded-[9px] bg-sand p-[3px]" role="group" aria-label="View">
          {seg("gallery", `Gallery · ${photos.length}`)}
          {seg("tour", "360° tour")}
        </div>
        <span className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:inline">
          {mode === "tour" ? "Drag to look around" : `${active + 1} / ${photos.length}`}
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
            aria-label="Open photo full screen"
            className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-hair bg-ink"
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
            <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-[15px] py-2.5 text-[13px] font-bold text-ink opacity-0 shadow-[0_10px_24px_-10px_rgba(6,43,68,0.6)] transition-opacity group-hover:opacity-100">
              Expand ⤢
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
          <button type="button" onClick={() => setLightbox(null)} aria-label="Close"
            className="absolute right-5 top-5 flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-xl text-white hover:bg-white/[0.28]">✕</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Previous"
            className="absolute left-5 top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-xl text-white hover:bg-white/[0.28]">‹</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="Next"
            className="absolute right-5 top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-xl text-white hover:bg-white/[0.28]">›</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightbox].url}
            alt={photos[lightbox].alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[76vh] max-w-[min(1100px,92vw)] rounded-lg shadow-2xl"
          />
          <div className="mt-4 text-sm text-white">{photos[lightbox].alt}</div>
          <div className="mt-1 font-mono text-xs tracking-[0.1em] text-white/55">
            {lightbox + 1} / {photos.length}
          </div>
        </div>
      )}
    </section>
  );
}
