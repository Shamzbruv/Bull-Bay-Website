import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/org";
import { DialogProvider } from "@/components/dialog-provider";

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
    default: `${SITE_NAME} | Church in Bull Bay, St. Andrew`,
    template: `%s | ${SITE_NAME}`,
  },
  // Written for somebody searching for a church near them rather than for
  // somebody who already knows this one: the district, the road and the
  // service time are what make it match "church in Bull Bay" or "church
  // near me" and what make it worth clicking in a list of results.
  description:
    "A Pentecostal church family on Weise Road, 9 Miles, Bull Bay, St. Andrew. Sunday worship at 9:50 AM, ministries for every generation, prayer and community outreach. Everyone is welcome.",
  applicationName: SITE_NAME,
  keywords: [
    "church in Bull Bay",
    "Bull Bay church",
    "New Testament Church of God Bull Bay",
    "church near me Bull Bay",
    "Pentecostal church St. Andrew Jamaica",
    "Sunday worship Bull Bay",
    "9 Miles Bull Bay church",
    "church Kingston Jamaica",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_JM",
    url: SITE_URL,
    title: "New Testament Church of God, Bull Bay",
    description: "Worship with us on Weise Road, 9 Miles, Bull Bay — Sundays at 9:50 AM. Everyone is welcome.",
    images: [
      {
        url: "/images/church/church-exterior.jpg",
        width: 1672,
        height: 941,
        alt: "New Testament Church of God, Bull Bay",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "New Testament Church of God, Bull Bay",
    description: "Worship with us on Weise Road, 9 Miles, Bull Bay — Sundays at 9:50 AM.",
    images: ["/images/church/church-exterior.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Set GOOGLE_SITE_VERIFICATION in Railway to the token Search Console
  // gives you, and the meta tag appears without another deploy edit.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#0a2340",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
