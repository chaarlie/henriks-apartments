import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import { getSiteContent } from "@/lib/sanity.server";
import { SITE_URL } from "@/lib/site";
import { ogImage } from "@/lib/image-url";
import { DEFAULT_LOCALE, HREFLANG, LOCALES, isLocale } from "@/lib/locales";

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

/**
 * The root layout lives under [lang] so <html lang> can be the actual language
 * of the page. That makes `lang` a ROOT PARAMETER, readable from any server
 * component via next/root-params instead of being threaded down as a prop.
 *
 * /admin is deliberately outside this tree and carries its own root layout: it
 * is English-only, and keeping it out means the locale refactor never touches
 * the admin or the auth proxy that guards it.
 */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const { property, hero } = await getSiteContent(locale);
  const shareTitle = `${property.name} — Furnished monthly rentals in Sosúa`;
  const shareDescription =
    "Transparent monthly pricing in USD/DOP, a guided 360° tour, and WhatsApp booking. Four minutes from Playa Sosúa.";
  const images = hero.background.url
    ? [{ url: ogImage(hero.background.url), alt: hero.background.alt }]
    : undefined;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${property.name} · Furnished monthly rentals in ${property.city}`,
    description:
      "Furnished apartments in El Batey, Sosúa — priced in the open. Rent, power, water and internet all listed, plus a 360° walkthrough of every room. Book any dates, four minutes from Playa Sosúa.",
    // No `alternates` here on purpose: a canonical set on the root layout is
    // inherited by every page beneath it, which would point the whole site at
    // one URL. Each page sets its own.
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: "website",
      siteName: property.name,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // An unknown first segment is rejected by the pages, which call notFound().
  // The layout only needs a sane value for the lang attribute in the meantime.
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return (
    <html
      lang={HREFLANG[locale]}
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
