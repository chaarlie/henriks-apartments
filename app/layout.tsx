import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { getSiteContent } from "@/lib/sanity.server";
import { SITE_URL } from "@/lib/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { property, hero } = await getSiteContent();
  const shareTitle = `${property.name} — Furnished monthly rentals in Sosúa`;
  const shareDescription =
    "Transparent monthly pricing in USD/DOP, a guided 360° tour, and WhatsApp booking. Four minutes from Playa Sosúa.";
  const images = hero.background.url ? [{ url: hero.background.url, alt: hero.background.alt }] : undefined;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${property.name} · Furnished monthly rentals in ${property.city}`,
    description:
      "Furnished apartments in El Batey, Sosúa — priced in the open. Rent, power, water and internet all listed, plus a 360° walkthrough of every room. Book any dates, four minutes from Playa Sosúa.",
    // Defaults for pages without their own (unit pages set theirs).
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: "website",
      siteName: property.name,
      images,
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription, images: images?.map((i) => i.url) },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
