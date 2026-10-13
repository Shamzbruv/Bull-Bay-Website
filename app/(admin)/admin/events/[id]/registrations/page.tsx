import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventRegistrations } from "@/lib/events/office";

export default async function EventRegistrations({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEventRegistrations(id);
  if (!result) notFound();
  const { event, registrations } = result;
  const active = registrations.filter(r => ['registered','attended'].includes(r.status));
  return <>
    <div className="dashboard-header"><div><p className="section-kicker">Church office · Event registrations</p><h1>{event.title}</h1><p>{registrations.length} registrations · {active.reduce((n, r) => n + r.quantity, 0)} confirmed attendees</p></div><a className="secondary-button" href={`/api/office/events/${id}/registrations`}>Download registrations (CSV)</a></div>
    <div className="panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Registrant</th><th>Contact</th><th>Church member</th><th>Attendees</th><th>Information</th><th>Status / received</th></tr></thead><tbody>{registrations.map(r => <tr key={r.id}>
      <td>{r.profileId ? <Link href={`/admin/people/${r.profileId}`}>{r.name}</Link> : r.name}</td><td>{r.email}<br/>{r.phone}</td><td>{r.member}</td><td>{r.quantity}<p style={{whiteSpace:'pre-wrap'}}>{r.attendees}</p></td><td><strong>Special requirements</strong><p style={{whiteSpace:'pre-wrap'}}>{r.requirements || 'None supplied'}</p><strong>Notes</strong><p style={{whiteSpace:'pre-wrap'}}>{r.notes || '—'}</p></td><td><span className="badge">{r.status}</span><p>{new Date(r.createdAt).toLocaleString('en-JM',{timeZone:'America/Jamaica'})}</p></td>
    </tr>)}</tbody></table></div>{!registrations.length && <p className="panel-empty">No registrations yet.</p>}</div>
    <Link href="/admin/events">Back to events</Link>
  </>;
}
