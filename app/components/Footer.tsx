import { content } from "@/lib/content";

export default function Footer() {
  const { property } = content;
  return (
    <footer className="border-t border-hair-soft bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>
          {property.name} · {property.region}
        </span>
        <span>One-month minimum · Rates are placeholders, confirm before booking</span>
      </div>
    </footer>
  );
}
