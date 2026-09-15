import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteContent } from "@/lib/sanity.server";
import { BookingProvider } from "@/lib/booking";
import { businessJsonLd } from "@/lib/structured-data";
import { isLocale, localeAlternates } from "@/lib/locales";
import { getUi } from "@/lib/i18n/server";
import JsonLd from "@/app/components/JsonLd";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Hero from "@/app/components/landing/Hero";
import StayBar from "@/app/components/landing/StayBar";
import ApartmentCards from "@/app/components/landing/ApartmentCards";
import ForSale from "@/app/components/landing/ForSale";
import Inside from "@/app/components/landing/Inside";
import Amenities from "@/app/components/landing/Amenities";
import AvailabilitySection from "@/app/components/picker/AvailabilitySection";
import StayPickerDialog from "@/app/components/picker/StayPickerDialog";
import BookingForm from "@/app/components/landing/BookingForm";
import Trust from "@/app/components/landing/Trust";
import CostEstimator from "@/app/components/landing/CostEstimator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { alternates: localeAlternates(lang, "/") };
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Everything below reads Sanity content through this one call, so the whole
  // page follows the locale without a single component knowing about languages.
  const content = await getSiteContent(lang);
  const t = await getUi();
  return (
    <BookingProvider content={content}>
      <JsonLd data={businessJsonLd(content)} />
      <Header mode="landing" />
      <main>
        <Hero />
        <StayBar />
        <ApartmentCards />
        <ForSale />
        <Inside />
        <Amenities amenities={content.amenities} />
        <AvailabilitySection
          heading={t.checkAvailability}
          eyebrow={t.anyRangeAnyLength}
          sub={t.availabilityIntro}
        />
        <BookingForm />
        <Trust content={content} />
        <CostEstimator />
      </main>
      <Footer content={content} />
      <StayPickerDialog />
    </BookingProvider>
  );
}
