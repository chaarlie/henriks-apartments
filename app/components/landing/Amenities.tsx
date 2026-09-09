import type { PropertyAmenity } from "@/lib/content";

export default function Amenities({ amenities }: { amenities: PropertyAmenity[] }) {
  return (
    <section id="amenities" className="scroll-mt-28 pt-[70px]">
      <div className="mx-auto max-w-[1200px] px-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">What&rsquo;s on site</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.01em]">
          Amenities across the property
        </h2>
        <div className="mt-[26px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {amenities.map((a) => (
            <div key={a.title} className="rounded-2xl border border-hair bg-surface p-5">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-page text-lagoon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
                  <path d={a.icon} />
                </svg>
              </div>
              <div className="mb-1 mt-3.5 text-base font-bold">{a.title}</div>
              <div className="text-[13.5px] leading-[1.55] text-copy">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
