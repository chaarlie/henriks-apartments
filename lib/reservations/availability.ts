import "server-only";
import { connection } from "next/server";
import { getClient } from "@/sanity/lib/client";
import { availabilityQuery } from "@/sanity/lib/queries";
import { blocks, REGISTRY_ID } from "./rules";
import type { Registry } from "./store";

export async function reservationAvailability() {
  await connection();
  const client = getClient();
  const registry = await client.getDocument<Registry>(REGISTRY_ID);
  // Read-only compatibility before the one-time initialization. Writes fail closed.
  if (!registry) return { data: await client.fetch<{ unit: string | null; start: string; end: string; expiresAt?: string }[]>(availabilityQuery, {}, { cache: "no-store" }) };
  const rows = registry.entries.filter(row => blocks(row));
  const ids = [...new Set(rows.flatMap(row => row.unitId ? [row.unitId] : []))];
  const units = ids.length ? await client.getDocuments<{ slug?: { current?: string } }>(ids) : [];
  const slugs = new Map(units.filter(unit => unit !== null).map(unit => [unit._id, unit.slug?.current]));
  return { data: rows.map(row => ({
    // A deleted apartment must never become a whole-property closure.
    unit: row.unitId ? slugs.get(row.unitId) || row.unitId : null,
    start: row.start, end: row.end,
    expiresAt: row.status === "held" ? row.holdExpiresAt : undefined,
  })) };
}
