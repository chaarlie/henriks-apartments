/*
  Interface copy, in every language the site publishes.

  The translation pipeline in scripts/i18n/ covers Sanity documents — the
  headline, the apartment prose, the amenities. It was never meant to cover the
  chrome around them, so until now a Spanish visitor read translated content
  wrapped in an English interface: "Check dates", "Size / Baths / Sleeps",
  "Free now", the whole calendar and booking form.

  Why a typed module rather than JSON per locale: `es` is declared as
  `typeof en`, so a key added to English without a Spanish counterpart is a
  compile error rather than a silent English word on a Spanish page. That is
  the failure this file exists to prevent, and it should not be possible to
  reintroduce it by forgetting.

  Entries that interpolate are FUNCTIONS, not templates with placeholders.
  Word order differs between languages — "Stop 1 of 6" is "Parada 1 de 6", but
  "See the 201" is "Ver el 201" — and a function lets each language put the
  pieces where its own grammar wants them.

  What is deliberately NOT here: anything from Sanity (that goes through
  scripts/i18n), schema.org vocabulary in lib/structured-data.ts, SVG path data,
  and DOM keyboard names like "ArrowRight". Month and weekday names are not here
  either — those come from Intl in lib/dates.ts, which is correct for every
  language without anyone maintaining a list.
*/

import type { Locale } from "@/lib/locales";

