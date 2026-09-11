import type { SiteContent } from "@/lib/content";
import { whatsappHref } from "@/lib/money";
import { numberWord } from "@/lib/dates";
import { ChatIcon } from "@/app/components/icons";

/**
 * "Who you're renting from" — the trust layer the improvement plan flags as the
 * conversion blocker. Owner facts in words only: Henrik prefers not to show his
 * face online, so there is deliberately no portrait. Every fact comes from
 * Property details in /admin, so nothing here goes stale in code.
 */

const CODES: Record<string, string> = {
  english: "EN",
  finnish: "FI",
  norwegian: "NO",
  swedish: "SV",
  danish: "DA",
  spanish: "ES",
  german: "DE",
  french: "FR",
  dutch: "NL",
  russian: "RU",
  italian: "IT",
  portuguese: "PT",
};
const code = (name: string) => CODES[name.trim().toLowerCase()] ?? name.trim().slice(0, 2).toUpperCase();

/** ["a","b","c"] → "a, b and c" */
function sentenceList(items: string[]): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export default function Trust({ content }: { content: SiteContent }) {
  const { host } = content;
  const tiles = [
    host.replyTime && { v: host.replyTime, c: "Typical reply on WhatsApp", wide: false },
    host.ownerSince && { v: host.ownerSince, c: "Owner since", wide: false },
    host.languages.length > 0 && {
      v: host.languages.map(code).join(" · "),
      c: host.languages.length > 1 ? `${numberWord(host.languages.length)} languages` : "Language",
      wide: true,
    },
  ].filter(Boolean) as { v: string; c: string; wide: boolean }[];

  return (
    <section id="who" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="rounded-[20px] border-[1.5px] border-line-card bg-surface p-5 md:p-[30px]">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">Who you&rsquo;re renting from</p>
          <h2 className="mt-2.5 max-w-[24em] text-balance text-[clamp(26px,3vw,34px)] font-bold leading-[1.15] tracking-[-0.02em]">
            Henrik owns these {numberWord(content.units.length).toLowerCase()} apartments. You deal with him, not an
            agency.
          </h2>
          <p className="mt-3 max-w-[44em] text-base leading-[1.65] text-copy">{host.note}</p>

          {tiles.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {tiles.map((t) => (
                <div key={t.c} className="rounded-xl bg-sand px-4 py-3.5">
                  <b className={`font-mono font-medium ${t.wide ? "text-base leading-[1.35]" : "text-xl"}`}>{t.v}</b>
                  <span className="mt-0.5 block text-sm text-dense">{t.c}</span>
                </div>
              ))}
            </div>
          )}

          {host.languages.length > 1 && (
            <p className="mt-3 text-[15px] text-copy">
              Message him in {sentenceList(host.languages)} — whichever you&rsquo;re most comfortable in.
            </p>
          )}

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
    </section>
  );
}
