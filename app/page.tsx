import { getSiteContent } from "@/lib/sanity.server";
import { BookingProvider } from "@/lib/booking";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Hero from "@/app/components/landing/Hero";
import Search from "@/app/components/landing/Search";
import Inside from "@/app/components/landing/Inside";
import ApartmentCards from "@/app/components/landing/ApartmentCards";
import CostEstimator from "@/app/components/landing/CostEstimator";
import Amenities from "@/app/components/landing/Amenities";
import Calendar from "@/app/components/Calendar";

export default async function Home() {
  const content = await getSiteContent();
  return (
    <BookingProvider content={content}>
      <Header mode="landing" />
      <main>
        <Hero />
        <Search />
        <Inside />
        <ApartmentCards />
        <Amenities amenities={content.amenities} />
        <Calendar
          heading="Check availability"
          eyebrow="Any range, any length"
          sub="Tap a move-in date, then a move-out date. Your range filters the apartments above and carries through to each unit."
        />
        <CostEstimator />
      </main>
      <Footer content={content} />
    </BookingProvider>
  );
}
