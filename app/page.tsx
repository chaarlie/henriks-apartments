import Header from "@/app/components/Header";
import Hero from "@/app/components/Hero";
import Apartments from "@/app/components/apartments/Apartments";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Apartments />
      </main>
      <Footer />
    </>
  );
}
