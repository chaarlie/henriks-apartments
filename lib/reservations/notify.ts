import type { SanityClient } from "@sanity/client";
import type { BookingDocument } from "./store.ts";

/** Persisted pending/failed status survives delivery errors. Resend's key makes
 * immediate retries safe if it accepted the email but the response was lost.
 */
export async function notifyOwner(client: SanityClient, booking: BookingDocument) {
  if (booking.notificationStatus === "sent") return;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_NOTIFY_EMAIL;
  const from = process.env.BOOKING_EMAIL_FROM;
  try {
    if (!apiKey || !to || !from) throw new Error("Email not configured");
    const unit = booking.unit ? await client.getDocument<{ name?: string; code?: string }>(booking.unit._ref) : null;
    const message = booking.notificationMessage ?? {
      subject: `New booking request — ${unit?.name || unit?.code || "Apartment"}`,
      text: [
        `Booking: ${booking._id}`, `Apartment: ${unit?.name || booking.unit?._ref || "Whole property"}`,
        `Dates: ${booking.startDate} to ${booking.endDate}`, `Hold expires: ${booking.holdExpiresAt}`,
        `Guest: ${booking.guest.name}`, `Phone: ${booking.guest.phone || "Not supplied"}`,
        `Email: ${booking.guest.email || "Not supplied"}`, `Note: ${booking.note || "None"}`,
        "Open the Bookings section in your admin to confirm, extend, or cancel this hold.",
      ].join("\n"),
    };
    // Freeze the original message before sending: later admin edits must not
    // change the payload associated with the provider's idempotency key.
    if (!booking.notificationMessage) {
      await client.patch(booking._id).ifRevisionId(booking._rev!).set({ notificationMessage: message }).commit();
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `booking-alert/${booking._id}` },
      body: JSON.stringify({ from, to: [to], ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    await client.patch(booking._id).set({ notificationStatus: "sent", notificationSentAt: new Date().toISOString() }).commit();
  } catch {
    // Do not reject or recreate an already accepted booking because email failed.
    const current = await client.getDocument<BookingDocument>(booking._id).catch(() => undefined);
    if (current && current.notificationStatus !== "sent") {
      await client.patch(booking._id).ifRevisionId(current._rev!).set({ notificationStatus: "failed" }).commit().catch(() => {});
    }
    console.error("Booking owner notification failed", booking._id);
  }
}
