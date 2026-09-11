import type { SiteContent } from "@/lib/content";
import { whatsappHref } from "@/lib/money";

/**
 * "Who you're renting from" — the trust layer the improvement plan flags as the
 * conversion blocker. Bio + owner facts, no reviews yet (real OTA quotes with
 * named attribution + source link go in the marked slot later). Portrait is a
 * placeholder awaiting a real photo of Henrik.
 */
export default function Trust({ content }: { content: SiteContent }) {
  const tiles = [
    { v: "< 2 h", c: "Typical reply on WhatsApp" },
    { v: "2023", c: "Owner since" },
    { v: "EN · DE · ES", c: "Languages" },
  ];

  return (
    <section id="who" className="scroll-mt-28 pt-[70px]">
      <div className="mx-auto max-w-[1200px] px-7">
        <div className="grid gap-6 rounded-[18px] border border-hair bg-surface p-[30px] md:grid-cols-[240px_1fr]">
          {/* Portrait placeholder */}
          <div className="flex aspect-[4/5] max-w-[240px] items-center justify-center rounded-[14px] border border-dashed border-hair-strong bg-page p-3 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Photo of Henrik — to add
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">Who you&rsquo;re renting from</p>
            <h2 className="mt-2 text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.02em]">
              Henrik owns these four apartments. You deal with him, not an agency.
            </h2>
            <p className="mt-3 max-w-[44em] text-[15px] leading-[1.65] text-copy">
              He bought the units in 2023 and has rented them long-term ever since. There is no front desk
              between you and the person responsible for the apartment — if the AC fails on a Sunday, you
              message him and he answers. Rates, terms and the electricity meter are the same whether you find
              him here or on a booking site; here there is simply no commission on top.
            </p>

            <div className="mt-[18px] grid gap-3 sm:grid-cols-3">
              {tiles.map((t) => (
                <div key={t.c} className="rounded-[11px] bg-page px-4 py-3.5">
                  <b className="font-mono text-[19px] font-medium">{t.v}</b>
                  <span className="mt-[3px] block text-[12.5px] text-copy">{t.c}</span>
                </div>
              ))}
            </div>

            <a
              href={whatsappHref(content)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-[10px] bg-olive px-6 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Message Henrik directly
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
