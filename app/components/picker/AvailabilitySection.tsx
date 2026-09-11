import StayPicker from "@/app/components/picker/StayPicker";

/** The on-page availability section: a heading over the inline date picker. */
export default function AvailabilitySection({
  page,
  eyebrow,
  heading,
  sub,
}: {
  page: "landing" | "unit";
  eyebrow: string;
  heading: string;
  sub?: string;
}) {
  return (
    <section id="availability" className="scroll-mt-28 pt-16 md:pt-[88px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <div className="mb-[22px]">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-lagoon">{eyebrow}</p>
          <h2 className="mt-2.5 text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">{heading}</h2>
          {sub && <p className="mt-3 max-w-[40em] text-[17px] text-copy">{sub}</p>}
        </div>
        <StayPicker variant="inline" page={page} />
      </div>
    </section>
  );
}
