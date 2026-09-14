import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import "./admin.css";

/*
  A ROOT layout, not a nested one.

  The public site moved under app/[lang] so <html lang> can carry the actual
  language, which means there is no longer an app/layout.tsx above this. /admin
  is a static segment, so it keeps matching here rather than being read as a
  language — and it stays English-only, untouched by the locale work.

  It therefore has to render <html> and <body> itself, and load what it used to
  inherit: globals.css for the Tailwind base, and the next/font variables that
  admin.css resolves its --font-* values against.
*/

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

export const metadata: Metadata = {
  title: "Henrik Sosúa — Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
