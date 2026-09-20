/**
 * "Also listed on Booking.com" — third-party proof that the apartments are real
 * and described honestly.
 *
 * Deliberately a LINK, not a booking path. Sending a guest to Booking costs the
 * commission this site exists to avoid, so it is styled quieter than any CTA and
 * never sits beside the reserve button.
 *
 * Takes an href and its two lines rather than a `Unit`: the same mark belongs on
 * the landing page, where there is no unit to pass and the wording is about the
 * property rather than one apartment. Callers supply already-translated copy, so
 * this stays free of i18n plumbing and works in a client or server tree.
 *
 * The mark is a plain monogram in Booking's blue, NOT their logo artwork —
 * reproducing the real asset is governed by their partner brand guidelines.
 * Swap it for the official mark once those have been checked.
 */
export default function BookingListingLink({
  href,
  title,
  note,
  className = "",
}: {
  href: string;
  title: string;
  note: string;
  className?: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-3 rounded-xl border-[1.5px] border-line-card bg-surface py-2.5 pl-2.5 pr-4 transition-colors hover:border-[#003580] ${className}`}
    >
      <span
        aria-hidden
        className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#003580] text-[15px] font-extrabold tracking-[-0.04em] text-white"
      >
        B.
      </span>
      <span>
        <span className="block text-[14px] font-bold leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-[12.5px] text-copy">{note} ↗</span>
      </span>
    </a>
  );
}
