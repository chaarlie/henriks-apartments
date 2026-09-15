"use client";

import { ui } from "@/lib/i18n/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGE_NAME, LOCALES, localePath, splitLocale } from "@/lib/locales";

/**
 * EN / ES, on the same page.
 *
 * Links, not buttons. Google wants a crawlable anchor between the language
 * versions of a page — a button that navigates in JavaScript hides the
 * relationship from a crawler and gains nothing here.
 *
 * It swaps only the prefix, so you stay on the apartment you were reading
 * rather than being dumped on the home page. The current language is read from
 * the URL rather than passed in, so this drops into any page without the parent
 * knowing it exists.
 *
 * Renders nothing when there is only one language configured, so adding or
 * removing a locale in lib/locales.ts is the whole change.
 */
export default function LocaleSwitcher() {
  const { locale, path } = splitLocale(usePathname());
  if (LOCALES.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={ui(locale).language}
      className="inline-flex items-center rounded-full border-[1.5px] border-hair p-[2px]"
    >
      {LOCALES.map((l) => {
        const current = l === locale;
        return (
          <Link
            key={l}
            href={localePath(l, path)}
            hrefLang={l}
            aria-current={current ? "true" : undefined}
            className={`inline-flex min-h-[34px] items-center rounded-full px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
              current ? "bg-ink text-white" : "text-copy hover:text-ink"
            }`}
          >
            {l}
            {/* The chip says "ES"; a screen reader should hear the language. */}
            <span className="sr-only"> — {LANGUAGE_NAME[l]}</span>
          </Link>
        );
      })}
    </div>
  );
}
