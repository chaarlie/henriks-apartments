"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localePath, splitLocale } from "@/lib/locales";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Tour from "@/app/components/tour/Tour";
import { ArrowIcon, CalendarIcon, ChevronIcon } from "@/app/components/icons";
import { display } from "@/lib/money";
import { unitFacts } from "@/lib/unit";
import { useBooking, useContent } from "@/lib/booking";
import { useUi } from "@/lib/i18n/client";

const AUTOPLAY_MS = 5000;
type Mode = "tour" | "gallery";

const variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};

const PHOTO_NAV =
  "grid h-12 w-12 place-items-center rounded-xl border border-white/30 bg-ink/65 text-white backdrop-blur transition-colors hover:bg-deep";

/**
 * Landing "Inside" band (ink). Shares the selected unit with the reserve form via
 * BookingProvider. Two explicit media variants — the per-unit 360° tour (default)
 * and the photo gallery — chosen by a toggle rather than a boolean prop. Gallery
 * photo index is local and resets when the active unit changes; the gallery
 * auto-advances only while it is the visible variant.
 */
export default function Inside() {
  const content = useContent();
  const { currency, selectedSlug, setSelected, setScope, openPicker } = useBooking();
  const t = useUi();
  const reduced = useReducedMotion();
  // "See the 101" has to stay in the language being read.
  const { locale } = splitLocale(usePathname());
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
      className={`rounded-[9px] px-[18px] py-2 text-[15px] font-bold transition-colors ${
        effectiveMode === m ? "bg-white text-ink" : "text-white/85 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section id="inside" className="mt-16 scroll-mt-28 bg-ink py-[52px] text-white md:mt-[88px] md:py-[72px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-[18px]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-pool">
              {effectiveMode === "tour" ? t.walkthrough360 : t.photoWalkthrough}
            </p>
            <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">
              {effectiveMode === "tour" ? t.seeBeforeYouFly(unit.name) : t.insideThe(unit.name)}
            </h2>
            <p className="mt-3 max-w-[40em] text-[17px] text-white/[0.78]">
              {t.everyRoomShot} {hasTour ? t.dragOrSwitch : t.useArrows}
            </p>
          </div>
          {hasTour && (
            <div className="inline-flex gap-[3px] rounded-xl border border-white/[0.18] bg-white/10 p-1" role="group" aria-label={t.showLabel}>
              {seg("tour", t.tour360)}
              {seg("gallery", t.photosCount(photos.length))}
            </div>
          )}
        </div>

        {/* Apartment tabs — switch the band's active unit. The active fill is one
            shared element that slides between tabs; static with reduced motion. */}
        <div className="mt-7 flex flex-wrap gap-2.5" role="group" aria-label={t.chooseApartment}>
          {content.units.map((u) => {
            const on = u.slug === unit.slug;
            return (
              <button
                key={u.slug}
                type="button"
                onClick={() => setSelected(u.slug)}
                aria-pressed={on}
                className={`relative inline-flex min-h-12 items-center gap-2.5 rounded-xl border-[1.5px] px-[18px] transition-colors ${
                  on ? "border-white text-ink" : "border-white/[0.24] bg-white/5 text-white hover:border-white"
                }`}
              >
                {on &&
                  (reduced ? (
                    <span className="absolute inset-0 rounded-[10px] bg-white" />
                  ) : (
                    <motion.span
                      layoutId="unitPill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-[10px] bg-white"
                    />
                  ))}
                <span className="relative z-10 text-[15px] font-bold">{u.name}</span>
                <span className={`relative z-10 font-mono text-[13px] ${on ? "text-lagoon" : "text-sky"}`}>
                  {display(u.priceUsd, currency, content.fxRate)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-[18px] grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Media: 360 tour or gallery */}
          <div className="min-w-0">
            {effectiveMode === "tour" ? (
              <Tour key={unit.slug} nodes={unit.tour} tone="dark" />
            ) : (
              <>
                <div
                  className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.14] bg-white/5"
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
                  <span className="pointer-events-none absolute left-3.5 top-3.5 z-10 rounded-full border border-white/[0.22] bg-ink/65 px-3 py-2 text-[13px] font-semibold backdrop-blur">
                    {t.photoOf(index + 1, photos.length)}
                  </span>
                  <div className="absolute bottom-3.5 right-3.5 z-10 flex gap-2">
                    <button type="button" onClick={() => go(-1)} aria-label={t.previousPhoto} className={PHOTO_NAV}>
                      <ChevronIcon dir="left" className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => go(1)} aria-label={t.nextPhoto} className={PHOTO_NAV}>
                      <ChevronIcon dir="right" className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-base font-semibold text-white/90">{photo.alt || unit.name}</p>
              </>
            )}
          </div>

          {/* Details — cross-fade when the active unit changes */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.aside
              key={unit.slug}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-3"
            >
              <div className="rounded-2xl border border-white/[0.18] bg-white/[0.06] p-5">
                <h3 className="text-[22px] font-extrabold tracking-[-0.02em]">{unit.name}</h3>
                <p className="mt-0.5 text-[15px] text-white/75">{unit.tagline}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2.5 border-t border-white/[0.16] pt-3.5">
                  {unitFacts(unit).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/60">{t[k]}</dt>
                      <dd className="text-[17px] font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {unit.space.length > 0 && (
                <ul className="grid gap-3 rounded-2xl border border-white/[0.18] bg-white/[0.06] p-5">
                  {unit.space.map((s) => (
                    <li key={s.key}>
                      {/* room name as the label, so values like "Full" never read as headings */}
                      <span className="block font-mono text-xs uppercase tracking-[0.1em] text-white/60">{s.key}</span>
                      <b className="mt-0.5 block text-[15px]">{s.title}</b>
                      <span className="text-sm leading-[1.5] text-white/75">{s.desc}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={localePath(locale, `/apartments/${unit.slug}`)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-[11px] bg-white text-base font-extrabold text-ink transition-colors hover:bg-sand"
              >
                {t.seeThe(unit.name)} <ArrowIcon />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setScope(unit.slug);
                  openPicker();
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-white/30 text-[15px] font-bold transition-colors hover:border-white"
              >
                <CalendarIcon />
                {t.checkDates}
              </button>
            </motion.aside>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
