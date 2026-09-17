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
 * The church's Plus Code, supplied by the church. This is the authoritative
 * location — a Plus Code addresses a ~3m square, and unlike a street name it
 * points at the building rather than at the road.
 *
 * It replaced a coordinate geocoded from "Weise Road": that put the pin 195m
 * along the road from the actual church. Reverse-geocoding this point
 * returns "Weise Road, Bull Bay, Saint Andrew", so the postal address below
 * was right all along — only the map position was wrong.
 */
export const CHURCH_PLUS_CODE = "W8VM+R2X";
/** The globally unambiguous form, which needs no nearby-locality hint. */
export const CHURCH_PLUS_CODE_FULL = "7795W8VM+R2X";
export const CHURCH_COORDINATES = { lat: 17.9446125, lon: -76.6673906 } as const;

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
    title: "Admin Assistant",
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

/** One corner of the map's bounding box, ~1km either side of the marker. */
const box = (value: number, direction: 1 | -1) => (value + direction * 0.01).toFixed(6);

const PIN = `${CHURCH_COORDINATES.lat},${CHURCH_COORDINATES.lon}`;
const MAP_LABEL = encodeURIComponent(SITE_NAME);

/**
 * Directions links for the three apps people here actually use.
 *
 * These deliberately send the exact coordinates, not the address text. The
 * earlier version sent the text so each app could geocode it itself, on the
 * reasoning that an app's own routing beats a coordinate that is merely
 * close. That reasoning was sound but the premise was wrong: geocoding
 * "Weise Road" lands on the middle of the road, 195m from the building,
 * while the church's Plus Code is accurate to about three metres. When you
 * hold the better position, hand it over.
 */
export const CHURCH_MAP_LINKS = {
  google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH_PLUS_CODE_FULL)}`,
  googleDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(PIN)}`,
  apple: `https://maps.apple.com/?ll=${encodeURIComponent(PIN)}&q=${MAP_LABEL}`,
  waze: `https://waze.com/ul?ll=${encodeURIComponent(PIN)}&navigate=yes`,
  openStreetMap: `https://www.openstreetmap.org/?mlat=${CHURCH_COORDINATES.lat}&mlon=${CHURCH_COORDINATES.lon}#map=18/${CHURCH_COORDINATES.lat}/${CHURCH_COORDINATES.lon}`,
  /** Keyless and licence-clean, so the map needs no billing account to keep working. */
  embed: `https://www.openstreetmap.org/export/embed.html?bbox=${box(CHURCH_COORDINATES.lon, -1)}%2C${box(CHURCH_COORDINATES.lat, -1)}%2C${box(CHURCH_COORDINATES.lon, 1)}%2C${box(CHURCH_COORDINATES.lat, 1)}&layer=mapnik&marker=${CHURCH_COORDINATES.lat}%2C${CHURCH_COORDINATES.lon}`,
} as const;
