"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useUi } from "@/lib/i18n/client";
import { ChevronIcon } from "@/app/components/icons";
import sanityImageLoader from "@/lib/sanity-image-loader";

/**
 * A full-screen photo viewer, as compound components.
 *
 * Two places need one — the landing page's common areas and a unit page's
 * gallery — and they want different furniture around the same photo: the
 * common areas show an area name and caption, a unit shows alt text and a
 * thumbnail strip of forty-three photos. Written as one component with
 * `showThumbs` / `showCaption` / `variant` props, every new caller would add
 * another boolean and another branch. So the pieces are separate and the
 * caller composes the ones it wants.
 *
 * What the Provider owns, and no caller has to reimplement:
 *
 *   - which photo is showing, and stepping through them
 *   - a native <dialog>, so Escape, focus trapping and the backdrop are the
 *     browser's job
 *   - prefetching. A full-screen view asks the CDN for a much larger rendition
 *     than the thumbnail that was on screen, so without this the first click
 *     costs a cold fetch: ~470ms on the landing page, ~825ms on a unit page.
 *     `warm()` on hover fixes the click; the neighbours are warmed on open so
 *     prev/next are instant too.
 */

export interface LightboxPhoto {
  url: string;
  alt: string;
  blurDataURL?: string;
}

interface LightboxValue {
  state: {
    photos: LightboxPhoto[];
    index: number | null;
    current: LightboxPhoto | null;
  };
  actions: {
    open: (index: number) => void;
    close: () => void;
    /** What the dialog's own close event calls. Escape and the backdrop dismiss
     *  it without going through close(), and a stale index would show the last
     *  photo for a frame the next time it opens. */
    clear: () => void;
    step: (delta: number) => void;
    jump: (index: number) => void;
    /** Pull the full-screen rendition into cache before it is asked for. */
    warm: (url: string) => void;
  };
  meta: {
    dialogRef: React.RefObject<HTMLDialogElement | null>;
    /** The stage's `sizes`. Prefetch reuses it verbatim so it warms exactly the
     *  rendition the stage will ask for. */
    sizes: string;
    /**
     * How the thumbnail strip loads.
     *
     * A unit page IS its gallery — the visitor came to look at the photos, so
     * eager is right there. On the landing page the same strip belongs to one
     * section of many and should wait its turn. Injected by whoever mounts the
     * Provider rather than sniffed from the route.
     */
    loading: "eager" | "lazy";
    reduced: boolean;
  };
}

const LightboxContext = createContext<LightboxValue | null>(null);

function useLightbox(): LightboxValue {
  const value = use(LightboxContext);
  if (!value) throw new Error("Lightbox parts must be rendered inside <Lightbox.Provider>");
  return value;
}

/** Open and prefetch, for callers rendering their own trigger — a motion
 *  button, an image tile, a thumbnail. Keeps them from reaching for the
 *  whole context just to bind a click. */
export function useLightboxControls() {
  const { actions } = useLightbox();
  return { open: actions.open, warm: actions.warm };
}

/** The photo on screen, or null. Lets a caller write its own caption content
 *  as children instead of the component taking a renderCaption prop. */
export function useLightboxPhoto(): LightboxPhoto | null {
  return useLightbox().state.current;
}

/** next/image's default `deviceSizes` — the candidates the stage's srcset
 *  offers, and therefore the only widths the browser will ever request. */
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/** The stage's widest CSS size, from the dialog's `w-[min(1180px,94vw)]`. */
const STAGE_CSS_WIDTH = 1180;

/**
 * The rendition the stage will ask for on this screen.
 *
 * The browser multiplies the CSS width by the device pixel ratio and takes the
 * first candidate at least that big — 1200 at DPR 1, 3840 at DPR 2, both
 * confirmed against the running page. Naming a fixed width instead would warm
 * the wrong URL on every retina screen.
 */
