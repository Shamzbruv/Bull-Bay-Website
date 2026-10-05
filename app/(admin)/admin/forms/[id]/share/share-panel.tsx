import { createServiceRoleClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/members/name";
import { SITE_URL } from "@/lib/org";
import { isQuestion, type FormDefinition } from "@/lib/forms/schema";
import { itemsForRespondent, type FormRow } from "@/lib/forms/server";
import { CopyField } from "../../../integrations/copy-field";
import { InvitationRow, InviteMembers, PrefillBuilder } from "./share-tools";

/** Every way to get the form to people. */
export async function SharePanel({ form, definition }: { form: FormRow; definition: FormDefinition }) {
  const db = createServiceRoleClient();
  const link = `${SITE_URL}/f/${form.public_id}`;
  const [{ data: invites }, { data: people }] = await Promise.all([
    db.from("form_assignments").select("id, recipient_profile_id, created_at, submitted_at, expires_at, reminded_at").eq("form_id", form.id).order("created_at", { ascending: false }).limit(500),
    db.from("profiles").select("id, first_name, last_name, email").eq("organization_id", form.organization_id).not("email", "is", null).order("last_name").limit(3000),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id as string, fullName(p) || (p.email as string)]));
  const members = (people ?? []).map((p) => ({ id: p.id as string, name: fullName(p) || (p.email as string), email: p.email as string }));
  const prefillable = itemsForRespondent(definition.items).filter(isQuestion).filter((q) => ["short_text", "long_text", "email", "phone", "number", "multiple_choice", "dropdown", "date", "time"].includes(q.type));

  return (
    <div className="fb-share">
      <section className="fb-panel">
        <h2>Link</h2>
        <CopyField label="Anyone with this link can open the form" value={link} hint={definition.settings.requireSignIn || definition.settings.limitOneResponse ? "They'll be asked to sign in with their church account." : undefined} />
        <div className="fb-row">
          <a className="fb-button is-secondary" href={`/f/${form.public_id}`} target="_blank" rel="noopener">
            Open the form
          </a>
          <a className="fb-button is-secondary" href={`https://wa.me/?text=${encodeURIComponent(`${definition.title}: ${link}`)}`} target="_blank" rel="noopener">
            Share on WhatsApp
          </a>
          <a className="fb-button is-secondary" href={`mailto:?subject=${encodeURIComponent(definition.title)}&body=${encodeURIComponent(`Please fill in "${definition.title}": ${link}`)}`}>
            Share by email
          </a>
        </div>
      </section>

      <section className="fb-panel fb-qr">
        <h2>QR code</h2>
        <div className="fb-qr-body">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated on the fly from the form's link */}
          <img src={`/api/forms/${form.public_id}/qr?format=svg`} alt={`QR code for ${definition.title}`} width={180} height={180} />
          <div>
            <p>For the bulletin, a poster, or the screen at the end of service: people point their phone&apos;s camera at it to open the form.</p>
            <a className="fb-button is-secondary" href={`/api/forms/${form.public_id}/qr?download=1&size=1200`}>
              Download for printing (PNG)
            </a>
          </div>
        </div>
      </section>

      <section className="fb-panel">
        <h2>Embed on a web page</h2>
        <CopyField label="Paste this HTML into another website" value={`<iframe src="${link}?embed=1" width="100%" height="900" style="border:0;max-width:760px" title="${definition.title.replace(/"/g, "&quot;")}"></iframe>`} />
      </section>

      <section className="fb-panel">
        <h2>Pre-filled link</h2>
        <p className="fb-hint">Fill in some answers, then share the link: people start with those answers already filled in (they can still change them).</p>
        <PrefillBuilder link={link} questions={prefillable} />
      </section>

      <section className="fb-panel">
        <h2>Invite members by email</h2>
        <p className="fb-hint">Each person gets a personal link. Their response is linked to them, and you can see who hasn&apos;t answered yet and send a reminder.</p>
        <InviteMembers formId={form.id} members={members} />
        {(invites ?? []).length > 0 && (
          <div className="fb-invites">
            <p className="fb-sub">Invitations</p>
            <ul>
              {(invites ?? []).map((invite) => (
                <InvitationRow
                  key={invite.id}
                  formId={form.id}
                  id={invite.id as string}
                  name={name.get(invite.recipient_profile_id as string) ?? "Member"}
                  sentAt={invite.created_at as string}
                  remindedAt={(invite.reminded_at as string | null) ?? null}
                  submittedAt={(invite.submitted_at as string | null) ?? null}
                  expired={!invite.submitted_at && new Date(invite.expires_at as string) < new Date()}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
