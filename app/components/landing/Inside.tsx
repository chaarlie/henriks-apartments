"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { display } from "@/lib/money";
import { useBooking, useContent } from "@/lib/booking";

const AUTOPLAY_MS = 5000;

const variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};

/**
 * Landing "Inside" carousel. Shares the selected unit with the apartment cards
 * and the cost estimator via BookingProvider: the photo stage and details on the
 * left track whichever unit is active, and the picker rail on the right sets it.
 * The photo index is local — it resets when the active unit changes. Slides
 * auto-advance (framer-motion), pausing on hover/focus and when the viewer
 * prefers reduced motion.
 */
export default function Inside() {
  const content = useContent();
  const { currency, selectedSlug, setSelected } = useBooking();
  const reduced = useReducedMotion();
  const unit = content.units.find((u) => u.slug === selectedSlug) ?? content.units[0];
  const photos = unit.gallery.length ? unit.gallery : [unit.image];

  // [index, direction] — direction drives the enter/exit animation.
  const [[slide, dir], setSlide] = useState<[number, number]>([0, 0]);
  const [prevSlug, setPrevSlug] = useState(selectedSlug);
  if (selectedSlug !== prevSlug) {
    setPrevSlug(selectedSlug);
    setSlide([0, 0]);
  }

  const index = Math.min(slide, photos.length - 1);
  const go = (delta: number) =>
    setSlide(([i]) => [(i + delta + photos.length) % photos.length, delta]);

  // Auto-advance, paused on hover/focus or when reduced motion is preferred.
  const paused = useRef(false);
  useEffect(() => {
    if (reduced || photos.length <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setSlide(([i]) => [(i + 1) % photos.length, 1]);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduced, photos.length, selectedSlug]);

  const photo = photos[index];

  return (
    <section id="inside" className="scroll-mt-28 pt-11">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">Photo walkthrough</p>
            <h2 className="mt-2 text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.01em]">
              Inside · {unit.name}
            </h2>
          </div>
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
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          {/* Stage + caption */}
          <div>
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
                  <Image
                    src={photo.url}
                    alt={photo.alt}
                    fill
                    sizes="(min-width:1200px) 820px, 100vw"
                    className="object-cover"
                  />
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
              <span className="pt-0.5 font-mono text-xs text-olive">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[17px] font-semibold">{photo.alt || unit.name}</h3>
                <p className="mt-1.5 text-sm leading-[1.6] text-copy">{unit.tagline}</p>
              </div>
            </div>
          </div>

          {/* Details + picker rail */}
          <div className="flex flex-col gap-3.5">
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

            <div className="flex flex-col gap-0.5 rounded-2xl border border-hair bg-surface p-2">
              {unit.space.map((s) => (
                <div key={s.key} className="rounded-lg p-3">
                  <h4 className="text-[13px] font-bold">{s.title}</h4>
                  <p className="mt-1 text-[12.5px] leading-[1.5] text-copy">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-0.5 rounded-2xl border border-hair bg-surface p-2" role="group" aria-label="Choose apartment">
              {content.units.map((u, i) => {
                const on = u.slug === unit.slug;
                return (
                  <button
                    key={u.slug}
                    type="button"
                    onClick={() => setSelected(u.slug)}
                    aria-pressed={on}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${on ? "bg-sand" : ""}`}
                  >
                    <span
                      className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full font-mono text-[10px] ${
                        on ? "bg-olive text-white" : "bg-sand text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[13px] ${on ? "font-semibold text-ink" : "font-medium text-copy"}`}>
                      {u.name}
                    </span>
                    <span className="ml-auto font-mono text-xs text-copy">
                      {display(u.priceUsd, currency, content.fxRate)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
