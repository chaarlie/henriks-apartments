import type { Unit } from "@/lib/content";

const Divider = () => <div className="my-8 h-px bg-hair-soft" />;

export default function UnitContent({ unit }: { unit: Unit }) {
  return (
    <div>
      {/* About */}
      <section>
        <h2 className="mb-3 text-[26px] font-semibold tracking-[-0.01em]">About this apartment</h2>
        {unit.about.map((p) => (
          <p key={p} className="mb-3.5 max-w-[62ch] text-[15.5px] leading-[1.72] text-dense">
            {p}
          </p>
        ))}
        <p className="max-w-[62ch] text-[15.5px] leading-[1.72] text-dense">
          The building sits one block back from the water on Calle Dr. Rosen — quiet at night, but a
          four-minute walk to Playa Sosúa and the restaurants on Pedro Clisante. A shared pool deck
          with a shaded bar runs the length of the courtyard, and there&rsquo;s an inverter plus a
          generator so the power never actually goes out.
        </p>
      </section>

      <Divider />

      {/* The space */}
      <section>
        <h2 className="mb-3 text-[26px] font-semibold tracking-[-0.01em]">The space</h2>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {unit.space.map((s) => (
            <div key={s.key} className="rounded-xl border border-white/60 bg-surface/50 p-[18px] backdrop-blur-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lagoon">{s.key}</div>
              <div className="mb-1 mt-2 text-base font-bold">{s.title}</div>
              <div className="text-[13.5px] leading-[1.55] text-copy">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* What this place offers */}
      <section id="amenities" className="scroll-mt-28">
        <h2 className="mb-3 text-[26px] font-semibold tracking-[-0.01em]">What this place offers</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            { title: "Inside", list: unit.amenities.inside },
            { title: "Building & connectivity", list: unit.amenities.building },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">{group.title}</h3>
              <ul className="flex flex-col gap-[11px]">
                {group.list.map((a) => (
                  <li
                    key={a.label}
                    className={`flex items-center gap-2.5 text-[14.5px] ${a.included ? "text-dense" : "text-muted"}`}
                  >
                    <span className={a.included ? "text-lagoon" : "text-muted"}>{a.included ? "✓" : "✗"}</span>
                    {a.label}
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
        <h2 className="mb-3 text-[26px] font-semibold tracking-[-0.01em]">Terms &amp; house rules</h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {unit.terms.map((t) => (
            <div key={t.title} className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-5 w-5 shrink-0 text-lagoon">
                <path d={t.icon} />
              </svg>
              <div>
                <div className="text-[15px] font-semibold">{t.title}</div>
                <div className="mt-0.5 text-[13.5px] leading-[1.5] text-copy">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
