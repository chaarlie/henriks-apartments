import { content } from "@/lib/content";

export default function Footer() {
  const { property } = content;
  return (
    <footer className="border-t border-hair py-8">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-7 font-mono text-[11px] uppercase tracking-[0.12em] text-copy">
        <span>
          {property.name} · {property.region}
        </span>
        <span>Book any dates · confirm rates on WhatsApp</span>
      </div>
    </footer>
  );
}
