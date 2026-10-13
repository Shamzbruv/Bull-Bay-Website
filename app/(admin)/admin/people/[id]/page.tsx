import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AccessDenied } from "@/components/access-denied";
import { OfficeActionForm } from "@/components/office-action-form";
import { fieldLabel } from "@/lib/documents/design";
import { MEMBERSHIP_STATUSES } from "@/lib/members/records";
import { saveMember, deleteMember, saveMemberDetail, deleteMemberDetail } from "./actions";

export default async function MemberRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganizationId();
  const permissions = await getUserPermissions(org ?? "");
  if (!permissions.has("people.read")) return <AccessDenied />;
  const db = await createClient();
  const { data: p } = await db.from("profiles").select("*").eq("organization_id", org ?? "").eq("id", id).throwOnError().maybeSingle();
  if (!p) notFound();
  const [{ data: details }, { data: categories }, { data: grants }] = await Promise.all([
    db.from("member_details").select("*").eq("organization_id", org ?? "").eq("profile_id", id).order("category").order("label").throwOnError(),
    db.from("member_details").select("category").eq("organization_id", org ?? "").order("category").limit(2000).throwOnError(),
    db.from("user_roles").select("roles(name)").eq("organization_id", org ?? "").eq("user_id", p.auth_user_id ?? "00000000-0000-0000-0000-000000000000").throwOnError(),
  ]);
  const fields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address_line1', 'city', 'parish', 'marital_status', 'occupation', 'employer', 'job_title', 'emergency_contact_name', 'emergency_contact_phone', 'joined_at', 'deceased_at', 'membership_information', 'notes'] as const;
  const label = (key: string) => key === 'joined_at' ? 'Membership date' : key === 'deceased_at' ? 'Date of death (optional)' : fieldLabel(key);
  const canEdit = permissions.has("people.write");
  const roleNames = grants?.map(g => (g.roles as unknown as { name: string } | null)?.name).filter(Boolean);
  return <>
    <div className="dashboard-header"><div><p className="section-kicker">Member record</p><h1>{p.first_name} {p.last_name}</h1><span className="badge blue">{p.membership_status.replaceAll('_', ' ')}</span><p>Church roles: {roleNames?.join(', ') || 'No assigned role'} · {p.auth_user_id ? 'Account linked' : 'Directory record only'}</p></div><a className="secondary-button" href={`/api/office/people/${id}/file`}>Download member file (PDF)</a></div>
    <div className="panel"><h2>Personal and membership information</h2>{canEdit ? <OfficeActionForm key={p.updated_at} action={saveMember.bind(null, id)} label="Save member record">
      <input type="hidden" name="updated_at" value={p.updated_at} />
      <label>Membership status<select name="membership_status" defaultValue={p.membership_status}>{MEMBERSHIP_STATUSES.map(status => <option key={status} value={status}>{fieldLabel(status)}</option>)}</select></label>
      <div className="office-grid">{fields.map(k => <label key={k}>{label(k)}{['notes', 'membership_information'].includes(k) ? <textarea name={k} defaultValue={p[k] ?? ""} rows={4} maxLength={10000} /> : <input name={k} defaultValue={p[k] ?? ""} required={k === 'first_name' || k === 'last_name'} maxLength={500} type={k === 'email' ? 'email' : ['date_of_birth', 'joined_at', 'deceased_at'].includes(k) ? 'date' : 'text'} />}</label>)}</div>
    </OfficeActionForm> : <dl>{fields.map(k => <div className="office-card" key={k}><dt><strong>{label(k)}</strong></dt><dd style={{ whiteSpace: 'pre-wrap' }}>{p[k] || '—'}</dd></div>)}</dl>}</div>
    <div className="panel"><h2>Office categories and details</h2><p>Shared with authorized church staff. Choose an existing category or type a new one.</p>
      <datalist id="member-categories">{[...new Set((categories ?? []).map(d => d.category))].map(category => <option key={category} value={category} />)}</datalist>
      {details?.map(d => <details className="office-card" key={`${d.id}-${d.updated_at}`}><summary><strong>{d.category} · {d.label}</strong></summary>{canEdit ? <>
        <OfficeActionForm action={saveMemberDetail.bind(null, id)} label="Save detail"><input type="hidden" name="detail_id" value={d.id} /><input type="hidden" name="updated_at" value={d.updated_at} /><label>Category<input name="category" list="member-categories" defaultValue={d.category} required maxLength={100} /></label><label>Detail name<input name="label" defaultValue={d.label} required maxLength={100} /></label><label>Information<textarea name="value" defaultValue={d.value} required rows={3} maxLength={10000} /></label></OfficeActionForm>
        <details><summary>Remove this detail</summary><OfficeActionForm action={deleteMemberDetail.bind(null, id)} label="Delete detail"><input type="hidden" name="detail_id" value={d.id} /><input type="hidden" name="updated_at" value={d.updated_at} /><label>Type DELETE to confirm<input name="confirmation" required autoComplete="off" /></label></OfficeActionForm></details>
      </> : <p style={{ whiteSpace: 'pre-wrap' }}>{d.value}</p>}</details>)}
      {!details?.length && <p className="panel-empty">No additional details yet.</p>}
      {canEdit && <details className="office-card"><summary>+ Add a category and detail</summary><OfficeActionForm action={saveMemberDetail.bind(null, id)} label="Add detail"><label>Category<input name="category" list="member-categories" placeholder="e.g. Baptism, Membership, Ministry service" required maxLength={100} /></label><label>Detail name<input name="label" placeholder="e.g. Baptism date or former church" required maxLength={100} /></label><label>Information<textarea name="value" required rows={3} maxLength={10000} /></label></OfficeActionForm></details>}
    </div>
    {permissions.has("people.delete") && <details className="panel"><summary>Delete member record</summary><p>This removes the person and their office details and disables sign-in. Historical church transactions remain. Staff accounts and your own account are protected.</p><OfficeActionForm action={deleteMember.bind(null, id)} label="Delete member"><label>Type DELETE to confirm<input name="confirmation" required autoComplete="off" /></label></OfficeActionForm></details>}
    <Link href="/admin/people">Back to directory</Link>
  </>;
}
