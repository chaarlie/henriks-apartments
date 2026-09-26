import Link from "next/link";
import { isUnroutableRoot } from "@/lib/locales";

/**
 * A link that knows the one address this app cannot navigate to client-side.
 *
 * Use it anywhere the destination might be the site root. `/` has no route file
 * — next.config.ts rewrites it to the default locale — and while a full page load
 * follows that rewrite happily, a client-side navigation asks for `/` with an
 * `RSC` header and is handed HTML instead of a flight payload, so the router
 * 404s. See isUnroutableRoot() for the evidence.
 *
 * So: a plain <a> for the root, and next/link for everything else. The anchor
 * costs a full page load, which is what a "back to the homepage" click was always
 * going to be — a different page with its own data — and it is correct, which
 * <Link> is not. Every other destination keeps prefetching and soft navigation.
 *
 * No "use client" of its own: it holds no state and touches nothing server-only,
 * so it renders on the server from the unit page and gets bundled into the client
 * where the header imports it.
 *
 * The plain <a> is also why the nav links beside the logo were never broken —
 * they were already anchors.
 */
export default function SiteLink({
  href,
  children,
  ...rest
}: { href: string } & Omit<React.ComponentProps<"a">, "href">) {
  if (isUnroutableRoot(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
