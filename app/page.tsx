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
import Trust from "@/app/components/landing/Trust";
import Calendar from "@/app/components/Calendar";
import BookingForm from "@/app/components/landing/BookingForm";

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
          sub="Pick a unit above, then tap a move-in date and a move-out date. The calendar shows that apartment's real availability."
        />
        <BookingForm />
        <Trust content={content} />
        <CostEstimator />
      </main>
      <Footer content={content} />
    </BookingProvider>
  );
}
