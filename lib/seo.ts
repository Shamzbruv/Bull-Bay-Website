import {
  CHURCH_ADDRESS,
  CHURCH_CONTACTS,
  CHURCH_COORDINATES,
  CHURCH_EMAIL,
  CHURCH_MAP_LINKS,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_URL,
} from "@/lib/org";

/**
 * Structured data builders.
 *
 * What this is actually for: when somebody in Bull Bay searches for a
 * church, Google decides what to show from what it can verify about a real
 * place — a name, one consistent address, a phone number that matches, a
 * location, and when the doors are open. These builders emit exactly that,
 * from the same constants the visible pages use, so the machine-readable
 * copy and the human copy can never disagree. Search engines treat a
 * mismatch between them as a reason to trust neither.
 */

export type ServiceTime = { day: string; time: string; label: string };

const DAY_TO_SCHEMA: Record<string, string> = {
  Sunday: "https://schema.org/Sunday",
  Monday: "https://schema.org/Monday",
  Tuesday: "https://schema.org/Tuesday",
  Wednesday: "https://schema.org/Wednesday",
  Thursday: "https://schema.org/Thursday",
  Friday: "https://schema.org/Friday",
  Saturday: "https://schema.org/Saturday",
};

/**
 * "9:50 AM" → "09:50". Schema.org wants 24-hour ISO times; the church
 * writes them the way they are read out on a Sunday. Returns null rather
 * than guessing if the format is not what we expect, so a typo in the
 * database degrades to "no opening hours" instead of publishing a wrong
 * time to Google.
 */
export function toIsoTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  const [, rawHour, minutes, meridiem] = match;
  let hour = Number(rawHour);
  if (!Number.isFinite(hour) || hour < 1 || hour > 12) return null;
  if (meridiem!.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (meridiem!.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

/** Services run about 90 minutes; used only to close the opening-hours range. */
const SERVICE_MINUTES = 90;

function addMinutes(isoTime: string, minutes: number): string {
  const [hours = "0", mins = "0"] = isoTime.split(":");
  const total = Number(hours) * 60 + Number(mins) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

export function openingHours(schedule: ServiceTime[]) {
  return schedule.flatMap((service) => {
    const day = DAY_TO_SCHEMA[service.day];
    const opens = toIsoTime(service.time);
    if (!day || !opens) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day,
        opens,
        closes: addMinutes(opens, SERVICE_MINUTES),
        name: service.label,
      },
    ];
  });
}

/**
 * Profiles Google uses to tie this site to the church's other presences.
 * Empty until the church supplies them — a guessed or wrong URL here would
 * link the church to somebody else's page, which is worse than no link.
 * Fill these in and the knowledge panel gets noticeably stronger.
 */
export const CHURCH_SOCIAL_PROFILES: string[] = [];

/**
 * The church as a place. `@id` is a stable identifier other blocks point
 * at, so Google reads the separate snippets across the site as one
 * organisation rather than several similarly-named ones.
 */
export const CHURCH_ID = `${SITE_URL}/#church`;

export function churchStructuredData(schedule: ServiceTime[] = []) {
  const hours = openingHours(schedule);
  const socials = CHURCH_SOCIAL_PROFILES.filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": CHURCH_ID,
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/brand/bull-bay-logo.png`,
    image: `${SITE_URL}/images/church/church-exterior.jpg`,
    description:
      "New Testament Church of God, Bull Bay — a Pentecostal church family on Weise Road, 9 Miles, Bull Bay, St. Andrew, Jamaica. Sunday worship, ministries for every generation, prayer, and community outreach.",
    email: CHURCH_EMAIL,
    telephone: CHURCH_CONTACTS[0]?.dial,
    address: {
      "@type": "PostalAddress",
      streetAddress: CHURCH_ADDRESS.street,
      postOfficeBoxNumber: CHURCH_ADDRESS.postal,
      addressLocality: CHURCH_ADDRESS.town,
      addressRegion: CHURCH_ADDRESS.parish,
      addressCountry: CHURCH_ADDRESS.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CHURCH_COORDINATES.lat,
      longitude: CHURCH_COORDINATES.lon,
    },
    hasMap: CHURCH_MAP_LINKS.google,
    areaServed: [
      { "@type": "Place", name: "Bull Bay, St. Andrew, Jamaica" },
      { "@type": "Place", name: "9 Miles, Bull Bay" },
      { "@type": "Place", name: "Eleven Miles, St. Andrew" },
      { "@type": "Place", name: "Kingston, Jamaica" },
    ],
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    contactPoint: CHURCH_CONTACTS.map((contact) => ({
      "@type": "ContactPoint",
      name: contact.title,
      contactType: contact.role,
      telephone: contact.dial,
      email: CHURCH_EMAIL,
      areaServed: "JM",
      availableLanguage: ["en-JM", "en"],
    })),
  };
}

export function websiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": CHURCH_ID },
    inLanguage: "en-JM",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/sermons?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumbs give search results a readable path instead of a bare URL. */
export function breadcrumbStructuredData(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

export function faqStructuredData(entries: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}
