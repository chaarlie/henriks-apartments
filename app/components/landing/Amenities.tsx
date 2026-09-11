import type { PropertyAmenity } from "@/lib/content";

const Icon = ({ path, className }: { path: string; className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

/** Pick the amenity whose title/desc matches any keyword, else undefined. */
function pick(list: PropertyAmenity[], keywords: string[]) {
  return list.find((a) => keywords.some((k) => `${a.title} ${a.desc}`.toLowerCase().includes(k)));
}

/**
 * Ranked amenities — the two that decide a Sosúa long stay (power, internet) as
 * wide feature cards, the rest as a small grid. Falls back to the first two when
 * the keyword match misses, so it never renders empty.
 */
export default function Amenities({ amenities }: { amenities: PropertyAmenity[] }) {
  const power = pick(amenities, ["power", "generator", "inverter"]) ?? amenities[0];
  const net = pick(amenities, ["fibre", "fiber", "mbps", "internet", "wi-fi", "wifi"]) ?? amenities[1];
  const large = [power, net].filter(Boolean) as PropertyAmenity[];
  const small = amenities.filter((a) => !large.includes(a));

  return (
    <section id="amenities" className="scroll-mt-28 pt-[70px]">
      <div className="mx-auto max-w-[1200px] px-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">What&rsquo;s on site</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.01em]">
          The two that actually decide it
        </h2>

        <div className="mt-[26px] grid gap-4 sm:grid-cols-2">
          {large.map((a, i) => {
            const isPower = i === 0;
            return (
              <div key={a.title} className={`rounded-2xl p-7 text-white ${isPower ? "bg-ink" : "bg-deep"}`}>
                <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-[11px] ${isPower ? "bg-white/10 text-pool" : "bg-white/10 text-white"}`}>
                  <Icon path={a.icon} className="h-[22px] w-[22px]" />
                </div>
                <h3 className="mt-4 text-[23px] font-bold tracking-[-0.02em]">{a.title}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-white/82">{a.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {small.map((a) => (
            <div key={a.title} className="rounded-xl border border-hair bg-surface p-[18px]">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-page text-lagoon">
                <Icon path={a.icon} className="h-5 w-5" />
              </div>
              <div className="mb-1 mt-3 text-[15px] font-bold">{a.title}</div>
              <div className="text-[13px] leading-[1.5] text-copy">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
