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
  /**
   * Send www to the apex. Both hostnames served the whole site with a 200
   * and no redirect, so every page existed at two addresses — search
   * engines split a site's standing across duplicates like that, and the
   * canonical tag only asks them not to, it cannot stop the duplicate
   * being crawled or linked to. One address, permanently.
   *
   * Scoped by host, so it cannot fire on the apex and loop. Railway's own
   * *.up.railway.app hostname is left alone: it is what deploy previews
   * and health checks use.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.bullbayntcog.org" }],
        destination: "https://bullbayntcog.org/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
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
