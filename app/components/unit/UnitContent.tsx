import type { SiteContent, Unit } from "@/lib/content";
import { CheckIcon, CloseIcon } from "@/app/components/icons";

const Divider = () => <div className="my-10 h-px bg-hair" />;
const H2 = "text-[clamp(24px,2.6vw,30px)] font-bold leading-[1.15] tracking-[-0.02em]";

export default function UnitContent({ unit, stay }: { unit: Unit; stay: SiteContent["stay"] }) {
  return (
    <div>
      {/* About */}
      <section>
        <h2 className={H2}>About this apartment</h2>
        <div className="mt-4 flex max-w-[62ch] flex-col gap-3.5 text-base leading-[1.72] text-dense">
          {unit.about.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p>
            The building sits one block back from the water on Calle Dr. Rosen — quiet at night, but a
            four-minute walk to Playa Sosúa and the restaurants on Pedro Clisante. A shared pool deck
            with a shaded bar runs the length of the courtyard, and there&rsquo;s an inverter plus a
            generator so the power never actually goes out.
          </p>
        </div>
      </section>

      <Divider />

      {/* The space — the room name is the label, the value ("Full", "En-suite") sits under it */}
      <section>
        <h2 className={H2}>The space</h2>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
          {unit.space.map((s) => (
            <div key={s.key} className="rounded-[14px] border-[1.5px] border-line-card bg-surface p-[18px]">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-lagoon">{s.key}</p>
              <p className="mt-1.5 text-[17px] font-extrabold">{s.title}</p>
              <p className="mt-1 text-[15px] leading-[1.55] text-copy">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* What this place offers */}
      <section id="amenities" className="scroll-mt-28">
        <h2 className={H2}>What this place offers</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {[
            { title: "Inside", list: unit.amenities.inside },
            { title: "Building & connectivity", list: unit.amenities.building },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-copy">{group.title}</h3>
              <ul className="flex flex-col gap-3">
                {group.list.map((a) => (
                  <li
                    key={a.label}
                    className={`flex items-start gap-2.5 text-[15px] leading-[1.45] ${a.included ? "text-ink" : "text-copy"}`}
                  >
                    {a.included ? (
                      <CheckIcon className="mt-0.5 h-4 w-4 text-olive" />
                    ) : (
                      <CloseIcon className="mt-0.5 h-4 w-4 text-muted" />
                    )}
                    <span>
                      {a.label}
                      {!a.included && <span className="sr-only"> (not included)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* Terms & house rules */}
      <section id="details" className="scroll-mt-28">
        <h2 className={H2}>Terms &amp; house rules</h2>

        {/* Arrival & departure — the two times every guest asks about first */}
        <div className="mt-4 rounded-[14px] border-[1.5px] border-line-card bg-sand-soft p-[18px]">
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {[
              ["Check-in from", stay.checkIn],
              ["Check-out by", stay.checkOut],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-lagoon">{label}</dt>
                <dd className="mt-1 text-[22px] font-extrabold leading-none">{value}</dd>
              </div>
            ))}
          </dl>
          {stay.note && <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.55] text-dense">{stay.note}</p>}
        </div>

        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {unit.terms.map((t) => (
            <div key={t.title} className="flex items-start gap-3 rounded-[14px] border-[1.5px] border-line-card bg-surface p-4">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-sand text-ink">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                  <path d={t.icon} />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-extrabold">{t.title}</h3>
                <p className="mt-0.5 text-[15px] leading-[1.5] text-copy">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
