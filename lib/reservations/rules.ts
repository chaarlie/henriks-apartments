export const DAY_MS = 86_400_000;
export const MAX_STAY_NIGHTS = 400;
export const PROPERTY_TIME_ZONE = "America/Santo_Domingo";
export const REGISTRY_ID = "reservationRegistry";

export type Reservation = {
  _key: string;
  unitId: string | null;
  start: string;
  end: string;
  status: "held" | "confirmed" | "cancelled";
  holdExpiresAt?: string;
  requestHash?: string;
};

export class BookingError extends Error {}

export function propertyToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function textField(value: unknown, label: string, max: number): string {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max) throw new BookingError(`${label} must be at most ${max} characters.`);
  return value.trim();
}

export function validateDates(start: unknown, end: unknown, options: { opening?: string; allowPast?: boolean; now?: Date } = {}) {
  if (!validDate(start) || !validDate(end)) throw new BookingError("Choose valid check-in and check-out dates.");
  if (end <= start) throw new BookingError("Check-out must be after check-in.");
  if (!options.allowPast && start < propertyToday(options.now)) throw new BookingError("Check-in cannot be in the past.");
  if (options.opening && start < options.opening) throw new BookingError(`This apartment opens on ${options.opening}.`);
  if ((Date.parse(end) - Date.parse(start)) / DAY_MS > MAX_STAY_NIGHTS) throw new BookingError(`Stays can be at most ${MAX_STAY_NIGHTS} nights.`);
}

export function validateGuest(value: unknown, required: boolean) {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const name = textField(raw.name, "Guest name", 120);
  const phone = textField(raw.phone, "Phone", 40);
  const email = textField(raw.email, "Email", 254).toLowerCase();
  if (required && !name) throw new BookingError("Add the guest's name.");
  if (required && !phone && !email) throw new BookingError("Add a valid phone number or email address.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BookingError("Enter a valid email address.");
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15)) throw new BookingError("Enter a valid phone number with its country code.");
  return { name, phone, email };
}

export function blocks(row: Reservation, now = Date.now()): boolean {
  return row.status === "confirmed" || (row.status === "held" && Date.parse(row.holdExpiresAt ?? "") > now);
}

export function findConflict(rows: Reservation[], candidate: Reservation, now = Date.now()) {
  if (!blocks(candidate, now)) return undefined;
  return rows.find(row => row._key !== candidate._key && blocks(row, now)
    && (!row.unitId || !candidate.unitId || row.unitId === candidate.unitId)
    && row.start <= candidate.end && row.end >= candidate.start);
}

export function holdExpiry(status: string, existing?: string, hours?: number, now = Date.now()) {
  if (status !== "held") return undefined;
  if (hours !== undefined && (!Number.isInteger(hours) || hours < 1 || hours > 168)) throw new BookingError("Choose a hold duration between 1 and 168 hours.");
  if (hours === undefined && existing) {
    if (Date.parse(existing) <= now) throw new BookingError("This hold expired. Choose Extend hold or confirm the booking.");
    return existing;
  }
  return new Date(now + (hours ?? 24) * 3_600_000).toISOString();
}
