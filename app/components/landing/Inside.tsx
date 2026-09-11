"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Tour from "@/app/components/tour/Tour";
import { display } from "@/lib/money";
import { useBooking, useContent } from "@/lib/booking";

const AUTOPLAY_MS = 5000;
type Mode = "tour" | "gallery";

const variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};

/**
 * Landing "Inside" section. Shares the selected unit with the apartment cards
 * and the cost estimator via BookingProvider. Two explicit media variants — the
 * per-unit 360° tour (default) and the photo gallery — chosen by a toggle rather
 * than a boolean prop. Gallery photo index is local and resets when the active
 * unit changes; the gallery auto-advances only while it is the visible variant.
 */
export default function Inside() {
  const content = useContent();
  const { currency, selectedSlug, setSelected } = useBooking();
  const reduced = useReducedMotion();
  const unit = content.units.find((u) => u.slug === selectedSlug) ?? content.units[0];
  const photos = unit.gallery.length ? unit.gallery : [unit.image];
  const hasTour = unit.tour.length > 0;

  const [mode, setMode] = useState<Mode>("tour");
  const effectiveMode: Mode = hasTour ? mode : "gallery";

  // [index, direction] for the gallery; reset on unit change (adjust-during-render).
  const [[slide, dir], setSlide] = useState<[number, number]>([0, 0]);
  const [prevSlug, setPrevSlug] = useState(selectedSlug);
  if (selectedSlug !== prevSlug) {
    setPrevSlug(selectedSlug);
    setSlide([0, 0]);
  }
  const index = Math.min(slide, photos.length - 1);
  const go = (delta: number) => setSlide(([i]) => [(i + delta + photos.length) % photos.length, delta]);

  const paused = useRef(false);
  useEffect(() => {
    if (effectiveMode !== "gallery" || reduced || photos.length <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setSlide(([i]) => [(i + 1) % photos.length, 1]);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [effectiveMode, reduced, photos.length, selectedSlug]);

  const photo = photos[index];

  const seg = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={effectiveMode === m}
      className={`rounded-[7px] px-4 py-2 text-[13px] font-semibold transition-colors ${
        effectiveMode === m ? "bg-deep text-white" : "text-copy hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section id="inside" className="scroll-mt-28 pt-11">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">
              {effectiveMode === "tour" ? "360° walkthrough" : "Photo walkthrough"}
            </p>
            <h2 className="mt-2 text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.01em]">
              {effectiveMode === "tour" ? `See the ${unit.name} before you fly.` : `Inside · ${unit.name}`}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hasTour && (
              <div className="inline-flex gap-[3px] rounded-[9px] bg-sand p-[3px]" role="group" aria-label="Media">
                {seg("tour", "360° tour")}
                {seg("gallery", `Gallery · ${photos.length}`)}
              </div>
            )}
            {effectiveMode === "gallery" && (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="inline-flex items-center gap-2.5 rounded-[8px] border border-hair-strong bg-surface px-[18px] py-3 text-[13px] font-semibold transition-colors hover:border-ink"
                >
                  <span aria-hidden>‹</span> Prev
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="inline-flex items-center gap-2.5 rounded-[8px] bg-deep px-[18px] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-olive"
                >
                  Next <span aria-hidden>›</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Centered apartment menu — switches the whole section's active unit.
            The active fill is a single shared element that slides between units
            (framer-motion layoutId); static when reduced motion is preferred. */}
        <div className="mb-7 flex flex-wrap justify-center gap-2.5" role="group" aria-label="Choose apartment">
          {content.units.map((u) => {
            const on = u.slug === unit.slug;
            return (
              <button
                key={u.slug}
                type="button"
                onClick={() => setSelected(u.slug)}
                aria-pressed={on}
                className={`relative inline-flex items-baseline gap-2.5 rounded-[10px] border px-5 py-3 transition-colors ${
                  on ? "border-deep text-white" : "border-hair-strong bg-surface text-ink hover:border-deep hover:bg-page"
                }`}
              >
                {on &&
                  (reduced ? (
                    <span className="absolute inset-0 rounded-[10px] bg-deep" />
                  ) : (
                    <motion.span
                      layoutId="unitPill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-[10px] bg-deep shadow-[0_10px_22px_-12px_rgba(4,88,140,0.65)]"
                    />
                  ))}
                <span className={`relative z-10 text-[14px] tracking-[-0.01em] ${on ? "font-bold" : "font-semibold"}`}>
                  {u.name}
                </span>
                <span className={`relative z-10 font-mono text-[11px] ${on ? "text-sand2" : "text-lagoon"}`}>
                  {display(u.priceUsd, currency, content.fxRate)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          {/* Media: 360 tour or gallery */}
          <div>
            {effectiveMode === "tour" ? (
              <>
                <Tour key={unit.slug} nodes={unit.tour} />
                <p className="mt-2.5 font-mono text-[11px] leading-[1.5] text-muted">
                  360° capture: Apartment 101 — shown for every unit until the others are photographed.
                </p>
              </>
            ) : (
              <>
                <div
                  className="relative aspect-video w-full overflow-hidden rounded-2xl border border-hair bg-ink"
                  onMouseEnter={() => (paused.current = true)}
                  onMouseLeave={() => (paused.current = false)}
                  onFocusCapture={() => (paused.current = true)}
                  onBlurCapture={() => (paused.current = false)}
                >
                  <AnimatePresence initial={false} custom={dir}>
                    <motion.div
                      key={`${unit.slug}:${index}`}
                      custom={dir}
                      variants={reduced ? undefined : variants}
                      initial={reduced ? { opacity: 0 } : "enter"}
                      animate={reduced ? { opacity: 1 } : "center"}
                      exit={reduced ? { opacity: 0 } : "exit"}
                      transition={{ x: { type: "tween", duration: 0.5, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
                      className="absolute inset-0"
                    >
                      <Image src={photo.url} alt={photo.alt} fill sizes="(min-width:1200px) 820px, 100vw" className="object-cover" />
                    </motion.div>
                  </AnimatePresence>
                  <div className="pointer-events-none absolute left-4 top-4 z-10 flex gap-2">
                    <span className="rounded-md bg-ink/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white backdrop-blur">
                      Photo {index + 1} / {photos.length}
                    </span>
                    <span className="rounded-md bg-ink/60 px-3 py-2 text-xs font-medium text-white backdrop-blur">
                      {unit.name}
                    </span>
                  </div>
                  <div className="absolute inset-x-4 bottom-4 z-10 flex gap-1">
                    {photos.map((p, i) => (
                      <button
                        key={p.url}
                        type="button"
                        aria-label={`Go to photo ${i + 1}`}
                        onClick={() => setSlide(([cur]) => [i, i >= cur ? 1 : -1])}
                        className={`h-[3px] flex-1 rounded-full transition-colors ${i === index ? "bg-pool" : "bg-white/35 hover:bg-white/60"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-[18px] flex items-start gap-5 rounded-2xl border border-hair bg-surface px-[22px] py-5">
                  <span className="pt-0.5 font-mono text-xs text-olive">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold">{photo.alt || unit.name}</h3>
                    <p className="mt-1.5 text-sm leading-[1.6] text-copy">{unit.tagline}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Details — cross-fade when the active unit changes */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={unit.slug}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-3.5"
            >
              <div className="rounded-2xl border border-hair bg-surface p-5">
                <div className="text-[20px] font-semibold tracking-[-0.01em]">{unit.name}</div>
                <div className="mt-1 text-[13px] text-copy">{unit.tagline}</div>
                <div className="mt-4 flex flex-wrap gap-4 border-t border-hair pt-4">
                  {[["Area", unit.spec.area], ["Bath", unit.spec.bath], ["Sleeps", unit.spec.sleeps]].map(
                    ([k, v]) => (
                      <div key={k}>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{k}</span>
                        <b className="text-[15px] font-bold">{v}</b>
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {unit.chips.map((c) => (
                    <span key={c} className="rounded-md bg-sand px-2.5 py-[5px] text-xs text-ink">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {unit.space.length > 0 && (
                <div className="flex flex-col gap-0.5 rounded-2xl border border-hair bg-surface p-2">
                  {unit.space.map((s) => (
                    <div key={s.key} className="rounded-lg p-3">
                      <h3 className="text-[13px] font-bold">{s.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-[1.5] text-copy">{s.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