const en = {
  whatsappDefault: "Hi Henrik — I’m interested in an apartment. Is it available?",
  whatsappSale: (property: string, name?: string) =>
    `Hi Henrik — I'd like more information about buying${name ? ` the ${name}` : ` an apartment at ${property}`}. Could you send the price and the details?`,
  whatsappUnit: (name: string, code: string, note?: string) =>
    `Hi Henrik — I'm interested in the ${name} (${code})${note ? `, ${note}` : ""}. Is it available?`,

  loading: "Loading…",
  loadError: "The panorama cannot be loaded",
  moveTwoFingers: "Use two fingers to navigate",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  panoramaLabel: "Drag to look around the 360° panorama",
  mapDescription: "El Batey, Sosúa — a four-minute walk to Playa Sosúa and the restaurants on Pedro Clisante, 18 minutes from Puerto Plata (POP) airport.",
  metaDescription: "Furnished apartments in El Batey, Sosúa. Transparent pricing, a 360° tour and WhatsApp booking, four minutes from Playa Sosúa.",
  startOver: "Start over",
  tapArrivalDayUnit: "Tap your arrival day. Striped days are already booked.",
  rentalTitle: (name: string, city: string) => `${name} · Furnished monthly rentals in ${city}`,
  scopeCleared: (name: string) => `Your dates aren’t free in the ${name}, so they were cleared. Pick new dates.`,
  weeksCount: (n: number) => `${n} week${n === 1 ? "" : "s"}`,
  freeNames: (names: string) => `Free for these dates: ${names}.`,
  firstFreeDay: (date: string) => `Go to the first free day, ${date}`,
  datesFor: (name: string) => `Dates for the ${name}`,
  longestUnit: (name: string, date: string, length: string) => `The ${name} is booked from ${date}, so the longest stay from this arrival is ${length}.`,
  longestAny: (length: string, date: string) => `From this arrival, the longest stay in any apartment is ${length}, leaving ${date}.`,
  bookedFromChoose: (name: string, date: string) => `The ${name} is booked from ${date}. Choose another arrival day.`,
  showFree: (n: number) => `Show ${n} free apartment${n === 1 ? "" : "s"}`,
  leavingAnnouncement: (date: string, count: string) => `Leaving ${date}. ${count}.`,
  arrivingAnnouncement: (date: string) => `Arriving ${date}. Now choose how long you’re staying.`,
  requestUnit: (name: string) => `Request to hold the ${name}`,
  holdConfirmation: (name: string, dates: string) => `We’ve held the ${name} for ${dates}. Henrik will confirm shortly — message him on WhatsApp to lock it in faster.`,
  discountNote: (months: number, pct: number) => `Stays of ${months} months or more get ${pct}% off the rent.`,
  estimateNights: (n: number) => `Estimate for ${n} night${n === 1 ? "" : "s"}`,
  switchUnit: (name: string) => `Switch to the ${name}`,
  unitBooked: (name: string) => `The ${name} is booked during these dates.`,
  holdUnit: (name: string) => `Hold the ${name} — free, nothing to pay`,
  browseCount: (word: string) => `Browse the ${word} apartments`,
  holdFailed: "Could not hold those dates.",
  datesTaken: "Sorry — those dates were just taken. Try a different range.",
  unavailableUnit: "That apartment isn't available.",
  pastCheckin: "That check-in date is in the past.",
  invalidCheckout: "Check-out must be after check-in.",
  addContact: "Add a WhatsApp number or email so Henrik can reach you.",
  addName: "Please add your name.",
  changeLengthNote: "Change the length below, or tap a new arrival day.",
  chooseLengthNote: "Choose a length, or tap your leaving day.",
  arrivalInstructions: "Tap the day you arrive, then how long you’re staying.",
  allBookedNext: "Every apartment is booked the next day. Choose another arrival day.",
  partOfStay: "part of your stay",
  impossibleStay: "not possible for this stay",
  pastDay: "in the past",
  yourLeaving: "your leaving day",
  yourArrival: "your arrival day",
  freeAlternatives: "Free for them:",
  pickDatesFirst: "Pick your dates first.",
  confirmWhatsapp: "Confirm on WhatsApp",
  holding: "Holding…",
  clearDates: "Clear dates",
  changeArrival: "Change arrival day",
  decidingAmenities: "The two that actually decide it",
  onSite: "What’s on site",
  // ── Header and navigation ────────────────────────────────────────────────
  navApartments: "Apartments",
  navInside: "Inside",
  navAmenities: "Amenities",
  navLocation: "Location",
  navDetails: "Details",
  checkDates: "Check dates",
  whatsapp: "WhatsApp",
  whatsappHenrik: "WhatsApp Henrik",
  thisUnit: "This unit",
  language: "Language",

  // ── Stay bar and availability state ──────────────────────────────────────
  yourStay: "Your stay",
  dates: "Dates",
  addDates: "Add dates",
  anyApartment: "Any apartment",
  apartment: "Apartment",
  freeNow: "Free now",
  freeForYourDates: "Free for your dates",
  bookedForYourDates: "Booked for your dates",
  noFreeApartments: "No free apartments",
  noApartmentsForDates: "No apartments free for these dates",
  furnishedApartments: (n: number) => `${n} furnished apartments`,
  showApartments: (n: number) => `Show ${n} apartments`,
  /*
    Availability phrasing. These were template literals built around
    `plural(n, "apartment")`, which applies an English -s to an English noun.
    Spanish has to inflect the adjective too — "1 apartamento libre" against
    "2 apartamentos libres" — so each language builds its own sentence.
  */
  addLeavingDay: "add leaving day",
  freeFrom: (date: string) => `Free from ${date}`,
  bookedFreeAgain: (date: string) => `Booked for your dates · free again ${date}`,
  apartmentsFreeFrom: (n: number, date: string) =>
    `${n} apartment${n === 1 ? "" : "s"} free from ${date}`,
  apartmentsFreeForDates: (n: number) =>
    `${n} apartment${n === 1 ? "" : "s"} free for these dates`,
  oneSetOfDates:
    "One set of dates for the whole page — the apartments, prices and the hold form all follow it.",

  // ── Hero ─────────────────────────────────────────────────────────────────
  watchWalkthrough: "Watch the walkthrough",
  filmNote: "3-min film · YouTube",
  browseApartments: "Browse the four apartments",

  // ── Apartment cards ──────────────────────────────────────────────────────
  theApartments: "The apartments",
  perMonth: "per month",
  nightlyFrom: (price: string) => `or ${price} a night for short stays`,
  seeTheApartment: "See the apartment",
  seeThe: (name: string) => `See the ${name}`,
  ask: "Ask",
  currency: "Currency",
  size: "Size",
  baths: "Baths",
  sleeps: "Sleeps",
  beds: "Bed",

  // ── Booking.com listing ──────────────────────────────────────────────────
  // A trust signal, not a booking route: it lets a guest check the apartment
  // against a third party while the reserve CTA stays on WhatsApp.
  alsoOnBooking: "Also listed on Booking.com",
  verifyOnBooking: "Check this apartment against the listing",

  // ── For sale ─────────────────────────────────────────────────────────────
  alsoForSale: "Also for sale",
  onTheMarketNow: "On the market now",
  askForMoreInformation: "Ask for more information",
  pricesOnRequest: "Prices on request · usually answered the same day",
  priceOnRequest: "Price on request",
  whatToAskAbout: "What to ask about",

  // ── 360° tour and media ──────────────────────────────────────────────────
  walkthrough360: "360° walkthrough",
  tour360: "360° tour",
  photoWalkthrough: "Photo walkthrough",
  photosCount: (n: number) => `Photos · ${n}`,
  dragToLookAround: "Drag to look around",
  dragBadge: "360° · drag to look around",
  flatViewUnavailable: "Flat view · 360° unavailable",
  loadingTour: "Loading 360° tour",
  stopOf: (i: number, total: number) => `Stop ${i} of ${total}`,
  photoOf: (i: number, total: number) => `Photo ${i} of ${total}`,
  openPhotoFullScreen: "Open photo full screen",
  previousPhoto: "Previous photo",
  nextPhoto: "Next photo",
  chooseApartment: "Choose apartment",
  walkthroughVideo: "Walkthrough video",
  closeVideo: "Close video",
  walkthrough: "Walkthrough",

  // ── Availability picker ──────────────────────────────────────────────────
  checkAvailability: "Check availability",
  anyRangeAnyLength: "Any range, any length",
  availabilityIntro:
    "Leave it on “Any apartment” or choose one. Tap the day you arrive, then how long you’re staying.",
  whenDoYouArrive: "When do you arrive?",
  tapArrivalDay: "Tap your arrival day. Striped days are already booked in every apartment.",
  howLongAreYouStaying: "How long are you staying?",
  lengthOfStay: "Length of stay",
  afterArrival: "after arrival",
  arrive: "Arrive",
  leave: "Leave",
  chooseADay: "Choose a day",
  pickYourDates: "Pick your dates",
  chooseYourDates: "Choose your dates",
  holdTheseDates: "Hold these dates",
  reserve: "Reserve",
  available: "Available",
  arriveLeave: "Arrive / leave",
  booked: "Booked",
  today: "Today",
  earlierMonth: "Earlier month",
  laterMonth: "Later month",

  // ── Hold / booking form ──────────────────────────────────────────────────
  holdYourDates: "Hold your dates — free, nothing to pay",
  holdIntro:
    "Henrik confirms the dates and the deposit with you directly. A hold never charges you.",
  apartmentToHold: "Apartment to hold",
  yourDetails: "Your details",
  yourName: "Your name",
  whatsappOrPhone: "WhatsApp or phone",
  emailOr: "Email (or)",
  anythingToAdd: "Anything to add? (optional)",
  pickDatesToHold: "Pick dates to hold",
  datesHeld: "Dates held",
  chooseOtherDates: "Choose other dates",
  chooseFreeApartment: "Choose a free apartment",
  contactUseNote:
    "We only use your contact to confirm this booking. A WhatsApp number gets the fastest reply.",
  ratherTalkFirst: "Rather talk first? Message Henrik on WhatsApp",

  // ── Cost estimate ────────────────────────────────────────────────────────
  whatAStayCosts: "What a stay costs",
  chooseApartmentToPrice: "Choose apartment to price",
  estimateForOneMonth: "Estimate for one month",
  estimatedTotal: "Estimated total",
  rentLine: (months: number, price: string) => `Rent, ${months} × ${price}`,
  nightsLine: (nights: number, price: string) =>
    `${nights} night${nights === 1 ? "" : "s"} × ${price}`,
  electricityMetered: "Electricity, metered estimate",
  waterGarbageFibre: "Water, garbage, 200 Mbps fibre",
  powerWaterFibre: "Power, water & 200 Mbps fibre",
  included: "Included",
  depositRefundable: "Deposit (refundable)",
  longStayDiscount: (months: number) => `Long-stay discount, ${months} mo+`,
  billedNightly: "billed nightly",
  billedAsMonths: (months: number) => `billed as ${months} month${months === 1 ? "" : "s"}`,
  powerNote:
    "Power is metered and varies with AC use; the estimate is what tenants actually paid last year.",
  fxRateNote: (rate: number, asOf: string | null) =>
    `At RD$${rate} / US$1${asOf ? ` · rate as of ${asOf}` : ""}`,

  // ── Trust / host ─────────────────────────────────────────────────────────
  whoYoureRentingFrom: "Who you’re renting from",
  typicalReply: "Typical reply on WhatsApp",
  ownerSince: "Owner since",
  messageHenrikDirectly: "Message Henrik directly",

  // ── Unit page ────────────────────────────────────────────────────────────
  aboutThisApartment: "About this apartment",
  theSpace: "The space",
  whatThisPlaceOffers: "What this place offers",
  breadcrumb: "Breadcrumb",
  availability: "Availability",
  gettingAround: "Getting around",
  otherDates: "Other dates",

  // ── Unit page sections ───────────────────────────────────────────────────
  termsAndHouseRules: "Terms & house rules",
  amenitiesInside: "Inside",
  amenitiesBuilding: "Building & connectivity",
  checkInFrom: "Check-in from",
  checkOutBy: "Check-out by",
  notIncluded: " (not included)",
  /*
    Prose that was hardcoded in UnitContent. It describes the building rather
    than any one apartment, which is why it sits outside the Sanity `about`
    field — but it is still copy, and a Spanish reader was getting it in
    English. Worth moving into Sanity eventually so Henrik can edit it.
  */
  buildingNote:
    "The building sits one block back from the water on Calle Dr. Rosen — quiet at night, but a four-minute walk to Playa Sosúa and the restaurants on Pedro Clisante. A shared pool deck with a shaded bar runs the length of the courtyard, and there’s an inverter plus a generator so the power never actually goes out.",

  // ── Trust ────────────────────────────────────────────────────────────────
  /*
    Spelled-out numbers live here rather than in lib/dates.ts: each language
    has its own words, and "four" is not a date concept.
  */
  numberWord: (n: number) =>
    ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ??
    String(n),
  henrikOwns: (units: string) =>
    `Henrik owns these ${units} apartments. You deal with him, not an agency.`,
  // Takes the spelled-out word so each language decides its own casing: English
  // opens the caption with a capital, Spanish does not.
  languagesCount: (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)} languages`,
  listAnd: "and",
  messageHimIn: (languages: string) =>
    `Message him in ${languages} — whichever you’re most comfortable in.`,
  nightsCount: (n: number) => `${n} night${n === 1 ? "" : "s"}`,

  // ── Apartment cards ──────────────────────────────────────────────────────
  forSaleBadge: "For sale",
  priceOnRequestInline: "price on request",
  /*
    Split around the price because the markup bolds it. One interpolated string
    would flatten the emphasis, so each language gets the text on either side
    and puts the <b> where its own word order needs it.
  */
  nightlyBefore: "or ",
  nightlyAfter: " a night for short stays",
  bookedDuringBefore: "Booked during your dates. Free again from ",
  bookedDuringAfter: ".",
  estimatedForNights: (n: number) => `estimated for ${n} night${n === 1 ? "" : "s"}`,
  inclDeposit: ", incl. refundable deposit",
  askAboutOnWhatsapp: (name: string) => `Ask about the ${name} on WhatsApp`,
  waysToStay: (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)} ways to stay`,
  showingPricesFor: "Showing prices and availability for",
  changeDates: "Change dates",
  rentIncludesNote: "Water, garbage and 200 Mbps fibre are in the rent. Power is metered.",
  showAllApartments: (n: number) => `Show all ${n} apartments`,

  // ── For sale band ────────────────────────────────────────────────────────
  stayAWhile: "Stay a while — or stay for good",
  forSaleBody1:
    "Some of these apartments are on the market as well as on the calendar. The same pool deck, the same generator that keeps the lights on, the same four-minute walk to Playa Sosúa — and because they’re already rented, you can see what the place earns before you decide anything.",
  forSaleBody2:
    "Henrik handles the sale himself, so you deal with the owner rather than a chain of agents. Ask him what’s available, what it costs and what it earns.",
  saleSpecLine: (area: string, sleeps: string) => `${area}, sleeps ${sleeps}`,
  askBullet1: "Which apartments are for sale, and when they’re free of tenants",
  askBullet2: "The asking price, and what’s included in the furnishings",
  askBullet3: "What each one rents for, month by month",
  askBullet4: "How buying works here as a foreigner, start to finish",

  // ── Cost estimator ───────────────────────────────────────────────────────
  monthsCount: (n: number) => `${n} month${n === 1 ? "" : "s"}`,
  dateRangeNote: (from: string, to: string) => `${from} to ${to}`,
  checkDatesOnWhatsapp: "Check dates on WhatsApp",
  askAboutSixMonths: "Ask about 6-month terms",
  // Sent as the WhatsApp body, so it has to be in the reader's language too.
  sixMonthMessage: "I’d like to ask about 6-month terms",
  mapTitle: "Map of El Batey, Sosúa",

  // ── Inside band ──────────────────────────────────────────────────────────
  seeBeforeYouFly: (name: string) => `See the ${name} before you fly.`,
  insideThe: (name: string) => `Inside the ${name}`,
  everyRoomShot: "Every room shot as it is.",
  dragOrSwitch: "Drag the view to look around, or switch to photos.",
  useArrows: "Use the arrows to move through the photos.",
  showLabel: "Show",

  // ── Unit booking card and action bar ─────────────────────────────────────
  monthlyIncludesNote:
    "Monthly: water, garbage and 200 Mbps fibre included, power metered. Nightly stays include everything.",
  yourDates: "Your dates",
  seeTheBreakdown: "See the breakdown",
  pickDatesForTotal: "Pick your dates to see the exact total.",
  askHenrikOnWhatsapp: "Ask Henrik on WhatsApp",
  holdIsFree: "A hold is free and never charges you.",
  holdDates: "Hold dates",

  // ── Media viewer ─────────────────────────────────────────────────────────
  viewLabel: "View",
  fullScreen: "Full screen ⤢",
  close: "Close",
  previous: "Previous",
  next: "Next",

  // ── Footer ───────────────────────────────────────────────────────────────
  // ── Common areas band ────────────────────────────────────────────────────
  commonsEyebrow: "Beyond your apartment",
  commonsTitle: "More than your four walls.",
  commonsLede:
    "A swim before breakfast. A shaded table after the beach. A proper workout, close to home — all of it downstairs, none of it extra.",
  commonsFilterLabel: "Filter the photos by area",
  kindAll: "Everything",
  /* One function rather than four keys: the component is handed a `kind`
     string from Sanity and should not carry a lookup table of its own. */
  kindLabel: (kind: string) =>
    ({ pool: "Pool", lounge: "Lounge", gym: "Gym", grounds: "Grounds" })[kind] ?? kind,
  viewAllPhotos: (n: number) => `View all ${n} photos`,
  openPhotoNamed: (title: string) => `Open photo: ${title}`,

  footerNote: "Book any dates · confirm rates on WhatsApp",
};
/*
  Deliberately not `as const`. That would give every entry a literal type —
  `checkDates` would be the type "Check dates", not string — and the Spanish
  object below, declared as `typeof en`, would then have to repeat the English
  word for word to compile. The guarantee worth having here is that both
  languages carry the same KEYS, which `typeof en` gives either way.
*/

