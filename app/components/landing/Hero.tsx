"use client";

import { useState } from "react";
import Image from "next/image";
import { useContent } from "@/lib/booking";
import { numberWord } from "@/lib/dates";
import VideoModal from "@/app/components/VideoModal";

/** Full-bleed hero. Its bottom edge leaves room for the StayBar, which overlaps it. */
export default function Hero() {
  const { hero, units } = useContent();
  const [playing, setPlaying] = useState(false);

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <Image
        src={hero.background.url}
        alt={hero.background.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_58%]"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(95deg,rgba(6,43,68,0.95)_0%,rgba(6,43,68,0.74)_48%,rgba(6,43,68,0.28)_100%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-28 pt-[52px] sm:px-7 md:pb-[124px] md:pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-sky">{hero.eyebrow}</p>
        <h1 className="mt-3.5 max-w-[12.5em] text-balance text-[clamp(40px,6vw,70px)] font-bold leading-[1.04] tracking-[-0.03em]">
          {hero.headline}
        </h1>
        <p className="mt-[18px] max-w-[33em] text-[clamp(17px,1.6vw,19px)] leading-[1.6] text-white/[0.88]">{hero.sub}</p>

        <div className="mt-7 flex flex-wrap items-center gap-[18px]">
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="flex items-center gap-3 rounded-full bg-white py-[9px] pl-2.5 pr-[22px] text-base font-bold text-ink shadow-[0_14px_34px_-14px_rgba(0,0,0,0.6)] transition-colors hover:bg-sand"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-deep">
              <span className="ml-[3px] h-0 w-0 border-y-8 border-l-[13px] border-y-transparent border-l-white" />
            </span>
            <span className="text-left">
              Watch the walkthrough
              <span className="block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                3-min film · YouTube
              </span>
            </span>
          </button>
          <a
            href="#units"
            className="border-b-[1.5px] border-white/50 pb-0.5 text-base font-semibold transition-colors hover:border-white"
          >
            Browse the {numberWord(units.length).toLowerCase()} apartments
          </a>
        </div>

        <dl className="mt-[42px] flex w-full flex-col overflow-hidden rounded-[14px] border border-white/[0.22] bg-ink/40 backdrop-blur-md md:w-fit md:flex-row">
          {hero.stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-baseline gap-2.5 px-4 py-2.5 md:block md:px-6 md:py-3.5 ${
                i ? "border-t border-white/[0.18] md:border-l md:border-t-0" : ""
              }`}
            >
              <dt className="whitespace-nowrap text-[17px] font-extrabold tracking-[-0.02em] md:text-[22px]">{s.value}</dt>
              <dd className="text-sm text-white/[0.84]">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {playing && <VideoModal videoId={hero.videoId} onClose={() => setPlaying(false)} />}
    </section>
  );
}
