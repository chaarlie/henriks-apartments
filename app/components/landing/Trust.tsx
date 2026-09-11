import type { SiteContent } from "@/lib/content";
import { whatsappHref } from "@/lib/money";
import { ChatIcon } from "@/app/components/icons";

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
    <section id="who" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="grid gap-[30px] rounded-[20px] border-[1.5px] border-line-card bg-surface p-5 md:grid-cols-[240px_1fr] md:p-[30px]">
          {/* Portrait placeholder */}
          <div className="flex aspect-[4/5] max-w-[200px] items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-line-card bg-page p-3 text-center font-mono text-xs uppercase tracking-[0.08em] text-muted md:max-w-[240px]">
            Photo of Henrik — to add
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">Who you&rsquo;re renting from</p>
            <h2 className="mt-2.5 text-balance text-[clamp(26px,3vw,34px)] font-bold leading-[1.15] tracking-[-0.02em]">
              Henrik owns these four apartments. You deal with him, not an agency.
            </h2>
            <p className="mt-3 max-w-[44em] text-base leading-[1.65] text-copy">
              He bought the units in 2023 and has rented them long-term ever since. There is no front desk
              between you and the person responsible for the apartment — if the AC fails on a Sunday, you
              message him and he answers. Rates, terms and the electricity meter are the same whether you find
              him here or on a booking site; here there is simply no commission on top.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {tiles.map((t) => (
                <div key={t.c} className="rounded-xl bg-sand px-4 py-3.5">
                  <b className="font-mono text-xl font-medium">{t.v}</b>
                  <span className="mt-0.5 block text-sm text-dense">{t.c}</span>
                </div>
              ))}
            </div>

            <a
              href={whatsappHref(content)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-[22px] inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-olive px-6 text-base font-extrabold text-white transition-opacity hover:opacity-90"
            >
              <ChatIcon className="h-[18px] w-[18px]" />
              Message Henrik directly
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
