import "server-only";
import { getClient } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import {
  adminUnitsQuery,
  adminBookingsQuery,
  adminUnitOptionsQuery,
  adminSettingsQuery,
} from "@/sanity/lib/adminQueries";
import type {
  AdminUnit,
  AdminBooking,
  AdminSettings,
  UnitOption,
  AmenityRow,
  SpaceRow,
  TermRow,
} from "@/lib/admin/types";

type Block = { _type?: string; children?: { text?: string }[] };
function blocksToText(blocks: Block[] | undefined): string {
  return (blocks ?? [])
    .filter((b) => b._type === "block")
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join("\n\n");
}

interface RawAdminUnit {
  _id: string;
  slug: string;
  name: string;
  code?: string;
  tagline?: string;
  hidden?: boolean;
  priceUsd?: number;
  priceNightlyUsd?: number;
  availableFrom?: string;
  spec?: { area?: string; bath?: string; sleeps?: string };
  chips?: string[];
  keywords?: string;
  forSale?: boolean;
  salePriceUsd?: number;
  saleNote?: string;
  about?: Block[];
  space?: SpaceRow[];
  coverImage?: { alt?: string; ref?: string };
  gallery?: { alt?: string; ref?: string }[];
  tour?: {
    stopId?: string;
    name?: string;
    panorama?: string;
    links?: { to?: string; yaw?: string }[];
  }[];
  amenities?: { inside?: AmenityRow[]; building?: AmenityRow[] };
  terms?: TermRow[];
  bookingCount?: number;
}

export async function getAdminUnits(): Promise<AdminUnit[]> {
  const units = await getClient().fetch<RawAdminUnit[]>(
    adminUnitsQuery,
    {},
    { cache: "no-store" },
  );
  return units.map((u) => ({
    _id: u._id,
    slug: u.slug,
    name: u.name,
    code: u.code ?? "",
    tagline: u.tagline ?? "",
    hidden: u.hidden ?? false,
    priceUsd: u.priceUsd ?? 0,
    priceNightlyUsd: u.priceNightlyUsd ?? 0,
    availableFrom: u.availableFrom ?? "",
    spec: {
      area: u.spec?.area ?? "",
      bath: u.spec?.bath ?? "",
      sleeps: u.spec?.sleeps ?? "",
    },
    chips: u.chips ?? [],
    keywords: u.keywords ?? "",
    forSale: u.forSale ?? false,
    salePriceUsd: u.salePriceUsd ?? 0,
    saleNote: u.saleNote ?? "",
    about: blocksToText(u.about),
    space: u.space ?? [],
    amenities: {
      inside: u.amenities?.inside ?? [],
      building: u.amenities?.building ?? [],
    },
    terms: u.terms ?? [],
    bookingCount: u.bookingCount ?? 0,
    cover: u.coverImage?.ref
      ? {
          ref: u.coverImage.ref,
          alt: u.coverImage.alt ?? "",
          url: urlFor(u.coverImage.ref).width(480).height(300).fit("crop").url(),
        }
      : null,
    gallery: (u.gallery ?? [])
      .filter((g) => g.ref)
      .map((g) => ({
        ref: g.ref as string,
        alt: g.alt ?? "",
        url: urlFor(g.ref as string).width(300).height(200).fit("crop").url(),
      })),
    tour: (u.tour ?? []).map((s) => ({
      stopId: s.stopId ?? "",
      name: s.name ?? "",
      panorama: s.panorama ?? "",
      links: (s.links ?? []).map((l) => ({ to: l.to ?? "", yaw: l.yaw ?? "" })),
    })),
  }));
}

export async function getAdminBookings(): Promise<AdminBooking[]> {
  const rows = await getClient().fetch<
    {
      _id: string;
      startDate?: string;
      endDate?: string;
      status?: AdminBooking["status"];
      source?: string;
      note?: string;
      guest?: { name?: string; phone?: string; email?: string };
      unitId?: string | null;
      unit?: string | null;
    }[]
  >(adminBookingsQuery, {}, { cache: "no-store" });
  return rows.map((b) => ({
    _id: b._id,
    unitId: b.unitId ?? null,
    unit: b.unit ?? null,
    start: b.startDate ?? "",
    end: b.endDate ?? "",
    status: b.status ?? "confirmed",
    source: b.source ?? "manual",
    note: b.note ?? "",
    guest: {
      name: b.guest?.name ?? "",
      phone: b.guest?.phone ?? "",
      email: b.guest?.email ?? "",
    },
  }));
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const s = await getClient().fetch<{
    propertyName?: string;
    city?: string;
    region?: string;
    whatsappNumber?: string;
    checkIn?: string;
    checkOut?: string;
    stayNote?: string;
    fxRate?: number;
    fxRateAsOf?: string;
    powerBaseUsd?: number;
    discounts?: { months?: number; pct?: number }[];
    propertyAmenities?: { icon?: string; title?: string; desc?: string }[];
  } | null>(adminSettingsQuery, {}, { cache: "no-store" });
  return {
    propertyName: s?.propertyName ?? "",
    city: s?.city ?? "",
    region: s?.region ?? "",
    whatsappNumber: s?.whatsappNumber ?? "",
    checkIn: s?.checkIn ?? "",
    checkOut: s?.checkOut ?? "",
    stayNote: s?.stayNote ?? "",
    fxRate: s?.fxRate ?? 0,
    fxRateAsOf: s?.fxRateAsOf?.slice(0, 10) ?? "",
    powerBaseUsd: s?.powerBaseUsd ?? 0,
    discounts: (s?.discounts ?? []).map((d) => ({
      months: d.months ?? 0,
      percent: Math.round((d.pct ?? 0) * 1000) / 10,
    })),
    amenities: (s?.propertyAmenities ?? []).map((a) => ({
      icon: a.icon ?? "",
      title: a.title ?? "",
      desc: a.desc ?? "",
    })),
  };
}

export async function getUnitOptions(): Promise<UnitOption[]> {
  return getClient().fetch<UnitOption[]>(
    adminUnitOptionsQuery,
    {},
    { cache: "no-store" },
  );
}
