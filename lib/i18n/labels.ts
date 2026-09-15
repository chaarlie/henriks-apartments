import type { Locale } from "@/lib/locales";

// Existing CMS rows predate translated room labels. Unknown/custom names retain
// their source text until translated through the CMS pipeline.
const rooms: Record<string, string> = {
  "living room": "Sala",
  "kitchen": "Cocina",
  "bedroom": "Dormitorio",
  "bathroom": "Baño",
  "shower": "Ducha",
  "terrace": "Terraza",
  "balcony": "Balcón",
  "dressing area": "Vestidor",
  "mirror": "Espejo",
  "entrance": "Entrada",
  "living / sleeping": "Sala / dormitorio",
  "living / dining / kitchen": "Sala / comedor / cocina",
  "guest bath": "Baño de visitas",
  "primary bedroom": "Dormitorio principal",
  "second bedroom": "Segundo dormitorio",
  "living / dining": "Sala / comedor",
  "outdoor": "Exterior"
};

export function roomLabel(label: string, locale: Locale): string {
  return locale === "es" ? rooms[label.trim().toLowerCase()] ?? label : label;
}
