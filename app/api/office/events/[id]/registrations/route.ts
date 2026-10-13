import { getEventRegistrations } from "@/lib/events/office";
import { csvCell } from "@/lib/events/registration";
import { getCurrentProfile, getUserPermissions } from "@/lib/auth/session";
import { recordOfficeAction } from "@/lib/office/context";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response('Sign in required', { status: 401 });
  if (!(await getUserPermissions(profile.organization_id)).has('events.manage')) return new Response('Forbidden', { status: 403 });
  const { id } = await params;
  const result = await getEventRegistrations(id);
  if (!result) return new Response('Not found', { status: 404 });
  const rows = [['Name','Email','Phone','Church member','Number attending','Other attendees','Special requirements','Notes','Status','Received'], ...result.registrations.map(r => [r.name,r.email,r.phone,r.member,r.quantity,r.attendees,r.requirements,r.notes,r.status,r.createdAt])];
  await recordOfficeAction(profile.organization_id, profile.auth_user_id!, 'event.registrations_exported', 'events', id);
  return new Response('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), { headers: {'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="event-registrations.csv"','Cache-Control':'private, no-store'} });
}
