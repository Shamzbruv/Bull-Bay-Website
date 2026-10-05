import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { roleMembers } from "@/lib/office/context";
import { notifyUsers } from "@/lib/notifications";
import { queueOfficeEmail } from "@/lib/office/email";
import { fullName } from "@/lib/members/name";
import { SITE_URL } from "@/lib/org";
import { answerToText, responseAsLines } from "./display";
import { availability, isAnswered, type Availability } from "./logic";
import { readSettings, itemSchema, isQuestion, type Answers, type FileAnswer, type FormDefinition, type FormItem, type FormSettings, type Question } from "./schema";
import { gradeResponse, type ManualGrades } from "./score";
import { checkResponse } from "./validate";
import { choiceIds, filesOf } from "./values";

// Everything about answering a form that must happen on the server: who is
// answering, whether the form takes answers right now, spot limits,
// uploaded files, quiz marking, saving, receipts and telling the office.

export const UPLOAD_BUCKET = "form-uploads";

export type FormRow = {
  id: string;
  organization_id: string;
  public_id: string;
  title: string;
  description: string;
  fields: unknown;
  settings: unknown;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ResponseRow = {
  id: string;
  organization_id: string;
  form_id: string;
  assignment_id: string | null;
  respondent_profile_id: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Answers;
  form_version: number;
  form_snapshot: FormItem[];
  score: number | null;
  max_score: number | null;
  grading: ManualGrades;
  score_released: boolean;
  edit_token_hash: string | null;
  upload_session: string | null;
  submitted_at: string;
  updated_at: string;
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function definitionOf(row: Pick<FormRow, "title" | "description" | "fields" | "settings">): FormDefinition {
  const items = Array.isArray(row.fields)
    ? row.fields.flatMap((raw) => {
        const parsed = itemSchema.safeParse(raw);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  return { title: row.title, description: row.description ?? "", items, settings: readSettings(row.settings) };
}

/** What a respondent's browser receives: point values, but never the
 *  answer key or the feedback that would give it away. */
export function itemsForRespondent(items: FormItem[]): FormItem[] {
  return items.map((item) => (isQuestion(item) && item.quiz ? { ...item, quiz: { points: item.quiz.points, correct: [] } } : item));
}

export function signInNeeded(settings: FormSettings): boolean {
  return settings.requireSignIn || settings.limitOneResponse || settings.collectEmail === "verified";
}

export async function loadFormByPublicId(publicId: string): Promise<FormRow | null> {
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(publicId)) return null;
  const { data } = await createServiceRoleClient().from("office_forms").select("*").eq("public_id", publicId).maybeSingle();
  return (data as FormRow | null) ?? null;
}

export async function countResponses(formId: string, exceptId?: string): Promise<number> {
  let query = createServiceRoleClient().from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", formId);
  if (exceptId) query = query.neq("id", exceptId);
  const { count } = await query;
  return count ?? 0;
}

export async function formAvailability(form: FormRow, settings: FormSettings): Promise<Availability> {
  if (!form.is_active) return { open: false, reason: "closed", message: settings.closedMessage };
  return availability(settings, settings.responseLimit ? await countResponses(form.id) : 0);
}

/** How many people have picked each spot-limited choice: question → option → count. */
export async function spotsTaken(formId: string, items: FormItem[], exceptResponseId?: string): Promise<Record<string, Record<string, number>>> {
  const limited = items.filter((i): i is Question => isQuestion(i) && "options" in i && i.options.some((o) => o.limit));
  if (!limited.length) return {};
  let query = createServiceRoleClient().from("form_responses").select("id, answers").eq("form_id", formId).limit(20000);
  if (exceptResponseId) query = query.neq("id", exceptResponseId);
  const { data } = await query;
  const taken: Record<string, Record<string, number>> = {};
  for (const question of limited) {
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { answers: Answers }[]) {
      for (const id of choiceIds(row.answers?.[question.id])) counts[id] = (counts[id] ?? 0) + 1;
    }
    taken[question.id] = counts;
  }
  return taken;
}

function fullSpots(items: FormItem[], answers: Answers, taken: Record<string, Record<string, number>>, slack = 0): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const item of items) {
    if (!isQuestion(item) || !("options" in item)) continue;
    for (const id of choiceIds(answers[item.id])) {
      const option = item.options.find((o) => o.id === id);
      if (option?.limit && (taken[item.id]?.[id] ?? 0) + slack > option.limit) {
        errors[item.id] = `"${option.label}" just filled up. Please choose another.`;
      }
    }
  }
  return errors;
}

