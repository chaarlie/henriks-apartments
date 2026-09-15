"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { display, whatsappHref } from "@/lib/money";
import { localePath, splitLocale } from "@/lib/locales";
import { useBooking, useContent } from "@/lib/booking";
import { ChatIcon } from "@/app/components/icons";
import { useUi } from "@/lib/i18n/client";

/**
 * Some apartments are on the market as well as on the calendar. The band always
 * invites the question; when Henrik flags units as for sale in /admin they're
 * listed by name with an asking price (or "price on request").
 */
export default function ForSale() {
  const content = useContent();
  const { currency } = useBooking();
  const { locale } = splitLocale(usePathname());
  const t = useUi();
  const listed = content.units.filter((u) => u.forSale);

  return (
    <section id="for-sale" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="grid gap-8 rounded-[20px] bg-ink p-7 text-white md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:p-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-sky">{t.alsoForSale}</p>
            <h2 className="mt-2.5 text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]">
              {t.stayAWhile}
            </h2>
            <p className="mt-4 max-w-[58ch] text-base leading-[1.7] text-white/85">{t.forSaleBody1}</p>
            <p className="mt-3 max-w-[58ch] text-base leading-[1.7] text-white/85">{t.forSaleBody2}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href={whatsappHref(content, { sale: true })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-olive px-6 text-base font-extrabold text-white transition-opacity hover:opacity-90"
              >
                <ChatIcon className="h-[18px] w-[18px]" />
                {t.askForMoreInformation}
              </a>
              <span className="text-[15px] text-white/70">{t.pricesOnRequest}</span>
            </div>
          </div>

          <div className="rounded-[16px] bg-white/[0.08] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-sky">
              {listed.length ? t.onTheMarketNow : t.whatToAskAbout}
            </p>
            {listed.length ? (
              <ul className="mt-4 flex flex-col gap-3.5">
                {listed.map((u) => (
                  <li key={u.slug} className="border-b border-hairblue pb-3.5 last:border-b-0 last:pb-0">
                    <Link href={localePath(locale, `/apartments/${u.slug}`)} className="text-[17px] font-extrabold underline-offset-[3px] hover:underline">
                      {u.name}
                    </Link>
                    <p className="mt-1 text-[15px] text-white/80">
                      <b className="font-bold text-sand2">
                        {u.salePriceUsd ? display(u.salePriceUsd, currency, content.fxRate) : t.priceOnRequest}
                      </b>
                      {u.saleNote
                        ? ` · ${u.saleNote}`
                        : ` · ${t.saleSpecLine(u.spec.area, u.spec.sleeps.replace(/^sleeps\s*/i, ""))}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-[1.6] text-white/85">
                <li>{t.askBullet1}</li>
                <li>{t.askBullet2}</li>
                <li>{t.askBullet3}</li>
                <li>{t.askBullet4}</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
