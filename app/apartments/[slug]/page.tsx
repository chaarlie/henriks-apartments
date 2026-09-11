import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteContent, getUnit, getUnitSlugs } from "@/lib/sanity.server";
import { BookingProvider } from "@/lib/booking";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Calendar from "@/app/components/Calendar";
import MediaViewer from "@/app/components/unit/MediaViewer";
import UnitContent from "@/app/components/unit/UnitContent";
import BookingCard from "@/app/components/unit/BookingCard";

export async function generateStaticParams() {
  return (await getUnitSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [unit, content] = await Promise.all([getUnit(slug), getSiteContent()]);
  if (!unit) return {};
  return {
    title: `${unit.name} · ${content.property.name}`,
    description: unit.about[0],
  };
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [unit, content] = await Promise.all([getUnit(slug), getSiteContent()]);
  if (!unit) notFound();

  const facts = [unit.spec.area, unit.spec.bath, unit.spec.sleeps, "Split AC", "200 Mbps fibre", "Pool view"];

  return (
    <BookingProvider content={content} initialSlug={unit.slug}>
      <Header mode="unit" unit={unit} />
      <main>
        <div className="mx-auto max-w-[1200px] px-7">
          {/* Title */}
          <div className="pt-[22px] text-[13px] text-copy">
            <Link href="/#units" className="text-copy hover:text-ink">
              Apartments
            </Link>
            &nbsp;/&nbsp;<span>{unit.name}</span>
          </div>
          <div className="mb-6 mt-2.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">{unit.code}</p>
            <h1 className="mt-1.5 text-[clamp(34px,4.6vw,50px)] font-semibold leading-[1.04] tracking-[-0.01em]">
              {unit.name}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {facts.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center rounded-full border border-hair-strong bg-surface px-3.5 py-1.5 font-spec text-[12px] font-bold uppercase tracking-[0.08em] text-ink"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <MediaViewer unit={unit} />

          {/* Details + booking */}
          <div className="grid grid-cols-1 items-start gap-9 pt-9 lg:grid-cols-[1.62fr_1fr]">
            <UnitContent unit={unit} />
            <aside>
              <BookingCard unit={unit} />
            </aside>
          </div>
        </div>

        <Calendar heading="Availability" eyebrow="Any range, any length" sub="Tap a move-in date, then a move-out date." />
      </main>
      <Footer content={content} />
    </BookingProvider>
  );
}
