import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
})();

/** Hosts this site is genuinely served from. The church's domain answers on
 * both the apex and www (neither redirects to the other), and Railway also
 * serves it on its own *.up.railway.app host. */
const siteHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url ? new URL(url).host : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Next.js rejects a Server Action whose Origin doesn't match the host
      // it thinks it's serving. Behind Railway's proxy that comparison uses
      // the forwarded host, so anything submitted from a hostname the
      // server doesn't recognise — apex vs www, or Railway's own domain —
      // fails with "An unexpected response was received from the server"
      // while ordinary page loads keep working. Listing every real host
      // this app answers on is the documented fix.
      allowedOrigins: [
        "bullbayntcog.org",
        "www.bullbayntcog.org",
        "*.up.railway.app",
        ...(siteHostname ? [siteHostname] : []),
      ],
      // Default is 1MB, counted against the whole multipart body. Gallery
      // photos, product images, signature/stamp scans and the conference
      // PDF all upload through Server Actions and routinely exceed that.
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname }]
        : []),
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
