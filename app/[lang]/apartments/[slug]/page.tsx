import { ui } from "@/lib/i18n/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteContent, getUnit, getUnitSlugs } from "@/lib/sanity.server";
import { BookingProvider } from "@/lib/booking";
import { unitJsonLd } from "@/lib/structured-data";
import { ogImage } from "@/lib/image-url";
import { unitFacts, unitHighlights } from "@/lib/unit";
import { isLocale, localeAlternates, localePath } from "@/lib/locales";
import JsonLd from "@/app/components/JsonLd";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import AvailabilitySection from "@/app/components/picker/AvailabilitySection";
import StayPickerDialog from "@/app/components/picker/StayPickerDialog";
import BookingForm from "@/app/components/landing/BookingForm";
import MediaViewer from "@/app/components/unit/MediaViewer";
import UnitContent from "@/app/components/unit/UnitContent";
import BookingListingLink from "@/app/components/BookingListingLink";
import BookingCard from "@/app/components/unit/BookingCard";
import UnitActionBar from "@/app/components/unit/UnitActionBar";

/**
 * Slugs only. `lang` is a root parameter supplied by app/[lang]/layout.tsx, and
 * Next runs this once per language — an apartment keeps the same slug in every
 * one, so the Spanish page is the same URL with a prefix.
 */
export async function generateStaticParams() {
  return (await getUnitSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const [unit, content] = await Promise.all([getUnit(slug, lang), getSiteContent(lang)]);
  if (!unit) return {};
  const title = `${unit.name} · ${content.property.name}`;
  const description = unit.about[0] ?? unit.tagline;
  const images = unit.image.url
    ? [{ url: ogImage(unit.image.url), alt: unit.image.alt }]
    : undefined;
  const path = `/apartments/${unit.slug}`;
  return {
    title,
    description,
    alternates: localeAlternates(lang, path),
    // What WhatsApp, Facebook and the admin's share preview show for this page.
    openGraph: {
      type: "website",
      url: localePath(lang, path),
      siteName: content.property.name,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [unit, content] = await Promise.all([getUnit(slug, lang), getSiteContent(lang)]);
  if (!unit) notFound();

  const t = ui(lang);
  // Facts come from this unit's own data — never a shared hardcoded list.
  // The bed is appended here rather than inside unitFacts() on purpose: the
  // three-up spec grids on the cards, the landing carousel and the booking card
  // are all `grid-cols-3`, so a fourth entry would wrap and strand one cell.
  const facts = [
    ...unitFacts(unit).map(([key, value]) => `${t[key]}: ${value}`),
    ...(unit.spec.beds ? [`${t.beds}: ${unit.spec.beds}`] : []),
    ...unitHighlights(unit),
  ];

  return (
    <BookingProvider content={content} unitSlug={unit.slug}>
      <JsonLd data={unitJsonLd(content, unit)} />
      <Header mode="unit" unit={unit} />
      <main className="pb-16 md:pb-[88px]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
          {/* Title */}
          <nav aria-label={t.breadcrumb} className="pt-6 text-[15px] text-copy">
            <Link
              href={localePath(lang, "/#units")}
              className="font-semibold text-lagoon underline underline-offset-[3px]"
            >
              {t.navApartments}
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
            {unit.bookingUrl && (
              <BookingListingLink
                href={unit.bookingUrl}
                title={t.alsoOnBooking}
                note={t.verifyOnBooking}
                className="mt-4"
              />
            )}
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
          heading={t.availability}
          eyebrow={t.anyRangeAnyLength}
          sub={t.arrivalInstructions}
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
