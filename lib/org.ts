/**
 * Bull Bay launches as a single organization/campus, but the schema is
 * multi-tenant/multi-campus from day one (per blueprint recommendation) so
 * nothing has to be redesigned if a second campus or congregation joins the
 * platform later.
 */
export const ORGANIZATION_SLUG = process.env.NEXT_PUBLIC_ORGANIZATION_SLUG ?? "bull-bay";
export const PRIMARY_CAMPUS_SLUG = "bull-bay";

export const SITE_NAME = "New Testament Church of God, Bull Bay";
export const SITE_SHORT_NAME = "NTCOG Bull Bay";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * The church's postal address, in one place. Anywhere an address appears —
 * the footer, the contact page, letter and certificate PDFs, the structured
 * data search engines read — reads it from here, so it can never be right
 * in one place and stale in another.
 */
export const CHURCH_ADDRESS = {
  street: "Weise Road, 9 Miles",
  town: "Bull Bay",
  postal: "P.O. Box 119",
  parish: "St. Andrew",
  country: "Jamaica",
  countryCode: "JM",
  /** For PDFs, email footers and anywhere without room for a block. */
  oneLine: "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica",
} as const;

/**
 * Weise Road as OpenStreetMap places it — a real geocoded match for the
 * street, not a guess at the building. The embedded map is centred here,
 * but every "get directions" link below sends the *address text* rather
 * than these numbers, so the mapping app does its own routing and a
 * visitor is never navigated to a pin that is merely close.
 */
export const CHURCH_COORDINATES = { lat: 17.9461898, lon: -76.6665966 } as const;

export const CHURCH_EMAIL = "ntcog_bullbay@yahoo.com";

export type ChurchContact = {
  /** The name a visitor reads. */
  title: string;
  /** Who picks up, and what they can help with. */
  role: string;
  description: string;
  display: string;
  /** E.164, for the tel: link — what a phone actually dials. */
  dial: string;
  icon: string;
};

/**
 * Published numbers only. The pastor's personal line is deliberately not
 * here and must not be added back: enquiries for Rev. Dr. Page go through
 * the Executive Assistant, who manages his diary.
 */
export const CHURCH_CONTACTS: readonly ChurchContact[] = [
  {
    title: "The Welcome Line",
    role: "Church office",
    description:
      "Service times, visiting, weddings and funerals, certificates and letters, or anything you are not sure who to ask for.",
    display: "+1 (876) 596-3890",
    dial: "+18765963890",
    icon: "✦",
  },
  {
    title: "Office of the Pastor",
    role: "Executive Assistant",
    description:
      "The way to reach Rev. Dr. Kevin Page. The Executive Assistant keeps the pastor's diary and will arrange a visit, a call or an appointment for you.",
    display: "+1 (876) 841-8444",
    dial: "+18768418444",
    icon: "✚",
  },
  {
    title: "Digital Support Desk",
    role: "Technical issues",
    description:
      "Trouble signing in to the member portal, a livestream that will not play, or anything on this website not working as it should.",
    display: "+1 (876) 585-7469",
    dial: "+18765857469",
    icon: "◆",
  },
] as const;

const MAP_QUERY = encodeURIComponent(CHURCH_ADDRESS.oneLine);

/** One corner of the map's bounding box, ~1km either side of the marker. */
const box = (value: number, direction: 1 | -1) => (value + direction * 0.01).toFixed(6);

/**
 * Directions links for the three apps people here actually use, plus the
 * OpenStreetMap embed the page frames. Each app is handed the address as
 * text so it geocodes and routes itself.
 */
export const CHURCH_MAP_LINKS = {
  google: `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`,
  apple: `https://maps.apple.com/?q=${MAP_QUERY}`,
  waze: `https://waze.com/ul?q=${MAP_QUERY}&navigate=yes`,
  openStreetMap: `https://www.openstreetmap.org/?mlat=${CHURCH_COORDINATES.lat}&mlon=${CHURCH_COORDINATES.lon}#map=16/${CHURCH_COORDINATES.lat}/${CHURCH_COORDINATES.lon}`,
  /** Keyless and licence-clean, so the map needs no billing account to keep
   *  working. Rounded because floating-point subtraction otherwise puts
   *  "-76.67659660000001" in the URL. */
  embed: `https://www.openstreetmap.org/export/embed.html?bbox=${box(CHURCH_COORDINATES.lon, -1)}%2C${box(CHURCH_COORDINATES.lat, -1)}%2C${box(CHURCH_COORDINATES.lon, 1)}%2C${box(CHURCH_COORDINATES.lat, 1)}&layer=mapnik&marker=${CHURCH_COORDINATES.lat}%2C${CHURCH_COORDINATES.lon}`,
} as const;
