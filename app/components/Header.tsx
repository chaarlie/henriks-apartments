import { content } from "@/lib/content";
import { whatsappHref } from "@/lib/money";

const navLinks = [
  { label: "Apartments", href: "#units" },
  { label: "360° tour", href: "#tour" },
  { label: "Photos", href: "#gallery" },
  { label: "Cost estimate", href: "#estimate" },
  { label: "Location", href: "#location" },
];

export default function Header() {
  const { property, availabilityPill } = content;

  return (
    <header className="sticky top-0 z-50 border-b border-hair-soft bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 sm:py-[18px] lg:px-12">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-md bg-deep" aria-hidden />
          <span className="text-base font-bold tracking-[-0.01em] text-ink">
            {property.name}
          </span>
          <span className="hidden rounded bg-sand px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:inline">
            {availabilityPill}
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-lagoon transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <a
          href={whatsappHref(content)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-olive px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:px-[18px]"
        >
          WhatsApp us
        </a>
      </div>
    </header>
  );
}
