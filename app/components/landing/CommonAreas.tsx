"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useContent } from "@/lib/booking";
import { useUi } from "@/lib/i18n/client";
import { COMMON_AREA_KINDS, type CommonArea } from "@/lib/content";
import { Lightbox, useLightboxControls, useLightboxPhoto } from "@/app/components/media/Lightbox";

/**
 * "Beyond your apartment" — the shared pool, lounge, gym and grounds.
 *
 * Sits high on the landing page, directly under the stay bar. It used to be a
 * sub-block inside the amenities section, four sections down and behind a
 * one-at-a-time carousel, which meant seven of the eight photos were reachable
 * only by clicking dots. The property's biggest draw was its least visible
 * asset. So: full-bleed, dark, and every photo on screen at once.
 *
 * The mockup this implements is `mockups/redesign-v5-common-areas.html`. Named
 * here because `mockups/` is gitignored and v4 — the rejected carousel — sits
 * beside it: a review has already measured this component against v4 and
 * reported it as having drifted from the design, when v4 IS the drift.
 *
 * The full-screen viewer is Lightbox, shared with a unit page's gallery. This
 * page composes it with an area name over the caption; that one composes the
 * same parts with alt text. Neither passes the other a flag.
 */

/**
 * Mosaic shape AND the rendition each shape needs. Index-driven so it survives
 * Henrik adding or reordering photos in the Studio — the first is the hero, the
 * fourth runs wide, and anything else is a square.
 *
 * One function returning both on purpose. A tile's width decides its grid span
 * and which image the CDN should send, and those were written in two places: the
 * hero spanned two columns and two rows while asking for a one-column image, so
 * the largest photo in the band — the one everybody looks at first — arrived at
 * roughly half the resolution it was displayed at. Same fact, one home.
 *
 * The widths: the container is max-w-[1200px] inside px-7, so 1144px of content;
 * four columns with 12px gaps make a column (1144 − 36) / 4 ≈ 277px, and a
 * two-column tile 277 × 2 + 12 ≈ 566px. Below lg the grid is two columns, so a
 * square is half the viewport and a wide tile is all of it.
 */
function slot(i: number): { className: string; sizes: string } {
  const wideSizes = "(min-width:1024px) 566px, 100vw";
  // The hero: two columns AND two rows, so it is the tallest thing here too.
  if (i === 0)
    return { className: "col-span-2 row-span-2 min-h-[240px] sm:min-h-[392px]", sizes: wideSizes };
  if (i === 3) return { className: "col-span-2", sizes: wideSizes };
  return { className: "", sizes: "(min-width:1024px) 277px, 50vw" };
}

export default function CommonAreas() {
  const areas = useContent().commonAreas;

  // Nothing to show until Henrik adds photos — an empty dark band is worse
  // than no band.
  if (areas.length === 0) return null;

  return (
    // Lazy: this is one band on a long landing page, and its thumbnail strip
    // is only ever seen inside the viewer. A unit page mounts it eagerly.
    <Lightbox.Provider photos={areas} loading="lazy">
      <Band areas={areas} />
    </Lightbox.Provider>
  );
}

