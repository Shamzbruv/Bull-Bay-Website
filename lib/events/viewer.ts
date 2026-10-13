import { getOrganizationId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Includes members/staff events only when the requesting account passes RLS. */
export async function getEventForViewer(slug: string) {
  const org = await getOrganizationId();
  if (!org) return null;
  const { data, error } = await (await createClient()).from('events').select('*').eq('organization_id', org).eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error) throw new Error('The event could not be loaded. Please try again.');
  return data;
}
