/**
 * Content layer for the Henrik Sosúa rental site.
 *
 * This module is shaped to mirror how the same content would come out of a
 * Sanity dataset (documents with an `_id`, `_type`, and asset-reference-style
 * image objects carrying a resolved `url`). Today it is a typed local module;
 * swapping it for a Sanity/GROQ fetch later is a data-source change, not a
 * rewrite — components import `content` and never touch the source.
 *
 * NOTE: every rate, date, distance and utility figure below is a realistic
 * PLACEHOLDER modeled on the property (per the handoff). All must be confirmed
 * with the owner before launch — see "Content to confirm" in the handoff README.
 */

// ── Image reference (Sanity-asset shaped) ─────────────────────────────────────
export interface ImageRef {
  url: string;
  alt: string;
  width: number;
  height: number;
}

/** Flat photos currently ship from /public/highlights (resized from the client
 *  originals). The field is a plain URL so it can later point at a Supabase or
 *  Sanity CDN URL with no component change. */
function photo(file: string, alt: string): ImageRef {
  return { url: `/highlights/${file}`, alt, width: 1600, height: 1069 };
}

// ── Supabase bucket (flat photos uploaded here by original filename) ──────────
const SUPABASE_PUBLIC =
  "https://jdomxbzbovlnnlxoqngs.supabase.co/storage/v1/object/public/henriks-apartments";

/** A flat photo served straight from the Supabase bucket. */
function bucketPhoto(file: string, alt: string): ImageRef {
  return { url: `${SUPABASE_PUBLIC}/${file}`, alt, width: 1600, height: 1067 };
}

// ── 360° panoramas (served from Supabase with an on-the-fly resize) ───────────
const SUPABASE_RENDER =
  "https://jdomxbzbovlnnlxoqngs.supabase.co/storage/v1/render/image/public/henriks-apartments";

/** Build a downscaled 2:1 equirectangular URL from a bucket original.
 *  Originals are 6080×3040 (~6 MB); the viewer must never load them full size,
 *  so we request a 2048×1024 derivative (~230 KB). Source is already 2:1, so
 *  `resize=contain` returns an exact, un-cropped equirectangular frame. */
function pano(file: string): string {
  return `${SUPABASE_RENDER}/${file}?width=2048&height=1024&resize=contain&quality=80`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Stat {
  value: string;
  label: string;
}

export interface Unit {
  _id: string;
  _type: "unit";
  name: string;
  /** e.g. "34 m² · 1 bath" */
  spec: string;
  /** monthly rent in USD (the canonical price; DOP is derived via fxRate) */
  priceUsd: number;
  /** human availability, e.g. "Free now" / "Free 15 Sept" */
  availability: string;
  includes: string[];
  /** card cover photo */
  image: ImageRef;
  /** this apartment's 360° walkthrough stops */
  tour: TourNode[];
  /** this apartment's flat photo gallery */
  gallery: ImageRef[];
}

export interface TourLink {
  /** _id of the destination node */
  to: string;
  /** yaw within the panorama, as a photo-sphere-viewer angle string */
  yaw: string;
}

export interface TourNode {
  _id: string;
  _type: "tourNode";
  name: string;
  caption: string;
  panorama: string;
  links: TourLink[];
  /** position of this stop's dot on the plan-view card, as [x%, y%] */
  plan: [number, number];
}

export interface Distance {
  label: string;
  value: string;
}

export interface Discount {
  /** minimum term in months for this tier */
  months: number;
  /** fraction off, e.g. 0.1 for 10% */
  pct: number;
}

export interface SiteContent {
  property: {
    name: string;
    addressLine: string;
    city: string;
    region: string;
    whatsappNumber: string; // digits only, international format
    whatsappMessage: string;
    email: string;
  };
  /** availability pill in the header, e.g. "4 units free · Sept" */
  availabilityPill: string;
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    stats: Stat[];
    background: ImageRef;
  };
  /** DOP per 1 USD — replace with a live/periodically-updated rate */
  fxRate: number;
  units: Unit[];
  power: {
    /** base metered electricity estimate, USD/month */
    baseUsd: number;
    /** multiplier applied to larger units (more AC) */
    highMultiplier: number;
    /** priceUsd above this counts as a "high power" unit */
    highThresholdUsd: number;
  };
  discounts: Discount[];
  location: {
    heading: string;
    addressLine: string;
    distances: Distance[];
  };
}

// ── Data ──────────────────────────────────────────────────────────────────────

/**
 * The 360° walkthrough. Only apartment 1 has been captured so far, so all three
 * units currently share this set as a PLACEHOLDER — replace with per-apartment
 * panoramas as Henrik supplies them (each unit already carries its own `tour`).
 */