/*
  Spanish. Typed as `typeof en`, so this object cannot be missing a key or
  carry one English has dropped — the compiler rejects both.

  Written for the people who actually rent here: neutral Latin-American
  Spanish, "tú" rather than "usted", matching the voice the Sanity translations
  already use on the same pages.
*/
const es: typeof en = {
  whatsappDefault: "Hola Henrik, me gustaría consultar la disponibilidad de los apartamentos.",
  whatsappSale: (property: string, name?: string) =>
    `Hola Henrik, quisiera más información sobre la compra ${name ? `del ${name}` : `de un apartamento en ${property}`}. ¿Me puedes enviar el precio y los detalles?`,
  whatsappUnit: (name: string, code: string, note?: string) =>
    `Hola Henrik, me interesa el ${name} (${code})${note ? `, ${note}` : ""}. ¿Está disponible?`,

  loading: "Cargando…",
  loadError: "No se pudo cargar el panorama",
  moveTwoFingers: "Usa dos dedos para navegar",
  zoomOut: "Alejar",
  zoomIn: "Acercar",
  panoramaLabel: "Arrastra para explorar el panorama de 360°",
  mapDescription: "El Batey, Sosúa: a cuatro minutos a pie de Playa Sosúa y los restaurantes de Pedro Clisante, y a 18 minutos del aeropuerto de Puerto Plata (POP).",
  metaDescription: "Apartamentos amueblados en El Batey, Sosúa. Precios claros, recorrido de 360° y reservas por WhatsApp, a cuatro minutos de Playa Sosúa.",
  startOver: "Volver a empezar",
  tapArrivalDayUnit: "Toca tu día de llegada. Los días rayados ya están reservados.",
  rentalTitle: (name: string, city: string) => `${name} · Alquileres mensuales amueblados en ${city}`,
  scopeCleared: (name: string) => `Tus fechas no están disponibles en el ${name}, así que se borraron. Elige otras fechas.`,
  weeksCount: (n: number) => `${n} semana${n === 1 ? "" : "s"}`,
  freeNames: (names: string) => `Disponibles en estas fechas: ${names}.`,
  firstFreeDay: (date: string) => `Ir al primer día disponible, ${date}`,
  datesFor: (name: string) => `Fechas para el ${name}`,
  longestUnit: (name: string, date: string, length: string) => `El ${name} está ocupado desde el ${date}; la estadía más larga desde esta llegada es de ${length}.`,
  longestAny: (length: string, date: string) => `Desde esta llegada, la estadía más larga disponible es de ${length}, con salida el ${date}.`,
  bookedFromChoose: (name: string, date: string) => `El ${name} está ocupado desde el ${date}. Elige otra fecha de llegada.`,
  showFree: (n: number) => `Ver ${n} apartamento${n === 1 ? " libre" : "s libres"}`,
  leavingAnnouncement: (date: string, count: string) => `Salida: ${date}. ${count}.`,
  arrivingAnnouncement: (date: string) => `Llegada: ${date}. Ahora elige cuánto te quedas.`,
  requestUnit: (name: string) => `Solicitar reserva del ${name}`,
  holdConfirmation: (name: string, dates: string) => `Reservamos el ${name} para ${dates}. Henrik confirmará pronto; escríbele por WhatsApp para agilizarlo.`,
  discountNote: (months: number, pct: number) => `Las estadías de ${months} meses o más tienen un ${pct}% de descuento en el alquiler.`,
  estimateNights: (n: number) => `Estimado para ${n} noche${n === 1 ? "" : "s"}`,
  switchUnit: (name: string) => `Cambiar al ${name}`,
  unitBooked: (name: string) => `El ${name} está ocupado en estas fechas.`,
  holdUnit: (name: string) => `Reserva el ${name} — gratis, sin pagar nada`,
  browseCount: (word: string) => `Ver los ${word} apartamentos`,
  holdFailed: "No se pudieron reservar esas fechas. Inténtalo de nuevo o contacta a Henrik.",
  datesTaken: "Lo sentimos, esas fechas acaban de reservarse. Prueba con otras fechas.",
  unavailableUnit: "Ese apartamento no está disponible.",
  pastCheckin: "Esa fecha de llegada ya pasó.",
  invalidCheckout: "La salida debe ser después de la llegada.",
  addContact: "Añade tu número de WhatsApp o correo para que Henrik pueda contactarte.",
  addName: "Escribe tu nombre.",
  changeLengthNote: "Cambia la duración abajo o toca otro día de llegada.",
  chooseLengthNote: "Elige una duración o toca tu día de salida.",
  arrivalInstructions: "Toca el día que llegas y luego cuánto te quedas.",
  allBookedNext: "Todos los apartamentos están ocupados al día siguiente. Elige otra fecha de llegada.",
  partOfStay: "parte de tu estadía",
  impossibleStay: "no disponible para esta estadía",
  pastDay: "en el pasado",
  yourLeaving: "tu día de salida",
  yourArrival: "tu día de llegada",
  freeAlternatives: "Disponibles en esas fechas:",
  pickDatesFirst: "Elige tus fechas primero.",
  confirmWhatsapp: "Confirmar por WhatsApp",
  holding: "Reservando…",
  clearDates: "Borrar fechas",
  changeArrival: "Cambiar el día de llegada",
  decidingAmenities: "Las dos comodidades que marcan la diferencia",
  onSite: "En la propiedad",
  navApartments: "Apartamentos",
  navInside: "Por dentro",
  navAmenities: "Comodidades",
  navLocation: "Ubicación",
  navDetails: "Detalles",
  checkDates: "Consultar fechas",
  whatsapp: "WhatsApp",
  whatsappHenrik: "WhatsApp a Henrik",
  thisUnit: "Este apartamento",
  language: "Idioma",

  yourStay: "Tu estadía",
  dates: "Fechas",
  addDates: "Añadir fechas",
  anyApartment: "Cualquier apartamento",
  apartment: "Apartamento",
  freeNow: "Libre ahora",
  freeForYourDates: "Libre en tus fechas",
  bookedForYourDates: "Ocupado en tus fechas",
  noFreeApartments: "No hay apartamentos libres",
  noApartmentsForDates: "No hay apartamentos libres en estas fechas",
  furnishedApartments: (n: number) => `${n} apartamentos amueblados`,
  showApartments: (n: number) => `Ver ${n} apartamentos`,
  addLeavingDay: "añade el día de salida",
  freeFrom: (date: string) => `Libre desde el ${date}`,
  bookedFreeAgain: (date: string) => `Ocupado en tus fechas · libre de nuevo el ${date}`,
  apartmentsFreeFrom: (n: number, date: string) =>
    `${n} apartamento${n === 1 ? "" : "s"} libre${n === 1 ? "" : "s"} desde el ${date}`,
  apartmentsFreeForDates: (n: number) =>
    `${n} apartamento${n === 1 ? "" : "s"} libre${n === 1 ? "" : "s"} en estas fechas`,
  oneSetOfDates:
    "Unas mismas fechas para toda la página — los apartamentos, los precios y el formulario de reserva las siguen.",

  watchWalkthrough: "Ver el recorrido",
  filmNote: "Video de 3 min · YouTube",
  browseApartments: "Ver los cuatro apartamentos",

  theApartments: "Los apartamentos",
  perMonth: "al mes",
  nightlyFrom: (price: string) => `o ${price} por noche en estadías cortas`,
  seeTheApartment: "Ver el apartamento",
  seeThe: (name: string) => `Ver el ${name}`,
  ask: "Preguntar",
  currency: "Moneda",
  size: "Tamaño",
  baths: "Baños",
  sleeps: "Capacidad",
  beds: "Cama",

  alsoOnBooking: "También publicado en Booking.com",
  verifyOnBooking: "Compara este apartamento con el anuncio",

  alsoForSale: "También en venta",
  onTheMarketNow: "En venta ahora",
  askForMoreInformation: "Pedir más información",
  pricesOnRequest: "Precios a solicitud · normalmente contestados el mismo día",
  priceOnRequest: "Precio a solicitud",
  whatToAskAbout: "Qué puedes preguntar",

  walkthrough360: "Recorrido en 360°",
  tour360: "Recorrido 360°",
  photoWalkthrough: "Recorrido en fotos",
  photosCount: (n: number) => `Fotos · ${n}`,
  dragToLookAround: "Arrastra para mirar alrededor",
  dragBadge: "360° · arrastra para mirar alrededor",
  flatViewUnavailable: "Vista plana · 360° no disponible",
  loadingTour: "Cargando el recorrido 360°",
  stopOf: (i: number, total: number) => `Parada ${i} de ${total}`,
  photoOf: (i: number, total: number) => `Foto ${i} de ${total}`,
  openPhotoFullScreen: "Abrir la foto a pantalla completa",
  previousPhoto: "Foto anterior",
  nextPhoto: "Foto siguiente",
  chooseApartment: "Elegir apartamento",
  walkthroughVideo: "Video del recorrido",
  closeVideo: "Cerrar el video",
  walkthrough: "Recorrido",

  checkAvailability: "Consultar disponibilidad",
  anyRangeAnyLength: "Cualquier fecha, cualquier duración",
  availabilityIntro:
    "Déjalo en “Cualquier apartamento” o elige uno. Toca el día que llegas y luego cuánto te quedas.",
  whenDoYouArrive: "¿Cuándo llegas?",
  tapArrivalDay:
    "Toca el día que llegas. Los días rayados ya están ocupados en todos los apartamentos.",
  howLongAreYouStaying: "¿Cuánto tiempo te quedas?",
  lengthOfStay: "Duración de la estadía",
  afterArrival: "desde la llegada",
  arrive: "Llegada",
  leave: "Salida",
  chooseADay: "Elige un día",
  pickYourDates: "Elige tus fechas",
  chooseYourDates: "Elige tus fechas",
  holdTheseDates: "Reservar estas fechas",
  reserve: "Reservar",
  available: "Disponible",
  arriveLeave: "Llegada / salida",
  booked: "Ocupado",
  today: "Hoy",
  earlierMonth: "Mes anterior",
  laterMonth: "Mes siguiente",

  holdYourDates: "Reserva tus fechas — gratis, sin pagar nada",
  holdIntro:
    "Henrik confirma contigo las fechas y el depósito directamente. Una reserva nunca te cobra.",
  apartmentToHold: "Apartamento a reservar",
  yourDetails: "Tus datos",
  yourName: "Tu nombre",
  whatsappOrPhone: "WhatsApp o teléfono",
  emailOr: "Correo (o)",
  anythingToAdd: "¿Algo que agregar? (opcional)",
  pickDatesToHold: "Elige las fechas a reservar",
  datesHeld: "Fechas reservadas",
  chooseOtherDates: "Elegir otras fechas",
  chooseFreeApartment: "Elegir un apartamento libre",
  contactUseNote:
    "Solo usamos tus datos para confirmar esta reserva. Un número de WhatsApp recibe la respuesta más rápida.",
  ratherTalkFirst: "¿Prefieres hablar primero? Escríbele a Henrik por WhatsApp",

  whatAStayCosts: "Lo que cuesta una estadía",
  chooseApartmentToPrice: "Elegir el apartamento a cotizar",
  estimateForOneMonth: "Estimado para un mes",
  estimatedTotal: "Total estimado",
  rentLine: (months: number, price: string) => `Alquiler, ${months} × ${price}`,
  nightsLine: (nights: number, price: string) =>
    `${nights} noche${nights === 1 ? "" : "s"} × ${price}`,
  electricityMetered: "Electricidad, estimado con medidor",
  waterGarbageFibre: "Agua, basura y fibra de 200 Mbps",
  powerWaterFibre: "Electricidad, agua y fibra de 200 Mbps",
  included: "Incluido",
  depositRefundable: "Depósito (reembolsable)",
  longStayDiscount: (months: number) => `Descuento por estadía larga, ${months} meses o más`,
  billedNightly: "cobrado por noche",
  billedAsMonths: (months: number) => `cobrado como ${months} ${months === 1 ? "mes" : "meses"}`,
  powerNote:
    "La electricidad se mide con contador y varía según el uso del aire; el estimado es lo que los inquilinos pagaron el año pasado.",
  fxRateNote: (rate: number, asOf: string | null) =>
    `A RD$${rate} / US$1${asOf ? ` · tasa del ${asOf}` : ""}`,

  whoYoureRentingFrom: "A quién le alquilas",
  typicalReply: "Respuesta típica por WhatsApp",
  ownerSince: "Propietario desde",
  messageHenrikDirectly: "Escríbele a Henrik directamente",

  aboutThisApartment: "Sobre este apartamento",
  theSpace: "El espacio",
  whatThisPlaceOffers: "Lo que ofrece este lugar",
  breadcrumb: "Ruta de navegación",
  availability: "Disponibilidad",
  gettingAround: "Cómo moverte",
  otherDates: "Otras fechas",

  termsAndHouseRules: "Condiciones y normas de la casa",
  amenitiesInside: "Por dentro",
  amenitiesBuilding: "Edificio y conectividad",
  checkInFrom: "Entrada desde",
  checkOutBy: "Salida antes de",
  notIncluded: " (no incluido)",
  buildingNote:
    "El edificio está a una cuadra del mar, en la calle Dr. Rosen — tranquilo de noche, pero a cuatro minutos a pie de Playa Sosúa y de los restaurantes de Pedro Clisante. Un solárium compartido con un bar con sombra recorre todo el patio, y hay un inversor más una planta eléctrica para que la luz nunca se vaya de verdad.",

  numberWord: (n: number) =>
    ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"][n] ??
    String(n),
  henrikOwns: (units: string) =>
    `Henrik es dueño de estos ${units} apartamentos. Tratas con él, no con una agencia.`,
  languagesCount: (word: string) => `${word} idiomas`,
  listAnd: "y",
  messageHimIn: (languages: string) =>
    `Escríbele en ${languages} — en el que te sientas más cómodo.`,
  nightsCount: (n: number) => `${n} noche${n === 1 ? "" : "s"}`,

  forSaleBadge: "En venta",
  priceOnRequestInline: "precio a solicitud",
  nightlyBefore: "o ",
  nightlyAfter: " por noche en estadías cortas",
  bookedDuringBefore: "Ocupado durante tus fechas. Libre de nuevo desde el ",
  bookedDuringAfter: ".",
  estimatedForNights: (n: number) => `estimado para ${n} noche${n === 1 ? "" : "s"}`,
  inclDeposit: ", incluido el depósito reembolsable",
  askAboutOnWhatsapp: (name: string) => `Preguntar por el ${name} por WhatsApp`,
  waysToStay: (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)} formas de quedarte`,
  showingPricesFor: "Mostrando precios y disponibilidad para",
  changeDates: "Cambiar las fechas",
  rentIncludesNote:
    "El agua, la basura y la fibra de 200 Mbps están incluidas en el alquiler. La electricidad se mide con contador.",
  showAllApartments: (n: number) => `Ver los ${n} apartamentos`,

  stayAWhile: "Quédate un tiempo — o quédate para siempre",
  forSaleBody1:
    "Algunos de estos apartamentos están en venta además de estar en el calendario. El mismo solárium, la misma planta eléctrica que mantiene la luz prendida, los mismos cuatro minutos a pie hasta Playa Sosúa — y como ya están alquilados, puedes ver lo que produce el lugar antes de decidir nada.",
  forSaleBody2:
    "Henrik se encarga de la venta él mismo, así que tratas con el dueño y no con una cadena de agentes. Pregúntale qué hay disponible, cuánto cuesta y cuánto produce.",
  saleSpecLine: (area: string, sleeps: string) => `${area}, para ${sleeps}`,
  askBullet1: "Cuáles apartamentos están en venta, y cuándo quedan libres de inquilinos",
  askBullet2: "El precio de venta, y qué incluye el mobiliario",
  askBullet3: "Cuánto produce cada uno de alquiler, mes por mes",
  askBullet4: "Cómo funciona comprar aquí siendo extranjero, de principio a fin",

  monthsCount: (n: number) => `${n} ${n === 1 ? "mes" : "meses"}`,
  dateRangeNote: (from: string, to: string) => `del ${from} al ${to}`,
  checkDatesOnWhatsapp: "Consultar fechas por WhatsApp",
  askAboutSixMonths: "Preguntar por contratos de 6 meses",
  sixMonthMessage: "Quisiera preguntar por contratos de 6 meses",
  mapTitle: "Mapa de El Batey, Sosúa",

  seeBeforeYouFly: (name: string) => `Conoce el ${name} antes de viajar.`,
  insideThe: (name: string) => `Por dentro del ${name}`,
  everyRoomShot: "Cada espacio fotografiado tal como está.",
  dragOrSwitch: "Arrastra la vista para mirar alrededor, o cambia a las fotos.",
  useArrows: "Usa las flechas para pasar las fotos.",
  showLabel: "Ver",

  monthlyIncludesNote:
    "Mensual: agua, basura y fibra de 200 Mbps incluidas, electricidad con contador. Las estadías por noche lo incluyen todo.",
  yourDates: "Tus fechas",
  seeTheBreakdown: "Ver el desglose",
  pickDatesForTotal: "Elige tus fechas para ver el total exacto.",
  askHenrikOnWhatsapp: "Preguntarle a Henrik por WhatsApp",
  holdIsFree: "Reservar es gratis y nunca te cobra.",
  holdDates: "Reservar fechas",

  viewLabel: "Ver",
  fullScreen: "Pantalla completa ⤢",
  close: "Cerrar",
  previous: "Anterior",
  next: "Siguiente",

  commonsEyebrow: "Más allá de tu apartamento",
  commonsTitle: "Más que tus cuatro paredes.",
  commonsLede:
    "Un baño antes del desayuno. Una mesa con sombra después de la playa. Un entrenamiento de verdad, cerca de casa — todo abajo, nada aparte.",
  commonsFilterLabel: "Filtrar las fotos por área",
  kindAll: "Todo",
  kindLabel: (kind: string) =>
    ({ pool: "Piscina", lounge: "Sala", gym: "Gimnasio", grounds: "Exteriores" })[kind] ?? kind,
  viewAllPhotos: (n: number) => `Ver las ${n} fotos`,
  openPhotoNamed: (title: string) => `Abrir la foto: ${title}`,

  footerNote: "Reserva cualquier fecha · confirma las tarifas por WhatsApp",
};

/** Every interface string, per language. */
export const UI: Record<Locale, typeof en> = { en, es };

/** The shape a component receives — English is the reference for the keys. */
export type Ui = typeof en;

/** Interface copy for one language. */
export function ui(locale: Locale): Ui {
  return UI[locale];
}
