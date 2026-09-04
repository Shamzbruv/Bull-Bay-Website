import type { SVGProps } from "react";

export type DashboardIconName =
  | "archive"
  | "bell"
  | "book"
  | "briefcase"
  | "calendar"
  | "chart"
  | "checklist"
  | "church"
  | "clipboard"
  | "coins"
  | "file"
  | "gallery"
  | "heart"
  | "home"
  | "mail"
  | "media"
  | "people"
  | "person"
  | "settings"
  | "shield"
  | "shop"
  | "sparkles"
  | "team"
  | "users";

/** Small, dependency-free outline icons for the authenticated workspaces. */
export function DashboardIcon({ name, ...props }: { name: DashboardIconName } & SVGProps<SVGSVGElement>) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<DashboardIconName, React.ReactNode> = {
    archive: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M3 4h18v3H3zM9 11h6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    checklist: (
      <>
        <path d="m4 7 2 2 4-4M4 15l2 2 4-4M13 7h7M13 15h7" />
      </>
    ),
    church: (
      <>
        <path d="M12 2v5M9.5 4.5h5M6 22V10l6-3 6 3v12M3 22h18M10 22v-6h4v6" />
      </>
    ),
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="18" rx="2" />
        <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="8" cy="7" rx="5" ry="3" />
        <path d="M3 7v4c0 1.7 2.2 3 5 3 1.1 0 2.1-.2 3-.6M3 11v4c0 1.7 2.2 3 5 3" />
        <ellipse cx="16" cy="15" rx="5" ry="3" />
        <path d="M11 15v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 12h6M9 16h6" />
      </>
    ),
    gallery: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m4 18 5-5 3 3 3-3 5 5" />
      </>
    ),
    heart: (
      <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    media: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m10 9 5 3-5 3z" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-4 2.4-6 6-6s6 2 6 6M16 5.5a3 3 0 0 1 0 5.8M17 14c2.5.4 4 2.2 4 5" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-5 3.2-7 8-7s8 2 8 7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 4 5v6c0 5.2 3.2 8.7 8 11 4.8-2.3 8-5.8 8-11V5z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    shop: (
      <>
        <path d="M4 9h16l-1 13H5zM8 9a4 4 0 0 1 8 0" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7zM5 14l.7 1.3L7 16l-1.3.7L5 18l-.7-1.3L3 16l1.3-.7z" />
      </>
    ),
    team: (
      <>
        <circle cx="12" cy="7" r="3" />
        <circle cx="5" cy="10" r="2" />
        <circle cx="19" cy="10" r="2" />
        <path d="M7 21v-2c0-3 1.8-5 5-5s5 2 5 5v2M1.5 20v-1c0-2.4 1.3-4 3.5-4M22.5 20v-1c0-2.4-1.3-4-3.5-4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2 21c0-4.2 2.7-7 7-7s7 2.8 7 7M16 15c3.5 0 6 2.1 6 5.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared} {...props}>
      {paths[name]}
    </svg>
  );
}