const apartmentTour: TourNode[] = [
  {
    _id: "living",
    _type: "tourNode",
    name: "Living room",
    caption:
      "Sofa, dining table, split AC and a pool-view balcony — the cross breeze runs right through.",
    panorama: pano("IMG_20260828_111145_831.JPG"),
    links: [
      { to: "kitchen", yaw: "-55deg" },
      { to: "bath", yaw: "120deg" },
    ],
    plan: [30, 62],
  },
  {
    _id: "kitchen",
    _type: "tourNode",
    name: "Kitchen",
    caption:
      "Induction hob, microwave, full fridge and filtered tap — pots, pans and glassware included.",
    panorama: pano("IMG_20260828_112045_270.JPG"),
    links: [
      { to: "living", yaw: "150deg" },
      { to: "dressing", yaw: "10deg" },
    ],
    plan: [52, 40],
  },
  {
    _id: "dressing",
    _type: "tourNode",
    name: "Dressing area",
    caption:
      "Open wardrobe and linens between the bedroom and the bath, with a queen bed just beyond.",
    panorama: pano("IMG_20260828_112112_675.JPG"),
    links: [
      { to: "kitchen", yaw: "175deg" },
      { to: "bath", yaw: "-40deg" },
    ],
    plan: [70, 54],
  },
  {
    _id: "bath",
    _type: "tourNode",
    name: "Bathroom",
    caption:
      "Walk-in rain shower in black micro-cement, hot water off a pressure pump, and a window that opens.",
    panorama: pano("IMG_20260828_110557_720.JPG"),
    links: [{ to: "dressing", yaw: "60deg" }],
    plan: [84, 70],
  },
];

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

  availabilityPill: "4 units free · Sept",

  hero: {
    eyebrow: "Monthly rentals · El Batey, Sosúa",
    headline: "Furnished apartments, priced in the open.",
    sub: "One-month minimum. Rent, power, water and internet all listed below — plus a 360° walkthrough of every room before you commit.",
    stats: [
      { value: "1 mo", label: "Minimum stay, no agency fee" },
      { value: "4 min", label: "Walk to Playa Sosúa" },
      { value: "24/7", label: "Inverter + generator backup" },
    ],
    background: bucketPhoto(
      "17.jpg",
      "Fully equipped kitchen with black tile, granite counters and open shelving",
    ),
  },

  fxRate: 61, // 1 USD = 61 DOP (PLACEHOLDER)

  units: [
    {
      _id: "studio",
      _type: "unit",
      name: "Studio",
      spec: "34 m² · 1 bath",
      priceUsd: 650,
      availability: "Free now",
      includes: [
        "Water, garbage & fibre included",
        "Weekly cleaning optional",
        "Courtyard view",
      ],
      image: photo("16.jpg", "Studio living area with a sofa and pool-view balcony"),
      tour: apartmentTour,
      gallery: [
        photo("16.jpg", "Studio living area with a sofa and pool-view balcony"),
        photo("10.jpg", "Living space with a tan sofa and glass coffee table"),
        photo("17.jpg", "Compact kitchen with black tile and granite counters"),
        photo("01.jpg", "Bathroom with a black granite vanity and glass shower"),
      ],
    },
    {
      _id: "one-bed",
      _type: "unit",
      name: "One bedroom",
      spec: "52 m² · 1 bath",
      priceUsd: 850,
      availability: "Free 15 Sept",
      includes: [
        "Balcony over the pool",
        "Desk + 200 Mbps fibre",
        "Separate bedroom",
      ],
      image: photo("04.jpg", "One-bedroom suite with a tufted bed and a private balcony"),
      tour: apartmentTour,
      gallery: [
        photo("04.jpg", "Bedroom with a grey tufted bed and a private balcony"),
        photo("03.jpg", "Bedroom with a pool-view balcony and Frida Kahlo artwork"),
        photo("05.jpg", "Bedroom with a sliding barn door and mirrored dresser"),
        photo("06.jpg", "En-suite bathroom finished in black micro-cement"),
      ],
    },
    {
      _id: "two-bed",
      _type: "unit",
      name: "Two bedroom",
      spec: "78 m² · 2 baths",
      priceUsd: 1250,
      availability: "Free 1 Oct",
      includes: [
        "Private stair to the roof",
        "Partial ocean view",
        "Sleeps five",
      ],
      image: photo("13.jpg", "Two-bedroom living room opening onto a pool-view terrace"),
      tour: apartmentTour,
      gallery: [
        photo("11.jpg", "Open-plan living and dining room with a pool-view balcony"),
        photo("13.jpg", "Living room opening onto a pool-view terrace"),
        photo("07.jpg", "Entry and dining area with statement artwork"),
        photo("17.jpg", "Kitchen with black tile, granite counters and open shelving"),
      ],
    },
  ],

  power: {
    baseUsd: 68, // from last year's bills (PLACEHOLDER)
    highMultiplier: 1.5,
    highThresholdUsd: 900,
  },

  discounts: [
    { months: 6, pct: 0.1 },
    { months: 12, pct: 0.15 },
  ],

  location: {
    heading: "Getting around",
    addressLine: "Calle Dr. Rosen, El Batey",
    distances: [
      { label: "Playa Sosúa", value: "4 min walk" },
      { label: "Pedro Clisante", value: "6 min walk" },
      { label: "Supermarket Playero", value: "3 min drive" },
      { label: "POP airport", value: "18 min drive" },
      { label: "Cabarete", value: "17 min drive" },
      { label: "Clinic & pharmacy", value: "5 min walk" },
    ],
  },
};
