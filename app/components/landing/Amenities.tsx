import { getUi } from "@/lib/i18n/server";
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

/** How each feature card is painted, in order. Also caps the row at three. */
const FEATURE = [
  { bg: "bg-ink", icon: "text-pool" },
  { bg: "bg-deep", icon: "text-white" },
  { bg: "bg-lagoon", icon: "text-white" },
];

/**
 * Ranked amenities — the three that decide a Sosúa long stay as feature cards,
 * the rest as bordered tiles.
 *
 * Power and internet were the original two. The 24/7 gym joined them because it
 * is one of the few things here a competing apartment down the road cannot
 * match, and it was buried: it appeared in no shared amenity list at all, only
 * inside each unit's own prose, so the homepage never mentioned it.
 *
 * Which tiles get promoted is decided by KEYWORD, not position, so Henrik can
 * reorder or reword the tiles in /admin without the ranking silently changing —
 * and every one of these cards is an ordinary amenity tile he can edit there,
 * gym included.
 *
 * Three guarantees the picks are worth having: they are de-duplicated (two
 * keyword lists matching one tile would otherwise render it twice and drop it
 * from the small tiles), and the row is back-filled by position when a keyword
 * misses, so the layout never collapses to one card because someone renamed
 * something.
 */
export default async function Amenities({ amenities }: { amenities: PropertyAmenity[] }) {
  const t = await getUi();
  const power = pick(amenities, ["power", "generator", "inverter", "electricidad", "planta eléctrica", "inversor"]);
  const net = pick(amenities, ["fibre", "fiber", "mbps", "internet", "wi-fi", "wifi"]);
  const gym = pick(amenities, ["gym", "gimnasio", "fitness", "pesas"]);

  const large: PropertyAmenity[] = [];
  for (const a of [power, net, gym]) if (a && !large.includes(a)) large.push(a);
  for (const a of amenities) {
    if (large.length >= FEATURE.length) break;
    if (!large.includes(a)) large.push(a);
  }
  const small = amenities.filter((a) => !large.includes(a));

  return (
    <section id="amenities" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">{t.onSite}</p>
        <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">
          {t.decidingAmenities}
        </h2>

        {/* Two across at sm so a third card is not squeezed to a column of
            wrapped words on a small tablet; three from md up. */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {large.map((a, i) => {
            const paint = FEATURE[i] ?? FEATURE[FEATURE.length - 1];
            return (
              <div key={a.title} className={`rounded-[18px] p-7 text-white ${paint.bg}`}>
                <div className={`grid h-[46px] w-[46px] place-items-center rounded-xl bg-white/[0.12] ${paint.icon}`}>
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
