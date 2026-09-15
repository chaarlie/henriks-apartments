/*
  Interface copy for server components.

  `lang` is a ROOT parameter — the segment sits above the root layout, so every
  route under app/[lang] shares it and any server component can read it without
  a prop. That is the whole reason the app is laid out that way (see the note in
  app/[lang]/layout.tsx), and it means adding a translated string to a deeply
  nested server component costs nothing at the call sites above it.

  No `import "server-only"` here on purpose: importing next/root-params from a
  client component already fails at build time, so the guard would be duplicate
  machinery guarding the same door.

  Client components use ./client instead — root params cannot cross that
  boundary, and neither can Server Actions or Route Handlers.
*/

import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale } from "@/lib/locales";
import { ui, type Ui } from "./ui";
import type { Locale } from "@/lib/locales";

/** The language this request is being rendered in. */
export async function getLocale(): Promise<Locale> {
  // Typed `string | undefined`: the getter accounts for routes that may not
  // carry the segment at all. Anything that is not a language we publish
  // renders as English rather than throwing — the route already 404s on an
  // unknown segment, and copy is not the layer that should decide that.
  const value = await lang();
  return value !== undefined && isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Interface copy for the language this request is being rendered in. */
export async function getUi(): Promise<Ui> {
  return ui(await getLocale());
}
