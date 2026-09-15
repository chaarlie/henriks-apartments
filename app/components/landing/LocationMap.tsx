import { getUi } from "@/lib/i18n/server";
import type { SiteContent } from "@/lib/content";

/**
 * Landing-only location section: an embedded map pinned to the property near the
 * Playa Sosúa / Pedro Clisante landmarks. The "getting around" distances live in
 * the hero; this section adds the actual map Henrik asked for. Not shown on unit
 * pages.
 */
export default async function LocationMap({ content }: { content: SiteContent }) {
  const t = await getUi();
  const { location } = content;
  return (
    <section id="location" className="scroll-mt-28 pb-[84px] pt-[70px]">
      <div className="mx-auto max-w-[1200px] px-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">
          {location.heading}
        </p>
        <h2 className="mt-2 text-[clamp(26px,3.2vw,36px)] font-semibold tracking-[-0.01em]">
          {location.addressLine}
        </h2>
        <p className="mt-2 max-w-[46em] text-[15px] text-copy">
          {t.mapDescription}
        </p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-hair bg-white">
          <iframe
            title={t.mapTitle}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-[420px] w-full"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-70.5250%2C19.7450%2C-70.4920%2C19.7620&layer=mapnik&marker=19.7530%2C-70.5085"
          />
        </div>
      </div>
    </section>
  );
}
