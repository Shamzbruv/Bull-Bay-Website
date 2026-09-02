import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/org";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Worship. Grow. Belong.`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "New Testament Church of God, Bull Bay — a place to worship, grow, serve and belong. Plan your visit, watch live, and connect with our church family.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    title: "New Testament Church of God, Bull Bay",
    description: "A place to worship, grow, serve and belong.",
    images: [
      {
        url: "/images/church/church-hero-desktop.png",
        width: 1672,
        height: 941,
        alt: "New Testament Church of God, Bull Bay",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#123b86",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
