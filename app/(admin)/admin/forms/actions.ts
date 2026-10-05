"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { officeContext, recordOfficeAction } from "@/lib/office/context";
import { queueOfficeEmail, queueRawOfficeEmail } from "@/lib/office/email";
import { renderComposedEmail } from "@/lib/email/templates";
import { greetingName } from "@/lib/members/name";
import { SITE_URL } from "@/lib/org";
import { definitionProblems, idsIn, newId } from "@/lib/forms/builder";
import { definitionSchema, type FormDefinition } from "@/lib/forms/schema";
import { gradeResponse, type ManualGrades } from "@/lib/forms/score";
import { UPLOAD_BUCKET, definitionOf, hashToken, quizOutcome, type FormRow, type ResponseRow } from "@/lib/forms/server";
import { BLANK_DEFINITION, FORM_TEMPLATES } from "@/lib/forms/templates";

// The church office's side of forms. Every action checks forms.manage.

type Result = { status: "success" | "error"; message: string };
const ok = (message: string): Result => ({ status: "success", message });
const fail = (error: unknown): Result => ({ status: "error", message: error instanceof Error ? error.message : "That didn't work. Please try again." });

async function ownForm(formId: string) {
  const context = await officeContext("forms.manage");
  const { data } = await context.db.from("office_forms").select("*").eq("organization_id", context.org).eq("id", formId).maybeSingle();
  if (!data) throw new Error("That form no longer exists.");
  return { ...context, form: data as unknown as FormRow };
}

const publicIdFor = () => randomBytes(9).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toLowerCase() || randomBytes(5).toString("hex");

/** A new form, blank or from one of the church templates. */
export async function createForm(templateId: string | null): Promise<Result & { id?: string }> {
  try {
    const { db, org, user } = await officeContext("forms.manage");
    const template = templateId ? FORM_TEMPLATES.find((t) => t.id === templateId) : null;
    const definition: FormDefinition = structuredClone(template?.definition ?? BLANK_DEFINITION);
    const { data, error } = await db
      .from("office_forms")
      .insert({ organization_id: org, title: definition.title, description: definition.description, fields: definition.items, settings: definition.settings, created_by: user.id, public_id: publicIdFor(), is_active: true })
      .select("id")
      .single();
    if (error || !data) throw new Error("The form couldn't be created.");
    await recordOfficeAction(org, user.id, "form.created", "office_forms", data.id, { template: templateId ?? "blank" });
    return { ...ok("Form created."), id: data.id };
  } catch (error) {
    return fail(error);
  }
}

/** The builder saves as people type. `expectedVersion` stops two people
 *  editing the same form from silently overwriting each other. */
