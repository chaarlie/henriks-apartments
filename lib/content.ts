/**
 * Content layer for the Henrik Sosúa rental site.
 *
 * This module is shaped to mirror how the same content would come out of a
 * Sanity dataset (documents with `_id`/`_type`, asset-reference-style image
 * objects carrying a resolved `url`, and the per-unit content sections —
 * "About this apartment", "The space", "What this place offers" and
 * "Terms & house rules" — modelled as their own object types). Today it is a
 * typed local module; swapping it for a Sanity/GROQ fetch later is a
 * data-source change, not a rewrite — components import `content` and never
 * touch the source.
 *
 * NOTE: every rate, date, distance and utility figure below is a realistic
 * PLACEHOLDER modeled on the property. Photos and 360° panoramas are the real
 * Apartment 1 (Unit 101) capture, shared by every unit as a placeholder until
 * the other apartments are shot. Confirm all copy/rates with the owner.
 */

// ── Image reference (Sanity-asset shaped) ─────────────────────────────────────
export interface ImageRef {
  url: string;
  alt: string;
  width: number;
  height: number;
}

/** A flat photo shipped from /public/apt1 (resized from the client originals).
 *  A plain URL so it can later point at a Sanity/Supabase CDN URL unchanged. */
function photo(file: string, alt: string): ImageRef {
  return { url: `/apt1/${file}`, alt, width: 1600, height: 1067 };
}

// ── 360° panoramas (served from Supabase with an on-the-fly resize) ───────────
const SUPABASE_RENDER =
  "https://jdomxbzbovlnnlxoqngs.supabase.co/storage/v1/render/image/public/henriks-apartments";

/** Build a downscaled 2:1 equirectangular URL from a bucket original under 101/.
 *  Originals are ~6 MB; the viewer must never load them full size, so we request
 *  a 2048×1024 derivative (~230 KB). `resize=contain` returns an un-cropped
 *  equirectangular frame. */
