import { createPublicClient } from "@/lib/supabase/public";
import { ORGANIZATION_SLUG, PRIMARY_CAMPUS_SLUG } from "@/lib/org";

export async function getOrganization() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", ORGANIZATION_SLUG)
    .single();
  return data;
}

export async function getPrimaryCampus() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("campuses")
    .select("*")
    .eq("slug", PRIMARY_CAMPUS_SLUG)
    .single();
  return data;
}

export async function getUpcomingEvents(limit = 6) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getEventBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).single();
  return data;
}

export async function getPublishedSermons(options: { topic?: string; query?: string; limit?: number } = {}) {
  const supabase = createPublicClient();
  let request = supabase
    .from("sermons")
    .select("*")
    .eq("status", "published")
    .order("preached_at", { ascending: false });

  if (options.topic && options.topic !== "all") {
    request = request.contains("topics", [options.topic]);
  }
  if (options.query) {
    request = request.textSearch("title", options.query, { type: "websearch" });
  }
  if (options.limit) {
    request = request.limit(options.limit);
  }

  const { data } = await request;
  return data ?? [];
}

export async function getSermonBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("sermons").select("*").eq("slug", slug).single();
  return data;
}

export async function getMinistries() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("ministries")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getMinistryBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("ministries").select("*").eq("slug", slug).single();
  return data;
}

export async function getPublicGroups() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("groups")
    .select("*")
    .eq("is_active", true)
    .in("visibility", ["public", "members"])
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getGroupBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("groups").select("*").eq("slug", slug).single();
  return data;
}

export async function getVolunteerOpportunities() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("volunteer_opportunities")
    .select("*, volunteer_shifts(*)")
    .eq("is_active", true);
  return data ?? [];
}

export async function getActiveFunds() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("funds").select("*").eq("is_active", true).order("name");
  return data ?? [];
}

export async function getActiveProducts(kind?: string) {
  const supabase = createPublicClient();
  let request = supabase.from("products").select("*").eq("status", "active").order("name");
  if (kind && kind !== "all") {
    request = request.eq("kind", kind);
  }
  const { data } = await request;
  return data ?? [];
}

export async function getProductBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data: product } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("slug", slug)
    .single();
  if (!product) return product;

  // variant_stock_levels is a view with no declared FK to product_variants,
  // so PostgREST can't embed it — fetch and merge stock levels separately.
  const variantIds = (product.product_variants ?? []).map((v) => v.id);
  const { data: stockRows } = variantIds.length
    ? await supabase.from("variant_stock_levels").select("variant_id, available").in("variant_id", variantIds)
    : { data: [] as { variant_id: string; available: number }[] };
  const stockByVariant = new Map((stockRows ?? []).map((r) => [r.variant_id, r.available]));

  return {
    ...product,
    product_variants: (product.product_variants ?? []).map((v) => ({
      ...v,
      variant_stock_levels: stockByVariant.has(v.id) ? [{ available: stockByVariant.get(v.id)! }] : [],
    })),
  };
}

export async function getPublishedPageBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function getPublishedAnnouncements(limit = 5) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Strategic direction (2026-2027 Church Members Conference) -----------------

export async function getActiveChurchYear() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("church_years").select("*").eq("status", "active").maybeSingle();
  return data;
}

/** The seven "W" movements with their public objective/outcome. SMART goals
 * are fetched separately (getPublicGoalsForMovement) since only goals an
 * administrator has marked public_visible should ever reach this query. */
export async function getStrategicPriorities() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("strategic_priorities")
    .select("*")
    .eq("public_visible", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getStrategicMovements() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("strategic_movements")
    .select("*")
    .eq("public_visible", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getStrategicMovementBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("strategic_movements")
    .select("*")
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();
  return data;
}

/** Only goals a church administrator has explicitly marked public. */
export async function getPublicGoalsForMovement(movementId: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("strategic_goals")
    .select("*")
    .eq("strategic_movement_id", movementId)
    .eq("public_visible", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getPublishedDoctrineStatements() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("doctrine_statements")
    .select("*")
    .eq("status", "published")
    .order("ordinal", { ascending: true });
  return data ?? [];
}

/** Only ministry leaders a church administrator has explicitly approved for
 * public display — never the full roster. */
export async function getPublicMinistryLeaders(ministryId: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("ministry_assignments")
    .select("position_title, display_name")
    .eq("ministry_id", ministryId)
    .eq("public_visible", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}