export async function saveFormDefinition(formId: string, expectedVersion: number, json: string): Promise<Result & { version?: number; problems?: string[] }> {
  try {
    const { db, org, user, form } = await ownForm(formId);
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      throw new Error("The form couldn't be read. Please reload the page.");
    }
    const parsed = definitionSchema.safeParse(raw);
    const problems = parsed.success ? definitionProblems(parsed.data) : definitionProblems(raw as FormDefinition);
    if (!parsed.success || problems.length) return { status: "error", message: problems[0] ?? "Something in the form isn't valid.", problems };
    const definition = parsed.data;
    if (form.version !== expectedVersion) return { status: "error", message: "Someone else changed this form a moment ago. Reload the page to see their changes, then make yours again." };
    const { data, error } = await db
      .from("office_forms")
      .update({ title: definition.title, description: definition.description, fields: definition.items, settings: definition.settings, version: form.version + 1, updated_at: new Date().toISOString() })
      .eq("organization_id", org)
      .eq("id", formId)
      .eq("version", expectedVersion)
      .select("version")
      .maybeSingle();
    if (error) throw new Error("The form couldn't be saved.");
    if (!data) return { status: "error", message: "Someone else changed this form a moment ago. Reload the page to see their changes, then make yours again." };
    // One audit entry per editing session is plenty: record the first save.
    if (expectedVersion === 1 || Date.now() - new Date(form.updated_at).getTime() > 30 * 60 * 1000) {
      await recordOfficeAction(org, user.id, "form.updated", "office_forms", formId, { version: String(data.version) });
    }
    return { ...ok("Saved."), version: data.version as number };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateForm(formId: string): Promise<Result & { id?: string }> {
  try {
    const { db, org, user, form } = await ownForm(formId);
    const definition = definitionOf(form);
    const { data, error } = await db
      .from("office_forms")
      .insert({
        organization_id: org,
        title: `Copy of ${definition.title}`.slice(0, 300),
        description: definition.description,
        fields: definition.items,
        settings: { ...definition.settings, accepting: true },
        created_by: user.id,
        public_id: publicIdFor(),
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("The copy couldn't be made.");
    await recordOfficeAction(org, user.id, "form.created", "office_forms", data.id, { copied_from: formId });
    revalidatePath("/admin/forms");
    return { ...ok("Copied."), id: data.id };
  } catch (error) {
    return fail(error);
  }
}

type Db = Awaited<ReturnType<typeof officeContext>>["db"];

async function removeUploads(db: Db, prefix: string) {
  const { data: entries } = await db.storage.from(UPLOAD_BUCKET).list(prefix, { limit: 1000 });
  const paths: string[] = [];
  for (const entry of entries ?? []) {
    if (entry.id) paths.push(`${prefix}/${entry.name}`);
    else {
      const { data: inner } = await db.storage.from(UPLOAD_BUCKET).list(`${prefix}/${entry.name}`, { limit: 1000 });
      for (const file of inner ?? []) if (file.id) paths.push(`${prefix}/${entry.name}/${file.name}`);
    }
  }
  for (let i = 0; i < paths.length; i += 100) await db.storage.from(UPLOAD_BUCKET).remove(paths.slice(i, i + 100));
  return paths.length;
}

/** The form's pictures (header, image items): the ones uploaded for it and
 *  any it showed from a form it was copied from, unless another form still
 *  shows them. */
async function removeImages(db: Db, org: string, form: FormRow) {
  const own = `forms/${form.id}`;
  const { data: files } = await db.storage.from("public-site").list(own, { limit: 1000 });
  const candidates = new Set((files ?? []).filter((f) => f.id).map((f) => `${own}/${f.name}`));
  for (const match of JSON.stringify([form.fields, form.settings]).matchAll(/\/storage\/v1\/object\/public\/public-site\/(forms\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+)/g)) candidates.add(match[1]!);
  if (!candidates.size) return;
  const { data: others } = await db.from("office_forms").select("fields, settings").eq("organization_id", org).neq("id", form.id);
  const inUse = JSON.stringify(others ?? []);
  const unused = [...candidates].filter((path) => !inUse.includes(path));
  if (unused.length) await db.storage.from("public-site").remove(unused);
}

export async function deleteForm(formId: string): Promise<Result> {
  try {
    const { db, org, user, form } = await ownForm(formId);
    const { count } = await db.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", formId);
    const files = await removeUploads(db, formId);
    await removeImages(db, org, form);
    const { error } = await db.from("office_forms").delete().eq("organization_id", org).eq("id", formId);
    if (error) throw new Error("The form couldn't be deleted.");
    await recordOfficeAction(org, user.id, "form.deleted", "office_forms", formId, { title: form.title, responses: String(count ?? 0), files: String(files) });
    revalidatePath("/admin/forms");
    return ok("Form deleted.");
  } catch (error) {
    return fail(error);
  }
}

export async function setAccepting(formId: string, accepting: boolean): Promise<Result> {
  try {
    const { db, org, form } = await ownForm(formId);
    const settings = { ...definitionOf(form).settings, accepting };
    const { error } = await db.from("office_forms").update({ settings, version: form.version + 1, updated_at: new Date().toISOString() }).eq("organization_id", org).eq("id", formId);
    if (error) throw new Error("That couldn't be changed.");
    revalidatePath(`/admin/forms/${formId}`);
    return ok(accepting ? "Accepting responses." : "No longer accepting responses.");
  } catch (error) {
    return fail(error);
  }
}

export async function deleteResponses(formId: string, responseIds: string[] | "all"): Promise<Result> {
  try {
    const { db, org, user, form } = await ownForm(formId);
    let query = db.from("form_responses").select("id, upload_session").eq("form_id", form.id);
    if (responseIds !== "all") query = query.in("id", responseIds.slice(0, 1000));
    const { data: rows } = await query;
    const sessions = [...new Set((rows ?? []).flatMap((r) => (r.upload_session ? [r.upload_session as string] : [])))];
    for (const session of sessions) await removeUploads(db, `${form.id}/${session}`);
    const ids = (rows ?? []).map((r) => r.id as string);
    if (ids.length) {
      const { error } = await db.from("form_responses").delete().eq("form_id", form.id).in("id", ids);
      if (error) throw new Error("The responses couldn't be deleted.");
    }
    await recordOfficeAction(org, user.id, "form.responses_deleted", "office_forms", formId, { count: String(ids.length) });
    revalidatePath(`/admin/forms/${formId}`);
    return ok(ids.length === 1 ? "Response deleted." : `${ids.length} responses deleted.`);
  } catch (error) {
    return fail(error);
  }
}

/** Marks given by hand ({ questionId: { points, feedback } }). */
export async function gradeFormResponse(formId: string, responseId: string, grading: ManualGrades): Promise<Result & { score?: number; maxScore?: number }> {
  try {
    const { db, form } = await ownForm(formId);
    const { data } = await db.from("form_responses").select("*").eq("form_id", form.id).eq("id", responseId).maybeSingle();
    if (!data) throw new Error("That response no longer exists.");
    const response = data as unknown as ResponseRow;
    const clean: ManualGrades = {};
    for (const [id, grade] of Object.entries(grading ?? {})) {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(id)) continue;
      const points = typeof grade?.points === "number" && Number.isFinite(grade.points) ? grade.points : undefined;
      const feedback = typeof grade?.feedback === "string" && grade.feedback.trim() ? grade.feedback.trim().slice(0, 1000) : undefined;
      if (points !== undefined || feedback) clean[id] = { ...(points !== undefined ? { points } : {}), ...(feedback ? { feedback } : {}) };
    }
    const result = gradeResponse(response.form_snapshot, response.answers, clean);
    const { error } = await db.from("form_responses").update({ grading: clean, score: result.score, max_score: result.maxScore }).eq("id", responseId);
    if (error) throw new Error("The marks couldn't be saved.");
    revalidatePath(`/admin/forms/${formId}`);
    return { ...ok("Marks saved."), score: result.score, maxScore: result.maxScore };
  } catch (error) {
    return fail(error);
  }
}

/** Share quiz scores, and email them to people who gave an address. */
export async function releaseScores(formId: string, responseIds: string[] | "all", email: boolean): Promise<Result> {
  try {
    const { db, org, form } = await ownForm(formId);
    const definition = definitionOf(form);
    let query = db.from("form_responses").select("*").eq("form_id", form.id).eq("score_released", false);
    if (responseIds !== "all") query = query.in("id", responseIds.slice(0, 1000));
    const { data } = await query;
    const rows = (data ?? []) as unknown as ResponseRow[];
    if (!rows.length) return ok("Every score has already been released.");
    const { error } = await db.from("form_responses").update({ score_released: true }).in("id", rows.map((r) => r.id));
    if (error) throw new Error("The scores couldn't be released.");
    let emailed = 0;
    if (email) {
      for (const row of rows) {
        if (!row.respondent_email) continue;
        const outcome = quizOutcome(row.form_snapshot, row.answers, row.grading, definition.settings);
        const lines = outcome.questions.map((q) => `${q.correct === true ? "✓" : q.correct === false ? "✗" : "•"} ${q.title}${outcome.showPoints ? ` (${q.points}/${q.max})` : ""}${q.correctAnswer ? `\n   Correct answer: ${q.correctAnswer}` : ""}${q.feedback ? `\n   ${q.feedback}` : ""}`);
        const subject = `Your score: ${definition.title}`;
        await queueRawOfficeEmail({
          org,
          recipient: row.respondent_email,
          subject,
          html: renderComposedEmail({ heading: subject, bodyText: `Dear ${row.respondent_name?.split(" ")[0] || "friend"},\n\n${outcome.showPoints ? `You scored ${outcome.score} out of ${outcome.maxScore}.\n\n` : ""}${lines.join("\n")}\n\nWith blessings,\nNew Testament Church of God, Bull Bay` }),
          dedupeKey: `form-score-${row.id}`,
        }).catch(() => undefined);
        emailed++;
      }
    }
    revalidatePath(`/admin/forms/${formId}`);
    return ok(`${rows.length} ${rows.length === 1 ? "score" : "scores"} released${email ? `, ${emailed} emailed` : ""}.`);
  } catch (error) {
    return fail(error);
  }
}

/** Personal links emailed to members: their answers are linked to them,
 *  and the office can see who hasn't responded yet. */
export async function sendFormInvitations(formId: string, profileIds: string[]): Promise<Result> {
  try {
    const { db, org, user, form } = await ownForm(formId);
    const ids = [...new Set(profileIds)].slice(0, 300);
    if (!ids.length) throw new Error("Choose at least one person.");
    const definition = definitionOf(form);
    const { data: people } = await db.from("profiles").select("id, email, first_name, last_name").eq("organization_id", org).in("id", ids);
    let sent = 0;
    let skipped = 0;
    for (const person of people ?? []) {
      if (!person.email) {
        skipped++;
        continue;
      }
      const token = randomBytes(32).toString("base64url");
      const { data: assignment, error } = await db
        .from("form_assignments")
        .insert({ organization_id: org, form_id: form.id, recipient_profile_id: person.id, token_hash: hashToken(token), form_snapshot: { title: definition.title, version: form.version }, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), sent_by: user.id })
        .select("id")
        .single();
      if (error || !assignment) continue;
      await queueOfficeEmail({
        org,
        recipient: person.email,
        template: "form-invitation",
        fields: { recipient_name: greetingName(person), form_title: definition.title, action_url: `${SITE_URL}/f/${form.public_id}?invite=${token}` },
        dedupeKey: `form-${assignment.id}`,
        actor: user.id,
      }).catch(() => undefined);
      sent++;
    }
    await recordOfficeAction(org, user.id, "form.sent", "office_forms", formId, { invitations: String(sent) });
    revalidatePath(`/admin/forms/${formId}`);
    return ok(`${sent} ${sent === 1 ? "invitation" : "invitations"} sent${skipped ? `; ${skipped} without an email address were skipped` : ""}.`);
  } catch (error) {
    return fail(error);
  }
}

/** A new link (the old one stops working) and a reminder email. */
export async function remindInvitation(formId: string, assignmentId: string): Promise<Result> {
  try {
    const { db, org, user, form } = await ownForm(formId);
    const { data: assignment } = await db.from("form_assignments").select("id, recipient_profile_id, submitted_at").eq("form_id", form.id).eq("id", assignmentId).maybeSingle();
    if (!assignment) throw new Error("That invitation no longer exists.");
    if (assignment.submitted_at) throw new Error("They've already responded.");
    const { data: person } = await db.from("profiles").select("email, first_name, last_name").eq("id", assignment.recipient_profile_id).maybeSingle();
    if (!person?.email) throw new Error("They have no email address on file.");
    const token = randomBytes(32).toString("base64url");
    const { error } = await db.from("form_assignments").update({ token_hash: hashToken(token), expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), reminded_at: new Date().toISOString() }).eq("id", assignmentId);
    if (error) throw new Error("The reminder couldn't be sent.");
    const title = definitionOf(form).title;
    await queueOfficeEmail({
      org,
      recipient: person.email,
      template: "form-invitation",
      fields: { recipient_name: greetingName(person), form_title: title, action_url: `${SITE_URL}/f/${form.public_id}?invite=${token}` },
      dedupeKey: `form-reminder-${assignmentId}-${Date.now()}`,
      actor: user.id,
    });
    revalidatePath(`/admin/forms/${formId}`);
    return ok("Reminder sent with a fresh link.");
  } catch (error) {
    return fail(error);
  }
}