function stageWidth(): number {
  const target = STAGE_CSS_WIDTH * (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  return DEVICE_SIZES.find((w) => w >= target) ?? DEVICE_SIZES[DEVICE_SIZES.length - 1];
}

function Provider({
  photos,
  sizes = "(min-width:1200px) 1180px, 94vw",
  loading = "lazy",
  children,
}: {
  photos: LightboxPhoto[];
  sizes?: string;
  loading?: "eager" | "lazy";
  children: ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const warmed = useRef(new Set<string>());
  const reduced = useReducedMotion() ?? false;

  const warm = useCallback(
    (url: string) => {
      if (!url || warmed.current.has(url)) return;
      warmed.current.add(url);
      /*
        Set `src`, not `srcset`. A detached <img> given only srcset+sizes never
        runs the selection algorithm in Chrome and fetches nothing — measured,
        after trying exactly that. So compute the candidate ourselves.

        Hover is a desktop-only signal anyway; a touch device gets the blur
        placeholder instead, which is why that matters more than this does.
      */
      const image = new window.Image();
      image.src = sanityImageLoader({ src: url, width: stageWidth() });
    },
    [],
  );

  const open = useCallback((i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  const clear = useCallback(() => setIndex(null), []);

  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  const jump = useCallback((i: number) => setIndex(i), []);

  // Arrow keys step through; Escape and the backdrop are the dialog's own.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, step]);

  // Warm the neighbours of whatever is open, so prev/next never wait.
  useEffect(() => {
    if (index === null || photos.length < 2) return;
    warm(photos[(index + 1) % photos.length].url);
    warm(photos[(index - 1 + photos.length) % photos.length].url);
  }, [index, photos, warm]);

  const value = useMemo<LightboxValue>(
    () => ({
      state: { photos, index, current: index === null ? null : (photos[index] ?? null) },
      actions: { open, close, clear, step, jump, warm },
      meta: { dialogRef, sizes, loading, reduced },
    }),
    [photos, index, open, close, clear, step, jump, warm, sizes, loading, reduced],
  );

  return <LightboxContext value={value}>{children}</LightboxContext>;
}

/** The frame. Renders nothing until something is open, so the markup for a
 *  closed viewer costs an empty <dialog> and no images. */
function Dialog({ children }: { children: ReactNode }) {
  const {
    state: { current },
    actions: { close, clear },
    meta: { dialogRef, reduced },
  } = useLightbox();

  return (
    <dialog
      ref={dialogRef}
      onClose={clear}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      /*
        m-auto is load-bearing. The UA stylesheet centres an open modal dialog
        with `margin:auto`, and Tailwind's preflight zeroes margin on every
        element — without this the dialog pins to the top-left.
      */
      className="m-auto max-h-[94vh] w-[min(1180px,94vw)] max-w-none overflow-hidden rounded-[18px] bg-ink p-0 text-white backdrop:bg-[rgba(3,18,30,0.86)] backdrop:backdrop-blur-sm"
    >
      {current && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.975 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </dialog>
  );
}

/** The photo itself, crossfading between frames. */
function Stage({ children }: { children?: ReactNode }) {
  const {
    state: { current },
    meta: { sizes, reduced },
  } = useLightbox();
  if (!current) return null;

  return (
    <div className="relative aspect-[3/2] max-h-[72vh] overflow-hidden bg-[#04121E]">
      {/*
        Both frames sit on the stage for a moment, so stepping through a set
        never flashes the backdrop between photos.
      */}
      <AnimatePresence initial={false}>
        <motion.div
          key={current.url}
          className="absolute inset-0"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <Image
            src={current.url}
            alt={current.alt}
            fill
            sizes={sizes}
            placeholder={current.blurDataURL ? "blur" : "empty"}
            blurDataURL={current.blurDataURL}
            className="object-contain"
          />
        </motion.div>
      </AnimatePresence>
      {children}
    </div>
  );
}

const NAV =
  "absolute top-1/2 z-[2] grid h-[50px] w-[50px] -translate-y-1/2 place-items-center rounded-full border border-white/[0.34] bg-ink/60 backdrop-blur transition-colors hover:bg-deep";

function Prev() {
  const { actions } = useLightbox();
  const t = useUi();
  return (
    <button type="button" onClick={() => actions.step(-1)} aria-label={t.previous} className={`${NAV} left-4`}>
      <ChevronIcon dir="left" className="h-[22px] w-[22px]" />
    </button>
  );
}

function Next() {
  const { actions } = useLightbox();
  const t = useUi();
  return (
    <button type="button" onClick={() => actions.step(1)} aria-label={t.next} className={`${NAV} right-4`}>
      <ChevronIcon dir="right" className="h-[22px] w-[22px]" />
    </button>
  );
}

function Close() {
  const { actions } = useLightbox();
  const t = useUi();
  return (
    <button
      type="button"
      onClick={actions.close}
      className="absolute right-4 top-3.5 z-[2] inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/[0.34] bg-ink/60 px-4 text-sm font-bold backdrop-blur transition-colors hover:bg-deep"
    >
      {t.close} ✕
    </button>
  );
}

/** "Photo 3 of 8". */
function Counter() {
  const {
    state: { photos, index },
  } = useLightbox();
  const t = useUi();
  if (index === null) return null;
  return <span className="font-mono text-[13px] text-sky">{t.photoOf(index + 1, photos.length)}</span>;
}

/** The bar under the photo. Callers put whatever belongs to their page in it —
 *  an area name and caption, or plain alt text — rather than the component
 *  guessing from a flag. */
function Caption({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-[22px] pb-[18px] pt-4">{children}</div>
  );
}

function Thumbs() {
  const {
    state: { photos, index },
    actions: { jump, warm },
    meta: { loading },
  } = useLightbox();
  const t = useUi();

  return (
    <div className="flex gap-2 overflow-x-auto px-[22px] pb-5">
      {photos.map((p, i) => (
        <button
          key={p.url}
          type="button"
          onClick={() => jump(i)}
          onPointerEnter={() => warm(p.url)}
          aria-current={i === index}
          aria-label={t.openPhotoNamed(p.alt)}
          className={`relative h-16 w-24 flex-none overflow-hidden rounded-lg border-2 transition-opacity ${
            i === index ? "border-pool opacity-100" : "border-transparent opacity-55 hover:opacity-100"
          }`}
        >
          <Image
            src={p.url}
            alt=""
            fill
            sizes="96px"
            loading={loading}
            placeholder={p.blurDataURL ? "blur" : "empty"}
            blurDataURL={p.blurDataURL}
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}

export const Lightbox = {
  Provider,
  Dialog,
  Stage,
  Prev,
  Next,
  Close,
  Counter,
  Caption,
  Thumbs,
};
