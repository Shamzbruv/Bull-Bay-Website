import { getCurrentProfile, getUserPermissions } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getEventRegistrations(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !(await getUserPermissions(profile.organization_id)).has('events.manage')) return null;
  const db = await createClient();
  const { data: event } = await db.from('events').select('id,title').eq('id', id).eq('organization_id', profile.organization_id).throwOnError().maybeSingle();
  if (!event) return null;
  const { data } = await db.from('event_registrations').select('*,profiles!event_registrations_profile_id_fkey(first_name,last_name,email,phone)').eq('event_id', id).order('created_at', { ascending: false }).throwOnError();
  const registrations = (data ?? []).map(row => {
    const person = row.profiles as unknown as { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
    const d = row.registration_details && typeof row.registration_details === 'object' && !Array.isArray(row.registration_details) ? row.registration_details : {};
    return { id: row.id, profileId: row.profile_id, name: row.guest_name || [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown', email: row.guest_email || person?.email || '', phone: row.guest_phone || person?.phone || '', member: typeof d.is_member === 'boolean' ? (d.is_member ? 'Yes' : 'No') : 'Not recorded', quantity: row.quantity, status: row.status, attendees: Array.isArray(d.attendees) ? d.attendees.filter(x => typeof x === 'string').join('\n') : '', requirements: typeof d.requirements === 'string' ? d.requirements : '', notes: row.notes || '', createdAt: row.created_at };
  });
  return { event, registrations };
}