export async function cancelInvitation(formId: string, assignmentId: string): Promise<Result> {
  try {
    const { db, form } = await ownForm(formId);
    const { error } = await db.from("form_assignments").delete().eq("form_id", form.id).eq("id", assignmentId).is("submitted_at", null);
    if (error) throw new Error("That invitation couldn't be cancelled.");
    revalidatePath(`/admin/forms/${formId}`);
    return ok("Invitation cancelled; its link no longer works.");
  } catch (error) {
    return fail(error);
  }
}

/** A picture for a form's header or an image item: public, like the rest
 *  of the church's website images. */
export async function uploadFormImage(formId: string, data: FormData): Promise<Result & { url?: string }> {
  try {
    const { db, form } = await ownForm(formId);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("Choose an image.");
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) throw new Error("Use a PNG, JPEG, GIF or WebP image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Keep images under 5 MB.");
    const ext = file.type.split("/")[1]!.replace("jpeg", "jpg");
    const path = `forms/${form.id}/${newId("img", idsIn([]))}.${ext}`;
    const { error } = await db.storage.from("public-site").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) throw new Error("The image couldn't be uploaded.");
    return { ...ok("Uploaded."), url: db.storage.from("public-site").getPublicUrl(path).data.publicUrl };
  } catch (error) {
    return fail(error);
  }
}

