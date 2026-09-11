import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteContent, getUnit, getUnitSlugs } from "@/lib/sanity.server";
import { BookingProvider } from "@/lib/booking";
import { unitJsonLd } from "@/lib/structured-data";
import { unitHighlights } from "@/lib/unit";
import JsonLd from "@/app/components/JsonLd";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import AvailabilitySection from "@/app/components/picker/AvailabilitySection";
import StayPickerDialog from "@/app/components/picker/StayPickerDialog";
import BookingForm from "@/app/components/landing/BookingForm";
import MediaViewer from "@/app/components/unit/MediaViewer";
import UnitContent from "@/app/components/unit/UnitContent";
import BookingCard from "@/app/components/unit/BookingCard";
import UnitActionBar from "@/app/components/unit/UnitActionBar";

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
  const title = `${unit.name} · ${content.property.name}`;
  const description = unit.about[0] ?? unit.tagline;
  const images = unit.image.url ? [{ url: unit.image.url, alt: unit.image.alt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/apartments/${unit.slug}` },
    // What WhatsApp, Facebook and the admin's share preview show for this page.
    openGraph: {
      type: "website",
      url: `/apartments/${unit.slug}`,
      siteName: content.property.name,
      title,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images: images?.map((i) => i.url) },
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

  // Facts come from this unit's own data — never a shared hardcoded list.
  const facts = [unit.spec.area, unit.spec.bath, unit.spec.sleeps, ...unitHighlights(unit)];

  return (
    <BookingProvider content={content} unitSlug={unit.slug}>
      <JsonLd data={unitJsonLd(content, unit)} />
      <Header mode="unit" unit={unit} />
      <main className="pb-16 md:pb-[88px]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
          {/* Title */}
          <nav aria-label="Breadcrumb" className="pt-6 text-[15px] text-copy">
            <Link href="/#units" className="font-semibold text-lagoon underline underline-offset-[3px]">
              Apartments
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <span aria-current="page">{unit.name}</span>
          </nav>
          <div className="mb-6 mt-3">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">{unit.code}</p>
            <h1 className="mt-2 text-[clamp(34px,4.6vw,50px)] font-bold leading-[1.04] tracking-[-0.025em]">
              {unit.name}
            </h1>
            <p className="mt-2 text-[17px] text-dense">{unit.tagline}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {facts.map((f) => (
                <li
                  key={f}
                  className="inline-flex items-center rounded-full border-[1.5px] border-line-card bg-surface px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-ink"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <MediaViewer unit={unit} />

          {/* Details + booking */}
          <div className="grid grid-cols-1 items-start gap-9 pt-10 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <UnitContent unit={unit} stay={content.stay} />
            <aside>
              <BookingCard unit={unit} />
            </aside>
          </div>
        </div>

        <AvailabilitySection
          heading="Availability"
          eyebrow="Any range, any length"
          sub="Tap the day you arrive, then how long you’re staying."
        />
        <BookingForm />
      </main>
      <Footer content={content} />
      {/* room for the phone action bar so it never covers the footer */}
      <div aria-hidden className="h-[88px] lg:hidden" />
      <UnitActionBar unit={unit} />
      <StayPickerDialog />
    </BookingProvider>
  );
}
