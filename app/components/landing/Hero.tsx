"use client";

import { useState } from "react";
import Image from "next/image";
import { content } from "@/lib/content";
import VideoModal from "@/app/components/VideoModal";

export default function Hero() {
  const { hero, location } = content;
  const [playing, setPlaying] = useState(false);

  return (
    <section className="relative flex min-h-[clamp(560px,80vh,760px)] items-center overflow-hidden bg-ink">
      <Image
        src={hero.background.url}
        alt={hero.background.alt}
        fill
        priority
        sizes="100vw"
        className="scale-[1.02] object-cover object-[center_58%]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-ink/25"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#9cc6d6]">
          {hero.eyebrow}
        </p>
        <h1 className="text-balance-pretty mt-4 max-w-[14em] text-[clamp(42px,6vw,72px)] font-bold leading-[1.04] tracking-[-0.03em] text-white">
          {hero.headline}
        </h1>
        <p className="mt-5 max-w-[32em] text-lg leading-[1.6] text-white/85">{hero.sub}</p>

        <div className="mt-8 flex flex-wrap items-center gap-[18px]">
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="flex items-center gap-3 rounded-full bg-white py-2.5 pl-3 pr-5 text-[15px] font-bold text-ink shadow-[0_14px_34px_-14px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-px"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-deep">
              <span className="ml-[3px] h-0 w-0 border-y-8 border-l-[13px] border-y-transparent border-l-white" />
            </span>
            <span className="text-left">
              Watch the walkthrough
              <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                3-min film · YouTube
              </span>
            </span>
          </button>
          <a
            href="#units"
            className="border-b border-white/40 pb-0.5 text-sm font-semibold text-white transition-colors hover:border-white"
          >
            Browse apartments
          </a>
        </div>

        <dl className="mt-9 grid max-w-[540px] grid-cols-1 gap-3 sm:grid-cols-3">
          {hero.stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/15 bg-white/10 p-[18px] backdrop-blur-sm"
            >
              <dt className="text-2xl font-bold tracking-[-0.02em] text-white">
                {s.value}
              </dt>
              <dd className="mt-1.5 text-xs leading-tight text-white/80">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>

        {/* Getting around — animated panel over the background image */}
        <div className="pointer-events-none mt-8 w-full max-w-[360px] lg:absolute lg:right-7 lg:top-1/2 lg:mt-0 lg:w-[322px] lg:max-w-none lg:-translate-y-1/2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md [animation:heroFade_0.7s_ease-out_both]">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9cc6d6]">
              {location.heading}
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">{location.addressLine}</p>
            <div className="mt-4">
              {location.distances.map((d, i) => (
                <div
                  key={d.label}
                  className="flex items-baseline justify-between gap-4 py-[7px] font-spec text-[12px] uppercase tracking-[0.06em] text-white [animation:heroFade_0.6s_ease-out_both]"
                  style={{ animationDelay: `${140 + i * 70}ms` }}
                >
                  <span className="font-normal">{d.label}</span>
                  <span className="shrink-0 whitespace-nowrap font-light text-white/70">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {playing && <VideoModal videoId={hero.videoId} onClose={() => setPlaying(false)} />}
    </section>
  );
}
