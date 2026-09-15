import type { SanityClient } from "@sanity/client";
import { BookingError, findConflict, REGISTRY_ID, type Reservation } from "./rules.ts";

export type Registry = { _id: string; _rev: string; entries: Reservation[] };
export type BookingDocument = {
  _id: string; _type: "booking"; _rev?: string;
  unit?: { _type: "reference"; _ref: string };
  startDate: string; endDate: string; status: Reservation["status"];
  holdExpiresAt?: string; source: string; note: string;
  guest: { name: string; phone: string; email: string };
  requestHash?: string; notificationStatus?: string;
  notificationMessage?: { subject: string; text: string };
};

export class ConflictError extends BookingError {
  conflict: Reservation;
  constructor(conflict: Reservation) {
    super(`Dates conflict with ${conflict.unitId ? "a booking" : "a whole-property closure"}: ${conflict.start} to ${conflict.end} (${conflict._key}).`);
    this.conflict = conflict;
  }
}

function isRevisionConflict(error: unknown) {
  return (error as { statusCode?: number })?.statusCode === 409;
}

/** The direct document endpoint bypasses GROQ's eventually consistent index.
 * Every booking write must participate in this revision-checked transaction.
 * Initialization is explicit: never silently start with an empty calendar.
 */
export async function writeReservation(client: SanityClient, doc: BookingDocument, expectedRevision?: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const registry = await client.getDocument<Registry>(REGISTRY_ID);
    if (!registry) throw new BookingError("Booking setup is incomplete. Please contact Henrik directly.");
    const previous = await client.getDocument<BookingDocument>(doc._id);
    const receiptId = `bookingReceipt.${doc._id}`;
    if (doc.requestHash && !previous && await client.getDocument(receiptId)) {
      throw new BookingError("This request has already been processed and removed. Refresh before making a new request.");
    }
    if (previous && previous._type !== "booking") throw new BookingError("Invalid booking ID.");
    if (doc.requestHash && previous) {
      if (previous.requestHash !== doc.requestHash) throw new BookingError("This request was already used for different details. Refresh and try again.");
      return previous;
    }
    if (expectedRevision && previous?._rev !== expectedRevision) throw new BookingError("This booking changed in another window. Reload before saving.");
    if (!expectedRevision && previous) throw new BookingError("This booking already exists. Reload before editing.");
    const candidate: Reservation = {
      _key: doc._id, unitId: doc.unit?._ref ?? null,
      start: doc.startDate, end: doc.endDate, status: doc.status,
      ...(doc.holdExpiresAt ? { holdExpiresAt: doc.holdExpiresAt } : {}),
    };
    const conflict = findConflict(registry.entries, candidate);
    if (conflict) throw new ConflictError(conflict);
    const entries = [...registry.entries.filter(row => row._key !== doc._id), candidate];
    let tx = client.transaction().patch(REGISTRY_ID, p => p.ifRevisionId(registry._rev).set({ entries }));
    if (previous) {
      const { _id, _type, _rev, ...fields } = doc;
      void _id; void _type; void _rev;
      tx = tx.patch(doc._id, p => p.ifRevisionId(previous._rev!).set({ ...fields, unit: doc.unit ?? null, holdExpiresAt: doc.holdExpiresAt ?? null }));
    }
    else {
      tx = tx.create(doc);
      if (doc.requestHash) tx = tx.create({ _id: receiptId, _type: "bookingReceipt", requestHash: doc.requestHash });
    }
    try {
      await tx.commit({ visibility: "sync" });
      return (await client.getDocument<BookingDocument>(doc._id))!;
    } catch (error) {
      if (!isRevisionConflict(error)) throw error;
    }
  }
  throw new BookingError("Another booking is being saved. Please try again.");
}

export async function removeReservation(client: SanityClient, id: string, revision: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const registry = await client.getDocument<Registry>(REGISTRY_ID);
    const doc = await client.getDocument<BookingDocument>(id);
    if (!registry || !doc || doc._type !== "booking") throw new BookingError("Booking not found.");
    if (doc._rev !== revision) throw new BookingError("This booking changed. Reload before deleting.");
    try {
      await client.transaction()
        .patch(REGISTRY_ID, p => p.ifRevisionId(registry._rev).set({ entries: registry.entries.filter(row => row._key !== id) }))
        .patch(id, p => p.ifRevisionId(revision).set({ status: "cancelled" }))
        .delete(id).commit({ visibility: "sync" });
      return;
    } catch (error) { if (!isRevisionConflict(error)) throw error; }
  }
  throw new BookingError("Another booking is being saved. Please try again.");
}
