import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { content } from "@/lib/content";

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

const { property } = content;

export const metadata: Metadata = {
  title: `${property.name} · Furnished monthly rentals in ${property.city}`,
  description:
    "Furnished long-term apartments in El Batey, Sosúa — priced in the open. Rent, power, water and internet all listed, plus a 360° walkthrough of every room. One-month minimum, four minutes from Playa Sosúa.",
  openGraph: {
    title: `${property.name} — Furnished monthly rentals in Sosúa`,
    description:
      "Transparent monthly pricing in USD/DOP, a guided 360° tour, and WhatsApp booking. Four minutes from Playa Sosúa.",
    type: "website",
  },
};

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
