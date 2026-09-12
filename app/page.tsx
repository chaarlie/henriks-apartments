import type { Metadata } from "next";
import { getSiteContent } from "@/lib/sanity.server";
import { BookingProvider } from "@/lib/booking";
import { businessJsonLd } from "@/lib/structured-data";
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

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const content = await getSiteContent();
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
          heading="Check availability"
          eyebrow="Any range, any length"
          sub="Leave it on “Any apartment” or choose one. Tap the day you arrive, then how long you’re staying."
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
