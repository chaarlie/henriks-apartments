import type { SiteContent } from "@/lib/content";
import { getUi } from "@/lib/i18n/server";

export default async function Footer({ content }: { content: SiteContent }) {
  const t = await getUi();
  const { property } = content;
  return (
    <footer className="border-t border-hair py-8">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-7 font-mono text-[11px] uppercase tracking-[0.12em] text-copy">
        <span>
          {property.name} · {property.region}
        </span>
        <span>{t.footerNote}</span>
      </div>
    </footer>
  );
}
