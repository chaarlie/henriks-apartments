import Image from "next/image";
import { content } from "@/lib/content";

export default function Hero() {
  const { hero } = content;

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Background image */}
      <Image
        src={hero.background.url}
        alt={hero.background.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Legibility overlay: darker at the left where the copy sits */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/30"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-36">
        <div className="max-w-[600px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/80">
            {hero.eyebrow}
          </p>
          <h1 className="text-balance-pretty mt-5 text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-white sm:text-[52px] lg:text-[60px]">
            {hero.headline}
          </h1>
          <p className="text-balance-pretty mt-5 max-w-[480px] text-base leading-[1.65] text-white/85 sm:text-lg">
            {hero.sub}
          </p>

          {/* Stat cards */}
          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {hero.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[10px] border border-white/15 bg-white/10 p-[18px] backdrop-blur-sm"
              >
                <dt className="text-2xl font-bold tracking-[-0.02em] text-white">
                  {stat.value}
                </dt>
                <dd className="mt-1.5 text-xs leading-tight text-white/75">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