/* Inside the provider, so the tiles can open and prefetch. */
function Band({ areas }: { areas: CommonArea[] }) {
  const t = useUi();
  const reduced = useReducedMotion();
  const { open, warm } = useLightboxControls();
  const [kind, setKind] = useState<string>("all");

  /* Only offer a chip for a kind that actually has photos — an empty filter is
     a dead end, and the counts have to match what clicking it shows. */
  const kinds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of areas) counts.set(a.kind, (counts.get(a.kind) ?? 0) + 1);
    return COMMON_AREA_KINDS.filter((k) => counts.has(k)).map((k) => ({
      k: k as string,
      n: counts.get(k) ?? 0,
    }));
  }, [areas]);

  return (
    <section
      id="commons"
      aria-labelledby="commons-title"
      className="relative mt-16 scroll-mt-28 overflow-hidden bg-ink py-14 text-white md:mt-[88px] md:py-[72px]"
    >
      {/* A single soft pool-coloured wash, so the band has depth without a photo behind it */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] -top-[40%] h-[520px] w-[55%] rounded-full bg-pool/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-7">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-pool">{t.commonsEyebrow}</p>
        <h2
          id="commons-title"
          className="mt-3 max-w-[14em] text-[clamp(32px,4.4vw,50px)] font-extrabold leading-[1.04] tracking-[-0.03em]"
        >
          {t.commonsTitle}
        </h2>
        <p className="mt-3.5 max-w-[46ch] text-[17px] leading-[1.6] text-white/[0.78]">{t.commonsLede}</p>

        {kinds.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t.commonsFilterLabel}>
            {[{ k: "all", n: areas.length }, ...kinds].map(({ k, n }) => {
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={on}
                  className={`inline-flex min-h-[42px] items-center gap-[7px] rounded-full border-[1.5px] px-[18px] text-[14.5px] font-bold transition-colors ${
                    on
                      ? "border-pool bg-pool text-ink"
                      : "border-white/[0.28] bg-white/[0.06] text-white hover:border-white"
                  }`}
                >
                  {k === "all" ? t.kindAll : t.kindLabel(k)}
                  <span className={`font-mono text-[10px] font-medium ${on ? "text-ink/70" : "text-white/70"}`}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {areas.map((a, i) => {
            const dim = kind !== "all" && a.kind !== kind;
            const { className: slotCn, sizes } = slot(i);
            return (
              <motion.button
                key={a.url}
                type="button"
                /*
                  Actually disabled, not just unclickable.

                  `pointer-events-none` alone stopped the mouse and nothing else:
                  a filtered-out tile stayed in the tab order and still opened on
                  Enter, and it announced its ordinary label with no hint it had
                  been filtered — so the keyboard and screen-reader paths ignored
                  the filter the mouse obeyed. `disabled` takes it out of the tab
                  order, blocks activation and exposes the state.

                  The tiles are dimmed rather than removed because slot() keys off
                  the index: dropping one would reshuffle which photo is the hero
                  every time the filter changed.
                */
                disabled={dim}
                onClick={() => open(i)}
                onPointerEnter={() => warm(a.url)}
                onFocus={() => warm(a.url)}
                aria-label={t.openPhotoNamed(a.title || a.label)}
                /* Tiles arrive as the band scrolls in, a beat apart, so the
                   mosaic assembles rather than appearing all at once. Once
                   only — re-animating on every scroll past is noise. */
                initial={reduced ? false : { opacity: 0, y: 14 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(i, 7) * 0.05 }}
                className={`group relative min-h-[150px] overflow-hidden rounded-[14px] text-left transition-[box-shadow,transform] duration-200 sm:min-h-[190px] ${slotCn} ${
                  dim
                    ? "pointer-events-none"
                    : "hover:-translate-y-[3px] hover:shadow-[0_22px_44px_-26px_rgba(0,0,0,0.9)]"
                }`}
              >
                {/*
                  The filter dims THIS span, not the button. framer-motion
                  writes `opacity: 1` inline on the button when the entrance
                  animation lands, and an inline style beats a utility class —
                  so dimming the button did nothing at all. Two owners, two
                  elements.
                */}
                {/*
                  bg-deep lives HERE, not on the button. Dimming a layer that
                  sits on top of a full-strength background just tints the tile
                  blue — the photo fades but the panel behind it does not. With
                  the background on the same layer, the whole tile recedes into
                  the band, which is what the filter should look like.
                */}
                <span
                  className={`absolute inset-0 bg-ink-hover transition-opacity duration-200 ${dim ? "opacity-[0.22]" : "opacity-100"}`}
                >
                  <Image
                    src={a.url}
                    alt={a.alt}
                    fill
                    // Lazy here: this band is one section of a long landing
                    // page. The unit gallery, where the photos are the point,
                    // loads eagerly instead.
                    loading="lazy"
                    // From slot(), so it always matches the span above it.
                    sizes={sizes}
                    placeholder={a.blurDataURL ? "blur" : "empty"}
                    blurDataURL={a.blurDataURL}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 top-[38%] bg-gradient-to-b from-transparent to-[rgba(4,18,30,0.86)]"
                  />
                  <span className="absolute inset-x-4 bottom-3.5 z-[2]">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-pool">{a.label}</span>
                    <span
                      className={`block font-bold leading-[1.25] tracking-[-0.01em] ${i === 0 ? "text-[19px] sm:text-2xl" : "text-[17px]"}`}
                    >
                      {a.title}
                    </span>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => open(0)}
            onPointerEnter={() => warm(areas[0].url)}
            className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white px-[22px] text-base font-extrabold text-ink transition-colors hover:bg-sand"
          >
            {t.viewAllPhotos(areas.length)}
          </button>
        </div>
      </div>

      <Lightbox.Dialog>
        <Lightbox.Stage>
          <Lightbox.Prev />
          <Lightbox.Next />
          <Lightbox.Close />
        </Lightbox.Stage>
        <Lightbox.Caption>
          <AreaCaption areas={areas} />
          <Lightbox.Counter />
        </Lightbox.Caption>
        <Lightbox.Thumbs />
      </Lightbox.Dialog>
    </section>
  );
}

/** The area name and caption belong to this page, so this page writes them. */
function AreaCaption({ areas }: { areas: CommonArea[] }) {
  const photo = useLightboxPhoto();
  const area = areas.find((a) => a.url === photo?.url);
  if (!area) return null;
  return (
    <div className="min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-pool">{area.label}</span>
      <h3 className="mt-0.5 text-[21px] font-bold tracking-[-0.015em]">{area.title}</h3>
      <p className="mt-0.5 max-w-[62ch] text-[14.5px] text-white/[0.62]">{area.alt}</p>
    </div>
  );
}
