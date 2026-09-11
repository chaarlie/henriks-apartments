// Shapes shared between the admin server (reads/actions) and the client UI.

export interface AmenityRow {
  label: string;
  included: boolean;
}
export interface SpaceRow {
  key: string;
  title: string;
  desc: string;
}
export interface TermRow {
  icon: string;
  title: string;
  desc: string;
}

export interface MediaImage {
  ref: string;
  url: string;
  alt: string;
}

export interface TourLinkRow {
  to: string;
  yaw: string;
}
export interface TourStopRow {
  stopId: string;
  name: string;
  /** Supabase bucket object path, e.g. "101/101-living-room.JPG". */
  panorama: string;
  links: TourLinkRow[];
}

export interface AdminUnit {
  _id: string;
  slug: string;
  name: string;
  code: string;
  tagline: string;
  hidden: boolean;
  priceUsd: number;
  priceNightlyUsd: number;
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string };
  chips: string[];
  keywords: string;
  /** also on the market — badge on the card + the homepage For sale section */
  forSale: boolean;
  /** asking price in USD; 0 means "price on request" */
  salePriceUsd: number;
  saleNote: string;
  /** Paragraphs joined with blank lines for the textarea editor. */
  about: string;
  space: SpaceRow[];
  amenities: { inside: AmenityRow[]; building: AmenityRow[] };
  terms: TermRow[];
  bookingCount: number;
  cover: MediaImage | null;
  gallery: MediaImage[];
  tour: TourStopRow[];
}

export interface AdminBooking {
  _id: string;
  unitId: string | null;
  unit: string | null;
  start: string;
  end: string;
  status: "held" | "confirmed" | "cancelled";
  source: string;
  note: string;
  guest: { name: string; phone: string; email: string };
}

export interface UnitOption {
  _id: string;
  name: string;
}

/** Payload the client sends back to saveUnit. */
export interface AdminUnitInput {
  _id: string;
  name: string;
  code: string;
  tagline: string;
  slug: string;
  hidden: boolean;
  priceUsd: number;
  priceNightlyUsd: number;
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string };
  chips: string[];
  keywords: string;
  forSale: boolean;
  salePriceUsd: number;
  saleNote: string;
  about: string;
  space: SpaceRow[];
  amenities: { inside: AmenityRow[]; building: AmenityRow[] };
  terms: TermRow[];
  cover: { ref: string; alt: string } | null;
  gallery: { ref: string; alt: string }[];
  tour: TourStopRow[];
}

/** One "What's on site" tile on the homepage. `icon` is SVG path data. */
export interface PropertyAmenityRow {
  icon: string;
  title: string;
  desc: string;
}

export interface DiscountRow {
  months: number;
  /** percent off, e.g. 5 for 5% (stored in Sanity as 0.05) */
  percent: number;
}

/** The siteSettings singleton: property details + the homepage amenity tiles. */
export interface AdminSettings {
  propertyName: string;
  city: string;
  region: string;
  whatsappNumber: string;
  /** e.g. "3:00 PM" */
  checkIn: string;
  /** e.g. "12:00 PM" */
  checkOut: string;
  /** the friendly line under the times */
  stayNote: string;
  fxRate: number;
  /** yyyy-mm-dd the exchange rate last changed */
  fxRateAsOf: string;
  powerBaseUsd: number;
  discounts: DiscountRow[];
  amenities: PropertyAmenityRow[];
}

/** Payload the client sends back to saveProperty. */
export type AdminPropertyInput = Omit<AdminSettings, "fxRateAsOf" | "amenities">;

/** Payload the client sends back to saveBooking. */
export interface AdminBookingInput {
  _id: string | null;
  unitId: string | null;
  start: string;
  end: string;
  status: "held" | "confirmed" | "cancelled";
  guest: { name: string; phone: string; email: string };
  note: string;
}
