import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getCurrentProfile, getUserPermissions } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/members/name";
import { FormNotice } from "@/components/forms/form-notice";
import { FormRenderer } from "@/components/forms/form-renderer";
import {
  decodePrefill,
  definitionOf,
  findEditableResponse,
  formAvailability,
  hashToken,
  itemsForRespondent,
  loadFormByPublicId,
  opensAtText,
  prefillFor,
  remainingSpots,
  respondentSettings,
  signInNeeded,
  type ResponseRow,
} from "@/lib/forms/server";

type Params = { params: Promise<{ publicId: string }>; searchParams: Promise<{ preview?: string; edit?: string; prefill?: string; embed?: string; invite?: string; mine?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const form = await loadFormByPublicId((await params).publicId);
  return { title: form?.title ?? "Church form", robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function PublicFormPage({ params, searchParams }: Params) {
  const { publicId } = await params;
  const query = await searchParams;
  const form = await loadFormByPublicId(publicId);
  if (!form) notFound();
  const definition = definitionOf(form);
  const { settings } = definition;
  const accent = settings.theme.accent;
  const signedIn = await getCurrentProfile();
  const profile = signedIn && signedIn.organization_id === form.organization_id ? signedIn : null;
  const isStaff = profile ? (await getUserPermissions(form.organization_id)).has("forms.manage") : false;
  const preview = query.preview === "1" && isStaff;
  const path = `/f/${publicId}`;

  // An emailed invitation: answered as the person it was sent to, no
  // sign-in needed (the link itself is private to them).
  let invitee: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null = null;
  if (query.invite && !preview) {
    const db = createServiceRoleClient();
    const valid = /^[A-Za-z0-9_-]{43}$/.test(query.invite);
    const { data: assignment } = valid ? await db.from("form_assignments").select("form_id, recipient_profile_id, submitted_at, expires_at").eq("token_hash", hashToken(query.invite)).maybeSingle() : { data: null };
    if (!assignment || assignment.form_id !== form.id) {
      return <FormNotice formTitle={definition.title} title="This invitation link doesn't work" message="Please ask the church office for a new link." accent={accent} />;
    }
    if (assignment.submitted_at) return <FormNotice formTitle={definition.title} title="Thank you" message="You've already completed this form." accent={accent} />;
    if (new Date(assignment.expires_at) < new Date()) return <FormNotice formTitle={definition.title} title="This invitation has expired" message="Please ask the church office for a new link." accent={accent} />;
    const { data } = await db.from("profiles").select("id, first_name, last_name, email, phone").eq("id", assignment.recipient_profile_id).maybeSingle();
    invitee = data;
  }

  if (!preview) {
    const open = await formAvailability(form, settings);
    if (!open.open) {
      return (
        <FormNotice
          formTitle={definition.title}
          title={open.reason === "not_yet_open" ? "Not open yet" : "This form is closed"}
          message={open.reason === "not_yet_open" && open.opensAt ? `It opens on ${opensAtText(open.opensAt)}.` : open.message}
          accent={accent}
        />
      );
    }
    if (signInNeeded(settings) && !profile && !invitee) {
      return (
        <FormNotice
          formTitle={definition.title}
          title="Please sign in to respond"
          message="This form is for members of the church. Sign in with your church account and you'll come straight back here."
          action={{ href: `/login?next=${encodeURIComponent(path)}`, label: "Sign in" }}
          accent={accent}
        />
      );
    }
  }

  let editing: ResponseRow | null = null;
  let editOwn = false;
  if (!preview && query.edit) {
    editing = settings.allowEdit ? await findEditableResponse(form, { editToken: query.edit }) : null;
    if (!editing) {
      return <FormNotice formTitle={definition.title} title="This link can't be used to edit any more" message="Responses to this form can't be changed, or the response was removed." accent={accent} />;
    }
  } else if (!preview && !invitee && profile && query.mine && /^[0-9a-f-]{36}$/.test(query.mine)) {
    // A member changing one of their own responses, from the member portal.
    const { data } = await createServiceRoleClient().from("form_responses").select("*").eq("form_id", form.id).eq("id", query.mine).eq("respondent_profile_id", profile.id).maybeSingle();
    if (!data || !settings.allowEdit) {
      return <FormNotice formTitle={definition.title} title="This response can't be changed" message="Responses to this form can't be changed after they're sent." accent={accent} />;
    }
    editing = data as unknown as ResponseRow;
    editOwn = true;
  } else if (!preview && !invitee && profile && settings.limitOneResponse) {
    const mine = await findEditableResponse(form, { profileId: profile.id });
    if (mine && !settings.allowEdit) {
      return <FormNotice formTitle={definition.title} title="You've already responded" message="Thank you. This form takes one response per person." accent={accent} />;
    }
    if (mine) {
      editing = mine;
      editOwn = true;
    }
  }

  const initialAnswers = editing
    ? (editing.answers as Record<string, unknown>)
    : { ...prefillFor(definition.items, invitee ?? profile), ...decodePrefill(query.prefill, definition.items) };
  const who = invitee ?? profile;

  return (
    <div className={query.embed === "1" ? "fr-embed" : undefined}>
      <FormRenderer
        form={{
          publicId,
          version: form.version,
          title: definition.title,
          description: definition.description,
          items: itemsForRespondent(definition.items),
          settings: respondentSettings(settings),
        }}
        initialAnswers={initialAnswers}
        remaining={await remainingSpots(form.id, definition.items, editing?.id)}
        respondent={who ? { name: fullName(who) || who.email || "Member", email: who.email ?? null } : null}
        mode={preview ? "preview" : editing ? "edit" : "live"}
        editToken={editing && !editOwn ? query.edit : null}
        editOwn={editOwn}
        editResponseId={editOwn ? editing?.id ?? null : null}
        inviteToken={invitee ? query.invite : null}
        seed={randomUUID()}
        uploadSession={editing?.upload_session ?? randomUUID()}
      />
    </div>
  );
}