const picked = (value: Answers[string] | undefined, optionId: string) => choiceIds(value).includes(optionId);

/** Spot-limited choices this response picked but arrived too late for. */
async function lateForSpots(formId: string, items: FormItem[], answers: Answers, responseId: string): Promise<Record<string, string>> {
  const wanted = items.flatMap((item) =>
    isQuestion(item) && "options" in item ? item.options.filter((o) => o.limit && picked(answers[item.id], o.id)).map((option) => ({ item, option })) : [],
  );
  if (!wanted.length) return {};
  const { data } = await createServiceRoleClient()
    .from("form_responses")
    .select("id, answers")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(20000);
  const errors: Record<string, string> = {};
  for (const { item, option } of wanted) {
    const order = ((data ?? []) as { id: string; answers: Answers }[]).filter((r) => picked(r.answers?.[item.id], option.id)).map((r) => r.id);
    if (order.indexOf(responseId) >= option.limit!) errors[item.id] = `"${option.label}" just filled up. Please choose another.`;
  }
  return errors;
}

export type Respondent = { profileId: string | null; authUserId: string | null; name: string | null; email: string | null };

export type QuizOutcome = {
  score: number;
  maxScore: number;
  showPoints: boolean;
  questions: { id: string; title: string; correct: boolean | null; points: number; max: number; yourAnswer: string; correctAnswer?: string; feedback?: string }[];
};

export type SubmitResult =
  | { ok: true; responseId: string; editToken: string | null; quiz: QuizOutcome | null; scorePending: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function correctAnswerText(question: Question): string {
  const key = question.quiz?.correct ?? [];
  if (!key.length) return "";
  if (question.type === "grid_choice") {
    return key
      .map((pair) => {
        const [row, column] = pair.split(":");
        return `${question.rows.find((r) => r.id === row)?.label}: ${question.columns.find((c) => c.id === column)?.label}`;
      })
      .join("; ");
  }
  if ("options" in question) {
    const labels = key.map((id) => question.options.find((o) => o.id === id)?.label ?? id);
    return question.type === "ranking" ? labels.map((l, i) => `${i + 1}. ${l}`).join(", ") : labels.join(", ");
  }
  return key[0] ?? "";
}

export function quizOutcome(items: FormItem[], answers: Answers, grading: ManualGrades, settings: FormSettings): QuizOutcome {
  const grade = gradeResponse(items, answers, grading);
  const questions: QuizOutcome["questions"] = [];
  for (const item of items) {
    const g = isQuestion(item) ? grade.questions[item.id] : undefined;
    if (!g || !isQuestion(item)) continue;
    const show = settings.quiz.showMissed || g.correct === true;
    if (!show) continue;
    questions.push({
      id: item.id,
      title: item.title,
      correct: settings.quiz.showMissed ? g.correct : null,
      points: g.points,
      max: g.max,
      yourAnswer: answerToText(item, answers[item.id]),
      ...(settings.quiz.showCorrect && g.correct === false ? { correctAnswer: correctAnswerText(item) } : {}),
      ...(g.correct === true && item.quiz?.feedbackCorrect ? { feedback: item.quiz.feedbackCorrect } : {}),
      ...(g.correct === false && item.quiz?.feedbackIncorrect ? { feedback: item.quiz.feedbackIncorrect } : {}),
      ...(grading[item.id]?.feedback ? { feedback: grading[item.id]!.feedback } : {}),
    });
  }
  return { score: grade.score, maxScore: grade.maxScore, showPoints: settings.quiz.showPoints, questions };
}

/** Files are uploaded straight to storage before submitting; check they
 *  really are there, in this respondent's folder, at the size claimed. */
async function verifyFiles(form: FormRow, items: FormItem[], answers: Answers, uploadSession: string | null, keep: FileAnswer[]): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const questions = items.filter((i): i is Question => isQuestion(i) && i.type === "file_upload");
  const wanted = questions.flatMap((q) => filesOf(answers[q.id]).map((file) => ({ q, file })));
  const fresh = wanted.filter(({ file }) => !keep.some((k) => k.path === file.path));
  if (!fresh.length) return errors;
  if (!uploadSession || !/^[0-9a-f-]{36}$/.test(uploadSession)) {
    for (const { q } of fresh) errors[q.id] = "Upload the file again.";
    return errors;
  }
  const folder = `${form.id}/${uploadSession}`;
  const { data: listed } = await createServiceRoleClient().storage.from(UPLOAD_BUCKET).list(folder, { limit: 100 });
  for (const { q, file } of fresh) {
    const name = file.path.startsWith(`${folder}/`) ? file.path.slice(folder.length + 1) : null;
    const stored = name ? listed?.find((f) => f.name === name) : undefined;
    const size = Number(stored?.metadata?.size ?? -1);
    if (!stored || size !== file.size) errors[q.id] = "That upload didn't finish. Please upload the file again.";
  }
  return errors;
}

