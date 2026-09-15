"use client";

/*
  Interface copy for client components.

  The locale comes from the browser path rather than a prop. lib/locales.ts
  explains why: `next/root-params` is server-only, and threading `lang` down
  through every client component that happens to render a button is exactly the
  kind of sweep that misses one — and a missed one is an English word on a
  Spanish page, which is the bug this whole module exists to fix.

  English is served unprefixed, so splitLocale treats a path with no language
  segment as the default rather than guessing.
*/

import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/locales";
import { ui, type Ui } from "./ui";

/** Interface copy for the language currently in the address bar. */
export function useUi(): Ui {
  const pathname = usePathname();
  return ui(splitLocale(pathname ?? "/").locale);
}

export function useLocale() {
  return splitLocale(usePathname() ?? "/").locale;
}
