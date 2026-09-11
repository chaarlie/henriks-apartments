import type { PropertyAmenity } from "@/lib/content";

const Icon = ({ path, className }: { path: string; className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={path} />
  </svg>
);

/** Pick the amenity whose title/desc matches any keyword, else undefined. */
function pick(list: PropertyAmenity[], keywords: string[]) {
  return list.find((a) => keywords.some((k) => `${a.title} ${a.desc}`.toLowerCase().includes(k)));
}

/**
 * Ranked amenities — the two that decide a Sosúa long stay (power, internet) as
 * wide feature cards, the rest as bordered tiles. Falls back to the first two
 * when the keyword match misses, so it never renders empty.
 */
export default function Amenities({ amenities }: { amenities: PropertyAmenity[] }) {
  const power = pick(amenities, ["power", "generator", "inverter"]) ?? amenities[0];
  const net = pick(amenities, ["fibre", "fiber", "mbps", "internet", "wi-fi", "wifi"]) ?? amenities[1];
  const large = [power, net].filter(Boolean) as PropertyAmenity[];
  const small = amenities.filter((a) => !large.includes(a));

  return (
    <section id="amenities" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">What&rsquo;s on site</p>
        <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">
          The two that actually decide it
        </h2>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {large.map((a, i) => {
            const isPower = i === 0;
            return (
              <div key={a.title} className={`rounded-[18px] p-7 text-white ${isPower ? "bg-ink" : "bg-deep"}`}>
                <div className={`grid h-[46px] w-[46px] place-items-center rounded-xl bg-white/[0.12] ${isPower ? "text-pool" : "text-white"}`}>
                  <Icon path={a.icon} className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.02em]">{a.title}</h3>
                <p className="mt-2 text-base leading-[1.6] text-white/85">{a.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {small.map((a) => (
            <div key={a.title} className="flex items-start gap-3.5 rounded-[14px] border-[1.5px] border-line-card bg-surface p-[18px]">
              <div className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[10px] bg-sand text-ink">
                <Icon path={a.icon} className="h-[22px] w-[22px]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">{a.title}</h3>
                <p className="mt-[3px] text-[15px] leading-[1.5] text-copy">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
