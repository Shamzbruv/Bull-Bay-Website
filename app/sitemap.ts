import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_URL } from "@/lib/org";

export const revalidate = 300;

/**
 * Priority tells Google which pages matter most when it decides what to
 * crawl and what to surface. The pages a stranger looking for a church
 * actually needs — where we are, when we meet, how to get here — rank
 * above the ones that only make sense once you already attend.
 *
 * /cart and /give are absent deliberately. robots.ts disallows /cart, and
 * listing a disallowed URL is a contradiction Search Console reports as an
 * error; /give is a redirect out to the payment provider, and a sitemap
 * URL that redirects is reported the same way.
 */
const STATIC_PATHS: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/visit", priority: 0.9, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.9, changeFrequency: "monthly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/sermons", priority: 0.8, changeFrequency: "weekly" },
  { path: "/events", priority: 0.8, changeFrequency: "daily" },
  { path: "/live", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ministries", priority: 0.7, changeFrequency: "monthly" },
  { path: "/beliefs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/beliefs/doctrinal-commitments", priority: 0.5, changeFrequency: "monthly" },
  { path: "/join", priority: 0.7, changeFrequency: "monthly" },
  { path: "/calendar", priority: 0.6, changeFrequency: "daily" },
  { path: "/groups", priority: 0.6, changeFrequency: "weekly" },
  { path: "/serve", priority: 0.6, changeFrequency: "monthly" },
  { path: "/prayer", priority: 0.6, changeFrequency: "monthly" },
  { path: "/gallery", priority: 0.5, changeFrequency: "monthly" },
  { path: "/direction", priority: 0.5, changeFrequency: "monthly" },
  { path: "/shop", priority: 0.4, changeFrequency: "weekly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const [{ data: sermons }, { data: events }, { data: ministries }, { data: products }, { data: groups }] = await Promise.all([
    supabase.from("sermons").select("slug, updated_at").eq("status", "published"),
    supabase.from("events").select("slug, updated_at").eq("status", "published"),
    supabase.from("ministries").select("slug").eq("is_active", true),
    supabase.from("products").select("slug, updated_at").eq("status", "active"),
    supabase.from("groups").select("slug").eq("is_active", true).eq("visibility", "public"),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    // No lastModified on the static pages. Stamping "now" on every crawl
    // would claim the whole site changed daily, and Google responds to a
    // lastmod it cannot trust by ignoring the field everywhere — including
    // on the sermon and event URLs below, where the dates are real.
  }));

  for (const s of sermons ?? [])
    entries.push({ url: `${SITE_URL}/sermons/${s.slug}`, lastModified: s.updated_at ?? undefined, changeFrequency: "yearly", priority: 0.6 });
  for (const e of events ?? [])
    entries.push({ url: `${SITE_URL}/events/${e.slug}`, lastModified: e.updated_at ?? undefined, changeFrequency: "weekly", priority: 0.7 });
  for (const m of ministries ?? [])
    entries.push({ url: `${SITE_URL}/ministries/${m.slug}`, changeFrequency: "monthly", priority: 0.6 });
  for (const p of products ?? [])
    entries.push({ url: `${SITE_URL}/shop/${p.slug}`, lastModified: p.updated_at ?? undefined, changeFrequency: "weekly", priority: 0.4 });
  for (const g of groups ?? [])
    entries.push({ url: `${SITE_URL}/groups/${g.slug}`, changeFrequency: "monthly", priority: 0.5 });

  return entries;
}