function pano(file: string): string {
  return `${SUPABASE_RENDER}/101/${file}?width=2048&height=1024&resize=contain&quality=80`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Stat {
  value: string;
  label: string;
}

/** "The space" — one room/zone card. */
export interface SpaceItem {
  key: string;
  title: string;
  desc: string;
}

/** "What this place offers" — a single amenity line, present or absent. */
export interface Amenity {
  label: string;
  included: boolean;
}

/** "Terms & house rules" — one rule with an inline icon (SVG path data). */
export interface Term {
  icon: string;
  title: string;
  desc: string;
}

export interface TourLink {
  /** _id of the destination node */
  to: string;
  /** yaw within the panorama, as a photo-sphere-viewer angle string (PLACEHOLDER — retune per pano) */
  yaw: string;
}

export interface TourNode {
  _id: string;
  _type: "tourNode";
  name: string;
  caption: string;
  panorama: string;
  links: TourLink[];
}

export interface Unit {
  _id: string;
  _type: "unit";
  /** URL slug for /apartments/[slug] */
  slug: string;
  /** e.g. "Unit 101" */
  code: string;
  name: string;
  tagline: string;
  /** monthly rent in USD (the canonical price; DOP is derived via fxRate) */
  priceUsd: number;
  /** nightly rate in USD for short/vacation stays */
  priceNightlyUsd: number;
  /** refundable deposit by length of stay; empty means no deposit */
  deposits?: DepositTier[];
  /** first available day, ISO (yyyy-mm-dd) */
  availableFrom: string;
  spec: { area: string; bath: string; sleeps: string };
  /** short chips shown on the card */
  chips: string[];
  /** keyword blob for the landing search */
  keywords: string;
  /** card cover photo */
  image: ImageRef;

  // ── Also for sale ──────────────────────────────────────────────────────────
  /** on the market as well as on the calendar */
  forSale?: boolean;
  /** asking price in USD; 0 or missing means "price on request" */
  salePriceUsd?: number;
  /** one line about the sale, shown with the badge */
  saleNote?: string;

  // ── Sanity content sections ────────────────────────────────────────────────
  /** "About this apartment" — paragraphs (portable text in Sanity) */
  about: string[];
  /** "The space" */
  space: SpaceItem[];
  /** "What this place offers" */
  amenities: { inside: Amenity[]; building: Amenity[] };
  /** "Terms & house rules" */
  terms: Term[];

  /** flat photo gallery */
  gallery: ImageRef[];
  /** 360° walkthrough stops */
  tour: TourNode[];
}

export interface Distance {
  label: string;
  value: string;
}

export interface Discount {
  months: number;
  pct: number;
}

/**
 * Refundable deposit for one apartment, by length of stay. The row with the
 * highest `fromMonths` the stay reaches applies; `fromMonths: 0` covers short
 * nightly stays. An amount of 0 means no deposit.
 */
export interface DepositTier {
  fromMonths: number;
  amountUsd: number;
}

/** Property-wide amenity tile for the landing "Amenities" section. */
export interface PropertyAmenity {
  icon: string;
  title: string;
  desc: string;
}

export interface SiteContent {
  property: {
    name: string;
    addressLine: string;
    city: string;
    region: string;
    whatsappNumber: string;
    whatsappMessage: string;
    email: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    /** YouTube video id for the walkthrough */
    videoId: string;
    stats: Stat[];
    background: ImageRef;
  };
  /** "Who you're renting from" — the landing trust section */
  host: {
    /** full names, e.g. ["English", "Finnish"] */
    languages: string[];
    /** year he took over the apartments, e.g. "2026" */
    ownerSince: string;
    /** typical WhatsApp reply, e.g. "< 1 h" */
    replyTime: string;
    /** the paragraph under the heading */
    note: string;
  };
  /** arrival & departure, shown on every apartment page */
  stay: {
    /** e.g. "3:00 PM" */
    checkIn: string;
    /** e.g. "12:00 PM" */
    checkOut: string;
    /** the friendly line under the times */
    note: string;
  };
  /** DOP per 1 USD — replace with a live/periodically-updated rate */
  fxRate: number;
  /** ISO yyyy-mm-dd the rate was last confirmed; "" when unknown */
  fxRateAsOf: string;
  units: Unit[];
  amenities: PropertyAmenity[];
  power: {
    /** metered electricity estimate, USD/month */
    baseUsd: number;
  };
  discounts: Discount[];
  /**
   * Availability derived from Sanity `booking` docs (status held/confirmed).
   * `closures` are whole-property blocks (a booking with no unit); `byUnit` maps
   * a unit slug to that unit's own booked ranges. A day is unavailable for a unit
   * when it falls in a closure or in that unit's ranges. ISO pairs, [start, end]
   * inclusive.
   */
  availability: {
    closures: [string, string][];
    byUnit: Record<string, [string, string][]>;
  };
  location: {
    heading: string;
    addressLine: string;
    distances: Distance[];
  };
}

// ── Icon path data (24×24, stroke) ────────────────────────────────────────────
const ICON = {
  calendar: "M16 2v4M8 2v4M3 10h18M3 4h18v18H3z",
  wifi: "M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01",
  bolt: "M13 2 3 14h7l-1 8 10-12h-7z",
  gate: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  pin: "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zM12 9h.01",
  broom: "M20 7 9 18l-5-5M3 21h18",
  drop: "M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z",
  pool: "M4 20a8 8 0 0 1 16 0M4 14h16M8 14V6a2 2 0 0 1 4 0",
  money: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  house: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  noSmoke: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4.9 4.9l14.2 14.2",
};

// ── Shared Apartment 1 assets (real capture) ──────────────────────────────────
const apt1Gallery: ImageRef[] = [
  photo("08.jpg", "Kitchen with black subway tile and a granite bar"),
  photo("16.jpg", "Living room with a pool-view balcony"),
  photo("10.jpg", "Living room with a tan sofa and glass coffee table"),
  photo("09.jpg", "Open living and dining room"),
  photo("13.jpg", "Living room with the balcony doors open"),
  photo("17.jpg", "Kitchen with granite counters and open shelving"),
  photo("15.jpg", "Kitchen and breakfast bar with a black fridge"),
  photo("03.jpg", "Bedroom with a grey tufted bed and pool-view balcony"),
  photo("04.jpg", "Bedroom with a private balcony"),
  photo("05.jpg", "Bedroom with a sliding barn door and mirrored dresser"),
  photo("01.jpg", "Bathroom with a black granite vanity"),
  photo("06.jpg", "Walk-in rain shower in black micro-cement"),
  photo("14.jpg", "Dining table for six"),
  photo("07.jpg", "Entry hall looking into the dining room"),
];

/** Photos for the One-bedroom suite (from the real listing). */
const primeGallery: ImageRef[] = [
  photo("pr-living.jpg", "Living room with a wall-mounted TV and sliding doors to a pool-view balcony"),
  photo("pr-lounge.jpg", "Open living and dining room with floor-to-ceiling windows"),
  photo("pr-dining.jpg", "Glass dining table for six beside wide windows"),
  photo("pr-kitchen.jpg", "Kitchen with a granite breakfast bar and black cabinetry"),
  photo("pr-bed.jpg", "Bedroom suite with a tufted king bed and balcony access"),
  photo("pr-bed2.jpg", "Bedroom with a sliding glass door through to the en-suite bath"),
  photo("pr-bath.jpg", "En-suite bathroom with sliding glass and a wall safe"),
  photo("pr-shower.jpg", "Walk-in rain shower in dark micro-cement with a window"),
];

/** Real 360° stops from the Supabase 101/ bucket. Links between neighbours use
 *  PLACEHOLDER yaws — retune against the final panos. The stop rail lets guests
 *  jump directly, so navigation works regardless of hotspot tuning. */
const apt1Tour: TourNode[] = [
  {
    _id: "living",
    _type: "tourNode",
    name: "Living room",
    caption:
      "Sofa, glass table, split AC and a pool-view balcony — the cross breeze runs right through.",
    panorama: pano("101-living-room.JPG"),
    links: [
      { to: "kitchen", yaw: "-50deg" },
      { to: "bedroom", yaw: "120deg" },
    ],
  },
  {
    _id: "kitchen",
    _type: "tourNode",
    name: "Kitchen",
    caption:
      "Induction hob, full fridge, microwave and filtered tap — pots, pans and glassware included.",
    panorama: pano("101-kitchen.JPG"),
    links: [
      { to: "living", yaw: "150deg" },
      { to: "terrace", yaw: "10deg" },
    ],
  },
  {
    _id: "bedroom",
    _type: "tourNode",
    name: "Bedroom",
    caption:
      "King bed, mirrored dresser, smart TV and a balcony over the pool.",
    panorama: pano("101-room.JPG"),
    links: [
      { to: "living", yaw: "175deg" },
      { to: "bathroom", yaw: "-40deg" },
    ],
  },
  {
    _id: "bathroom",
    _type: "tourNode",
    name: "Bathroom",
    caption: "Black-granite vanity, a big mirror and a window that opens.",
    panorama: pano("101-bathroom-1.JPG"),
    links: [
      { to: "bedroom", yaw: "60deg" },
      { to: "shower", yaw: "-30deg" },
    ],
  },
  {
    _id: "shower",
    _type: "tourNode",
    name: "Shower",
    caption:
      "Walk-in rain shower in black micro-cement, hot water off a pressure pump.",
    panorama: pano("101-shower.JPG"),
    links: [{ to: "bathroom", yaw: "120deg" }],
  },
  {
    _id: "terrace",
    _type: "tourNode",
    name: "Terrace",
    caption:
      "The shared pool deck and sun terrace, a few steps from your door.",
    panorama: pano("101-terrace.JPG"),
    links: [{ to: "kitchen", yaw: "180deg" }],
  },
];

// Shared amenity sets (placeholder — same for every unit until confirmed)
const insideAmenities: Amenity[] = [
  { label: "Split-system air conditioning + ceiling fans", included: true },
  {
    label: "Full kitchen — induction hob, fridge, microwave, blender",
    included: true,
  },
  { label: "Filtered drinking water on tap", included: true },
  { label: "Smart TVs with streaming", included: true },
  { label: "Walk-in rain shower in black micro-cement", included: true },
  { label: "Fresh linens & towels", included: true },
];
const buildingAmenities: Amenity[] = [
  { label: "200 Mbps fibre + Wi-Fi", included: true },
  { label: "Inverter + generator backup, 24/7", included: true },
  { label: "Shared pool & sun deck", included: true },
  { label: "Gated entry with parking", included: true },
  { label: "Weekly cleaning (optional)", included: true },
  { label: "No elevator — walk-up", included: false },
];
const houseRules: Term[] = [
  {
    icon: ICON.calendar,
    title: "Any length of stay",
    desc: "Book any range of dates — a few weeks or a year. Longer stays unlock a discount.",
  },
  {
    icon: ICON.money,
    title: "Deposit",
    desc: "One month, refundable, returned within 7 days of a clean checkout.",
  },
  {
    icon: ICON.house,
    title: "Power metered",
    desc: "Electricity billed at cost each month; everything else is in the rent.",
  },
  {
    icon: ICON.noSmoke,
    title: "No smoking · quiet after 10",
    desc: "Pets by arrangement. Shared pool deck is for residents only.",
  },
];

// ── Data ──────────────────────────────────────────────────────────────────────
export const content: SiteContent = {
  property: {
    name: "Henrik Sosúa",
    addressLine: "Calle Dr. Rosen, El Batey",
    city: "Sosúa",
    region: "Puerto Plata, DR",
    whatsappNumber: "18095550142", // PLACEHOLDER — confirm real number
    whatsappMessage:
      "Hi Henrik — I'm interested in one of your Sosúa apartments. Is it available for my dates?",
    email: "stay@henriksosua.com", // PLACEHOLDER
  },

  hero: {
    eyebrow: "El Batey, Sosúa · furnished rentals",
    headline: "Live by the sea, on your own dates.",
    sub: "Furnished apartments a four-minute walk from Playa Sosúa — rent, power, water and internet listed in the open, with a 360° walkthrough of every room.",
    videoId: "3EA0J6JyIcA", // PLACEHOLDER — swap for the final walkthrough
    stats: [
      { value: "Any length", label: "No minimum, no agency fee" },
      { value: "4 min", label: "Walk to Playa Sosúa" },
      { value: "24/7", label: "Inverter + generator" },
    ],
    background: photo("cover.jpg", "Pool deck with sun loungers and palms at the property"),
  },

  host: {
    languages: ["English", "Finnish", "Norwegian", "Spanish", "German"],
    ownerSince: "2026",
    replyTime: "< 1 h",
    note: "Henrik comes from the rental business and took over these apartments in 2026.",
  },

  stay: {
    checkIn: "3:00 PM",
    checkOut: "12:00 PM",
    note: "Henrik meets you at the gate with the keys. Flying out later? Leave your bags with him and spend the last morning on the beach.",
  },

  fxRate: 61, // 1 USD = 61 DOP (PLACEHOLDER)
  fxRateAsOf: "",

  units: [
    {
      _id: "studio",
      _type: "unit",
      slug: "studio",
      code: "Unit 101",
      name: "Studio",
      tagline: "El Batey · courtyard view",
      priceUsd: 650,
      priceNightlyUsd: 58,
      availableFrom: "2026-09-05",
      spec: { area: "34 m²", bath: "1 bath", sleeps: "Sleeps 2" },
      chips: ["Sleeps 2", "Split AC", "200 Mbps"],
      keywords: "pool balcony ac kitchen courtyard studio",
      image: photo("16.jpg", "Studio living area with a pool-view balcony"),
      about: [
        "A bright, efficient studio with a pool-view balcony and a cross-breeze that runs right through — split AC, a full induction kitchen, and a walk-in rain shower in black micro-cement.",
      ],
      space: [
        {
          key: "Living / sleeping",
          title: "Studio",
          desc: "Sofa, queen bed, dining nook and a balcony over the pool.",
        },
        {
          key: "Kitchen",
          title: "Full",
          desc: "Induction hob, fridge, microwave, blender and filtered tap water.",
        },
        {
          key: "Bathroom",
          title: "1 full",
          desc: "Walk-in rain shower, hot water off a pressure pump, window that opens.",
        },
      ],
      amenities: { inside: insideAmenities, building: buildingAmenities },
      terms: houseRules,
      gallery: apt1Gallery,
      tour: apt1Tour,
    },
    {
      _id: "one-bed",
      _type: "unit",
      slug: "one-bed",
      code: "2nd floor",
      name: "One-bedroom suite",
      tagline: "Sosúa · pool & 24/7 gym",
      priceUsd: 950, // PLACEHOLDER — listing was for sale (€171,330), set the real monthly rent
      priceNightlyUsd: 82, // PLACEHOLDER
      availableFrom: "2026-09-01",
      spec: { area: "90 m²", bath: "1.5 baths", sleeps: "Sleeps 2" },
      chips: ["90 m²", "Pool & gym", "Furnished"],
      keywords: "one bedroom suite 90 pool gym sauna elevator furnished floor to ceiling windows turnkey parking doorman",
      image: photo("pr-living.jpg", "Open-plan one-bedroom suite with floor-to-ceiling windows"),
      about: [
        "A newly built, turnkey one-bedroom of 90 m² (about 970 sq ft) — larger than most one-beds in the area. A wide open living, dining and kitchen runs across the front, wrapped in floor-to-ceiling windows that pull in the Caribbean light while keeping street noise out.",
        "The bedroom is a proper suite with its own bathroom, and a separate half-bath keeps guests comfortable. Fully furnished and move-in ready, with a shared pool, an on-site 24/7 gym, an elevator, secure parking and a doorman — a few minutes from Sosúa's beaches, shops and restaurants.",
      ],
      space: [
        {
          key: "Living / dining / kitchen",
          title: "Open plan",
          desc: "One bright room across the front, framed by floor-to-ceiling windows.",
        },
        {
          key: "Bedroom",
          title: "En-suite",
          desc: "Spacious bedroom suite with its own full bathroom.",
        },
        {
          key: "Guest bath",
          title: "Half bath",
          desc: "A separate half-bathroom off the living area for guests.",
        },
      ],
      amenities: { inside: insideAmenities, building: buildingAmenities },
      terms: houseRules,
      gallery: primeGallery,
      tour: apt1Tour,
    },
    {
      _id: "two-bed",
      _type: "unit",
      slug: "two-bed",
      code: "Unit 101",
      name: "Two bedroom",
      tagline: "El Batey · partial ocean view",
      priceUsd: 1250,
      priceNightlyUsd: 110,
      availableFrom: "2026-10-01",
      spec: { area: "78 m²", bath: "2 baths", sleeps: "Sleeps 5" },
      chips: ["Sleeps 5", "Roof access", "Ocean view"],
      keywords: "roof ocean view terrace family two bedroom",
      image: photo("13.jpg", "Two-bedroom living room opening onto a terrace"),
      about: [
        "The top-floor apartment, with a private stair up to your own slice of roof and a partial ocean view. Two bedrooms, two baths and an open living-dining room that opens onto a pool-view terrace — the pick for families or a pair of couples.",
      ],
      space: [
        {
          key: "Primary bedroom",
          title: "1 double",
          desc: "King bed, en-suite bath and terrace access.",
        },
        {
          key: "Second bedroom",
          title: "2 singles",
          desc: "Twin beds, ideal for kids or a shared stay.",
        },
        {
          key: "Living / dining",
          title: "Open plan",
          desc: "Sofa, dining for six; opens onto a pool-view terrace.",
        },
        {
          key: "Kitchen",
          title: "Full",
          desc: "Induction hob, fridge, microwave and a granite breakfast bar.",
        },
      ],
      amenities: { inside: insideAmenities, building: buildingAmenities },
      terms: houseRules,
      gallery: apt1Gallery,
      tour: apt1Tour,
    },
    {
      _id: "loft",
      _type: "unit",
      slug: "loft",
      code: "Unit 002",
      name: "Garden loft",
      tagline: "El Batey · garden view",
      priceUsd: 850,
      priceNightlyUsd: 72,
      availableFrom: "2026-09-01",
      spec: { area: "44 m²", bath: "1 bath", sleeps: "Sleeps 2" },
      chips: ["Sleeps 2", "Garden view", "Ground floor"],
      keywords: "loft garden ground floor quiet one bedroom pet friendly patio",
      image: photo("07.jpg", "Garden loft with a shaded patio off the courtyard"),
      about: [
        "A quiet ground-floor loft that opens straight onto the garden — a shaded patio a few steps from the pool, with the palms between you and the street. One bedroom set behind the living room, a full kitchen, and the calmest corner of the property for a longer, slower stay.",
      ],
      space: [
        {
          key: "Living / sleeping",
          title: "1 bedroom",
          desc: "Queen bed set back from an open living room, with a sofa and a work nook.",
        },
        {
          key: "Kitchen",
          title: "Full",
          desc: "Induction hob, fridge, microwave and filtered tap water.",
        },
        {
          key: "Outdoor",
          title: "Private patio",
          desc: "A shaded patio off the garden, a few steps from the pool deck.",
        },
      ],
      amenities: { inside: insideAmenities, building: buildingAmenities },
      terms: houseRules,
      gallery: apt1Gallery,
      tour: apt1Tour,
    },
  ],

  amenities: [
    {
      icon: ICON.pool,
      title: "Shared pool & sun deck",
      desc: "Loungers, a shaded bar and a courtyard that catches the breeze.",
    },
    {
      icon: ICON.wifi,
      title: "200 Mbps fibre",
      desc: "Wi-Fi throughout, fast enough to work and stream from home.",
    },
    {
      icon: ICON.bolt,
      title: "Power that never quits",
      desc: "Inverter plus a generator keep the lights on, 24/7.",
    },
    {
      icon: ICON.gate,
      title: "Gated & parking",
      desc: "Secure entry with on-site parking behind the gate.",
    },
    {
      icon: ICON.pin,
      title: "Walk to the beach",
      desc: "Playa Sosúa is a four-minute stroll down the street.",
    },
    {
      icon: ICON.broom,
      title: "Weekly cleaning",
      desc: "Optional housekeeping to keep the place fresh.",
    },
    {
      icon: ICON.drop,
      title: "Filtered water & AC",
      desc: "Drinking water on tap, plus split AC in every room.",
    },
    {
      icon: ICON.house,
      title: "Furnished & equipped",
      desc: "Move in with a suitcase — kitchen, linens and TVs are all here.",
    },
  ],

  power: {
    baseUsd: 68, // from last year's bills (PLACEHOLDER)
  },

  discounts: [{ months: 6, pct: 0.05 }],

  availability: {
    closures: [["2026-11-20", "2026-12-06"]], // PLACEHOLDER whole-property closure
    byUnit: {},
  },

  location: {
    heading: "Getting around",
    addressLine: "Calle Dr. Rosen, El Batey",
    distances: [
      { label: "Playa Sosúa", value: "4 min walk" },
      { label: "Pedro Clisante", value: "6 min walk" },
      { label: "Clinic & pharmacy", value: "5 min walk" },
      { label: "Supermarket Playero", value: "3 min drive" },
      { label: "Cabarete", value: "17 min drive" },
      { label: "POP airport", value: "18 min drive" },
    ],
  },
};

export function unitBySlug(slug: string): Unit | undefined {
  return content.units.find((u) => u.slug === slug);
}