/** Who responded, from the question that fills in a member's name, or
 *  failing that one simply called "Name" or "Your full name". */
function nameFromAnswers(items: FormItem[], answers: Answers): string | null {
  const answerTo = (q: FormItem | undefined) => {
    const v = q ? answers[q.id] : undefined;
    return typeof v === "string" ? v.trim() : "";
  };
  const byPrefill = (field: string) => answerTo(items.find((i) => isQuestion(i) && i.type === "short_text" && i.prefill === field));
  const byTitle = () => answerTo(items.find((i) => isQuestion(i) && i.type === "short_text" && /^\s*(your\s+)?(full\s+)?name\s*[:?]?\s*$/i.test(i.title)));
  return byPrefill("full_name") || [byPrefill("first_name"), byPrefill("last_name")].filter(Boolean).join(" ") || byTitle() || null;
}

function emailFromAnswers(items: FormItem[], answers: Answers): string | null {
  for (const item of items) {
    if (isQuestion(item) && item.type === "email") {
      const v = answers[item.id];
      if (typeof v === "string" && EMAIL.test(v)) return v;
    }
  }
  return null;
}

export async function submitResponse(input: {
  form: FormRow;
  raw: Record<string, unknown>;
  respondent: Respondent;
  typedEmail?: string | null;
  wantsReceipt?: boolean;
  uploadSession?: string | null;
  assignmentId?: string | null;
  /** Editing an earlier response, already confirmed to belong to this person. */
  editing?: ResponseRow | null;
}): Promise<SubmitResult> {
  const { form, respondent, editing } = input;
  const db = createServiceRoleClient();
  const definition = definitionOf(form);
  const { items, settings } = definition;

  if (editing && !settings.allowEdit) return { ok: false, error: "Responses to this form can't be changed after they're sent." };
  const open = await formAvailability(form, settings);
  if (!open.open && !(editing && open.reason === "full")) return { ok: false, error: open.message };
  if (signInNeeded(settings) && !respondent.profileId) return { ok: false, error: "Please sign in to respond to this form." };
  if (settings.limitOneResponse && !editing && respondent.profileId) {
    const { data: earlier } = await db.from("form_responses").select("id").eq("form_id", form.id).eq("respondent_profile_id", respondent.profileId).limit(1).maybeSingle();
    if (earlier) return { ok: false, error: "You've already responded to this form." };
  }

  let email: string | null = null;
  if (settings.collectEmail === "verified") email = respondent.email;
  else if (settings.collectEmail === "input") {
    const typed = (input.typedEmail ?? "").trim();
    if (!EMAIL.test(typed)) return { ok: false, error: "Enter your email address.", fieldErrors: { __email: "Enter a valid email address." } };
    email = typed;
  } else email = respondent.email;

  const checked = checkResponse(items, input.raw, settings.startNext);
  if (Object.keys(checked.errors).length) return { ok: false, error: "Some answers need attention.", fieldErrors: checked.errors };
  const answers = checked.answers;

  const kept = editing ? Object.values(editing.answers).flatMap((v) => filesOf(v)) : [];
  const fileErrors = await verifyFiles(form, items, answers, input.uploadSession ?? editing?.upload_session ?? null, kept);
  if (Object.keys(fileErrors).length) return { ok: false, error: "An upload needs attention.", fieldErrors: fileErrors };

  const spotErrors = fullSpots(items, answers, await spotsTaken(form.id, items, editing?.id), 1);
  if (Object.keys(spotErrors).length) return { ok: false, error: "A choice is full.", fieldErrors: spotErrors };

  const grading = editing?.grading ?? {};
  const grade = settings.quiz.enabled ? gradeResponse(items, answers, grading) : null;
  const name = respondent.name || nameFromAnswers(items, answers);
  email = email || emailFromAnswers(items, answers);
  const editToken = settings.allowEdit && !editing ? randomBytes(24).toString("base64url") : null;
  const row = {
    respondent_name: name?.slice(0, 300) ?? null,
    respondent_email: email?.slice(0, 320) ?? null,
    answers,
    form_version: form.version,
    form_snapshot: items,
    score: grade?.score ?? null,
    max_score: grade?.maxScore ?? null,
    score_released: Boolean(grade) && settings.quiz.release === "immediately" && !grade!.needsMarking,
    upload_session: input.uploadSession ?? editing?.upload_session ?? null,
  };

  let responseId: string;
  if (editing) {
    const { error } = await db.from("form_responses").update(row).eq("id", editing.id).eq("form_id", form.id);
    if (error) return { ok: false, error: "Your changes couldn't be saved. Please try again." };
    responseId = editing.id;
  } else {
    const { data, error } = await db
      .from("form_responses")
      .insert({
        ...row,
        organization_id: form.organization_id,
        form_id: form.id,
        assignment_id: input.assignmentId ?? null,
        respondent_profile_id: respondent.profileId,
        edit_token_hash: editToken ? hashToken(editToken) : null,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Your response couldn't be saved. Please try again." };
    responseId = data.id as string;
    // Two people taking the last spot at the same moment: whoever was
    // first keeps it, the other gives it back.
    const late = await lateForSpots(form.id, items, answers, responseId);
    if (Object.keys(late).length) {
      await db.from("form_responses").delete().eq("id", responseId);
      return { ok: false, error: "A choice is full.", fieldErrors: late };
    }
    if (input.assignmentId) {
      await db.from("form_assignments").update({ submitted_at: new Date().toISOString(), response_id: responseId, answers }).eq("id", input.assignmentId).is("submitted_at", null);
    }
  }

  // Telling people is best-effort: the response is already safe.
  await Promise.allSettled([
    tellTheOffice(form, definition, responseId, name, answers, Boolean(editing)),
    sendReceipt(form, definition, responseId, email, name, answers, editToken, settings.receipts === "always" || (settings.receipts === "requested" && Boolean(input.wantsReceipt))),
  ]);

  const released = Boolean(grade) && row.score_released;
  return {
    ok: true,
    responseId,
    editToken,
    quiz: released ? quizOutcome(items, answers, grading, settings) : null,
    scorePending: Boolean(grade) && !released,
  };
}

async function tellTheOffice(form: FormRow, definition: FormDefinition, responseId: string, name: string | null, answers: Answers, edited: boolean) {
  const { settings } = definition;
  const who = name || "Someone";
  const url = `/admin/forms/${form.id}?tab=responses&response=${responseId}`;
  if (settings.notify.office) {
    const office = await roleMembers(form.organization_id, ["secretary", "church_executive"]);
    const people = [...new Set([...office.flatMap((p) => (p.auth_user_id ? [p.auth_user_id] : [])), ...(form.created_by ? [form.created_by] : [])])];
    await notifyUsers(form.organization_id, people, { title: `${edited ? "Updated response" : "New response"}: ${definition.title}`, body: who, url, type: "form" });
  }
  if (settings.notify.emailProfileIds.length) {
    const { data: staff } = await createServiceRoleClient().from("profiles").select("id, email").eq("organization_id", form.organization_id).in("id", settings.notify.emailProfileIds);
    const lines = responseAsLines(definition.items, answers);
    for (const person of staff ?? []) {
      if (!person.email) continue;
      await queueOfficeEmail({
        org: form.organization_id,
        recipient: person.email,
        template: "staff-notification",
        fields: {
          heading: `${edited ? "Updated response" : "New response"}: ${definition.title}`,
          intro: `${who} ${edited ? "changed their response to" : "responded to"} "${definition.title}".`,
          details: lines.slice(0, 25).join("\n") + (lines.length > 25 ? `\n…and ${lines.length - 25} more answers` : ""),
          action_url: `${SITE_URL}${url}`,
        },
        dedupeKey: `form-response-${responseId}-${person.id}-${Date.now()}`,
      }).catch(() => undefined);
    }
  }
}

async function sendReceipt(form: FormRow, definition: FormDefinition, responseId: string, email: string | null, name: string | null, answers: Answers, editToken: string | null, wanted: boolean) {
  if (!wanted || !email) return;
  const lines = responseAsLines(definition.items, answers);
  await queueOfficeEmail({
    org: form.organization_id,
    recipient: email,
    template: "form-receipt",
    fields: {
      recipient_name: name?.split(" ")[0] || "friend",
      form_title: definition.title,
      answers: lines.length ? lines.join("\n") : "(no answers)",
      edit_line: editToken ? `\nYou can change your response here: ${SITE_URL}/f/${form.public_id}?edit=${editToken}\n` : "",
    },
    dedupeKey: `form-receipt-${responseId}-${Date.now()}`,
  });
}

/** The answers a respondent's earlier response had, for editing it. */
export async function findEditableResponse(form: FormRow, by: { editToken?: string | null; profileId?: string | null }): Promise<ResponseRow | null> {
  const db = createServiceRoleClient();
  if (by.editToken && /^[A-Za-z0-9_-]{20,60}$/.test(by.editToken)) {
    const { data } = await db.from("form_responses").select("*").eq("form_id", form.id).eq("edit_token_hash", hashToken(by.editToken)).maybeSingle();
    if (data) return data as ResponseRow;
  }
  if (by.profileId) {
    const { data } = await db.from("form_responses").select("*").eq("form_id", form.id).eq("respondent_profile_id", by.profileId).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
    if (data) return data as ResponseRow;
  }
  return null;
}

/** Prefill from the signed-in member's own details. */
export function prefillFor(items: FormItem[], profile: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null): Answers {
  if (!profile) return {};
  const out: Answers = {};
  for (const item of items) {
    if (!isQuestion(item)) continue;
    let value: string | null | undefined;
    if (item.type === "short_text" && item.prefill) {
      value = item.prefill === "full_name" ? fullName(profile) : item.prefill === "first_name" ? profile.first_name : item.prefill === "last_name" ? profile.last_name : item.prefill === "email" ? profile.email : profile.phone;
    } else if (item.type === "email" && item.prefill) value = profile.email;
    else if (item.type === "phone" && item.prefill) value = profile.phone;
    if (value && isAnswered(value)) out[item.id] = value;
  }
  return out;
}

/** Settings as the respondent's browser gets them: without the staff list. */
export function respondentSettings(settings: FormSettings): FormSettings {
  return { ...settings, notify: { office: false, emailProfileIds: [] } };
}

/** Spots left on each spot-limited choice: question → option → count. */
export async function remainingSpots(formId: string, items: FormItem[], exceptResponseId?: string): Promise<Record<string, Record<string, number>>> {
  const taken = await spotsTaken(formId, items, exceptResponseId);
  const out: Record<string, Record<string, number>> = {};
  for (const item of items) {
    if (!isQuestion(item) || !("options" in item)) continue;
    for (const option of item.options) {
      if (!option.limit) continue;
      (out[item.id] ??= {})[option.id] = Math.max(0, option.limit - (taken[item.id]?.[option.id] ?? 0));
    }
  }
  return out;
}

/** A pre-filled link's answers (?prefill=…, base64url JSON), limited to
 *  questions that exist; they're checked like any other answer on submit. */
export function decodePrefill(param: string | undefined | null, items: FormItem[]): Record<string, unknown> {
  if (!param || param.length > 20000) return {};
  try {
    const parsed = JSON.parse(Buffer.from(param, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const ids = new Set(items.filter(isQuestion).map((q) => q.id));
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter(([id]) => ids.has(id)));
  } catch {
    return {};
  }
}

export function opensAtText(iso: string): string {
  return new Date(iso).toLocaleString("en-JM", { timeZone: "America/Jamaica", dateStyle: "full", timeStyle: "short" });
}
