import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/org";

const STATIC_PATHS = [
  "",
  "/about",
  "/visit",
  "/ministries",
  "/sermons",
  "/events",
  "/calendar",
  "/live",
  "/groups",
  "/serve",
  "/prayer",
  "/contact",
  "/give",
  "/shop",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: sermons }, { data: events }, { data: ministries }, { data: products }, { data: groups }] = await Promise.all([
    supabase.from("sermons").select("slug, updated_at").eq("status", "published"),
    supabase.from("events").select("slug, updated_at").eq("status", "published"),
    supabase.from("ministries").select("slug").eq("is_active", true),
    supabase.from("products").select("slug, updated_at").eq("status", "active"),
    supabase.from("groups").select("slug").eq("is_active", true).eq("visibility", "public"),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
  }));

  for (const s of sermons ?? []) entries.push({ url: `${SITE_URL}/sermons/${s.slug}`, lastModified: s.updated_at ?? undefined });
  for (const e of events ?? []) entries.push({ url: `${SITE_URL}/events/${e.slug}`, lastModified: e.updated_at ?? undefined });
  for (const m of ministries ?? []) entries.push({ url: `${SITE_URL}/ministries/${m.slug}` });
  for (const p of products ?? []) entries.push({ url: `${SITE_URL}/shop/${p.slug}`, lastModified: p.updated_at ?? undefined });
  for (const g of groups ?? []) entries.push({ url: `${SITE_URL}/groups/${g.slug}` });

  return entries;
}
