import type { Unit } from "@/lib/content";
import { fromIso } from "@/lib/dates";

/** First available day for a unit, as a UTC timestamp. */
export const availableFrom = (u: Unit) => fromIso(u.availableFrom);
