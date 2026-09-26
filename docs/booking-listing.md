# Booking.com listing — captured unit facts

Transcribed from the live listing on 2026-09-20 (the page cannot be fetched;
see `CLAUDE.md`). This is the **reference** for per-unit content. Author the
site's own copy from it — do not paste Booking's prose or bullets verbatim.

Listing base:
`https://www.booking.com/hotel/do/sosua-king-size-bed-pool-24-7-gym-waterfall-shower.html`

## The four apartments

Every unit is a **one-bedroom with one king bed**. There is no studio, no
two-bedroom and no garden loft on the listing.

| | 101 | 201 | 301 | 302 |
| --- | --- | --- | --- | --- |
| Fragment | `#RD1724987401` | `#RD1724987402` | `#RD1724987403` | `#RD1724987404` |
| Listing name | Apartamento de 1 dormitorio | Apartamento de 1 dormitorio | Apartamento de 1 dormitorio | Apartamento de 1 dormitorio **con balcón** |
| Size | 90 m² | 90 m² | 90 m² | **48 m²** |
| Bed | 1 king | 1 king | 1 king | 1 king |
| Baths | 2 | 2 | 2 | **1** |
| Floor | Ground (`planta baja`) | — | Top (`planta superior`) | Top (`planta superior`) |
| Outdoor | **Patio** + outdoor furniture | none | none | **Balcony + terrace** + outdoor furniture |
| Accessible | **Wheelchair accessible** | no | no | no |
| Photos on listing | 35 | 35 | 40 | 26 |

101, 201 and 301 are the same 90 m² plan. What separates them is the floor and
the outdoor space — that difference is the only honest basis for pricing them
apart or writing them different copy.

## Shared by all four

Identical on every unit, so these belong in the **shared** `stayDefaults`
amenities, not in a per-unit `amenitiesOverride`:

- **Kitchen** — stovetop, microwave, kitchenware, dining table, kettle/coffee maker
- **Bathroom** — toilet, bath or shower, walk-in shower, towels, toilet paper
- **View** — pool views
- **Living** — sofa, seating area, dining area, linens, wardrobe, safe, fan,
  air conditioning, flat-screen TV with streaming (Netflix), soundproofing
- **Policy** — no smoking

Per-unit, i.e. what actually goes in an override: size, bath count, floor,
outdoor space, accessibility, and the second sink (101/201/301 only — it comes
with the second bathroom).

## Things the listing does NOT say

Do not assert these on the site without confirming with Henrik:

- **No fridge is listed** on any of the four. `lib/content.ts` currently claims
  one in the shared amenities.
- **No Wi-Fi speed.** The listing says only "WiFi gratis"; the site's
  "200 Mbps fibre" is not sourced from here.
- **No induction.** Booking says `placa de cocina` — a stovetop, type unstated.
  The site currently says "induction hob".
- **No occupancy beyond 1 bed.** Every unit lists one king and nothing else. A
  sofa is present, but "sleeps 4" is not supported by the listing.

## Contradiction — RESOLVED 2026-09-25

201, 301 and 302 each carry **both** of Booking's access lines at once:

> Se puede acceder a las plantas superiores en ascensor
> Las plantas superiores solo son accesibles por escaleras

**Henrik confirmed the elevator works.** The first line is the true one; the
stairs-only line on the listing is wrong and should be corrected there too.

So `stayDefaults.amenities.building` now reads "Elevator to all floors"
(*included*), in both languages, and so does the `buildingAmenities` fallback in
`lib/content.ts`. Before this it said "No elevator — walk-up" and marked it *not
included* — the site was denying a feature it has, to exactly the long-stay
guests who ask first. Do not reintroduce it from the listing.

The unit-level claims are gone: the elevator was a per-unit chip on all four
(including the ground-floor 101, which needs no lift) and was asserted in the
prose. A lift is a property fact, so it belongs in the shared list only.
