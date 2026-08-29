import Image from "next/image";
import type { ImageRef } from "@/lib/content";

/**
 * Flat photo gallery for the selected apartment. The first photo takes a larger
 * tile on desktop; the rest fill a responsive grid. Kept presentational so it
 * re-renders straight from the selected unit's `gallery`.
 */
export default function Gallery({
  images,
  unitName,
}: {
  images: ImageRef[];
  unitName: string;
}) {
  if (images.length === 0) return null;

  return (
    <section id="gallery" className="bg-surface px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">
          {unitName} · Photos
        </p>
        <h2 className="mt-2 text-[26px] font-bold tracking-[-0.025em] text-ink sm:text-[34px]">
          A closer look
        </h2>

        <div className="mt-6 grid auto-rows-[220px] grid-cols-2 gap-2 lg:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={`${img.url}-${i}`}
              className={`relative overflow-hidden rounded-xl ${
                i === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                sizes={i === 0 ? "(min-width: 1024px) 45vw, 100vw" : "(min-width: 1024px) 22vw, 50vw"}
                className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
