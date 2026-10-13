import { createServiceRoleClient } from "@/lib/supabase/server";

export async function currentConferenceDocument() {
  const { data, error } = await createServiceRoleClient().storage.from('member-resources').list('conference', { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } });
  if (error) throw new Error('The conference document could not be loaded. Please try again.');
  return data?.find(f => /\.(pptx|pdf)$/i.test(f.name)) ?? null;
}
