import type { Json } from "@/lib/supabase/types";
type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
type Base = { id: string; organization_id: string; created_at: string };
export type OfficeTask = Base & { title: string; description: string; assigned_to: string; assigned_by: string; parent_id: string | null; due_at: string | null; status: string; completion_note: string | null; completed_at: string | null; reviewed_by: string | null; updated_at: string };
export type EmailTemplate = Base & { name: string; slug: string; subject: string; body: string; reply_to: string | null; updated_at: string };
export type EmailDelivery = Base & { template_id: string | null; recipient: string; subject: string; html: string; reply_to: string | null; attachment_path: string | null; attachment_name: string | null; status: string; attempts: number; last_error: string | null; dedupe_key: string | null; created_by: string | null; sent_at: string | null; locked_at: string | null };
export type OfficeForm = Base & { title: string; description: string; fields: Json; is_active: boolean; created_by: string | null; updated_at: string; public_id: string; settings: Json; version: number };
export type FormAssignment = Base & { form_id: string; recipient_profile_id: string; token_hash: string; form_snapshot: Json; expires_at: string; sent_by: string | null; answers: Json; submitted_at: string | null; reminded_at: string | null; response_id: string | null };
/** One response to a form (lib/forms/server.ts has the typed version). */
export type FormResponse = { id: string; organization_id: string; form_id: string; assignment_id: string | null; respondent_profile_id: string | null; respondent_name: string | null; respondent_email: string | null; answers: Json; form_version: number; form_snapshot: Json; score: number | null; max_score: number | null; grading: Json; score_released: boolean; edit_token_hash: string | null; upload_session: string | null; submitted_at: string; updated_at: string };
export type CalendarConnection = Base & { user_id: string; calendar_profile_id: string | null; google_email: string; refresh_token: string; google_calendar_id: string; last_synced_at: string | null; last_error: string | null; sync_lock_until: string | null };
/** One website entry mirrored into one Google calendar, with the content both sides last agreed on. */
export type CalendarEventLink = { connection_id: string; event_id: string; google_event_id: string; synced_hash: string; google_updated: string | null; synced_at: string };
/** What the two-way sync did, shown to the people whose calendar it is. */
export type CalendarSyncLog = { id: number; connection_id: string; organization_id: string; direction: string; action: string; title: string | null; detail: string | null; created_at: string };
export type PastorSignatureAuthorization = { id: string; organization_id: string; email: string; name: string | null; token_hash: string; expires_at: string; invited_by: string; invited_at: string; accepted_at: string | null; signature_png: string | null; consent_text: string | null; revoked_at: string | null; revoked_by: string | null };
export type DocumentOfficiant = { authorization_id: string | null; request_id: string; organization_id: string; name: string; email: string; token_hash: string; binding: Json; expires_at: string; requested_by: string; requested_at: string; signed_at: string | null; signature_png: string | null; acknowledgement: string | null };
export type WorkflowTables = {
 pastor_signature_authorizations: Table<PastorSignatureAuthorization>;
 document_officiants: Table<DocumentOfficiant>;
 office_tasks: Table<OfficeTask>;
 email_templates: Table<EmailTemplate>;
 email_deliveries: Table<EmailDelivery>;
 office_forms: Table<OfficeForm>;
 form_assignments: Table<FormAssignment>;
 form_responses: Table<FormResponse>;
 integration_settings: Table<{ key: string; value: Json; updated_at: string }>;
 calendar_connections: Table<CalendarConnection>;
 calendar_event_links: Table<CalendarEventLink>;
 calendar_sync_log: Table<CalendarSyncLog>;
 calendar_subscriptions: Table<Base & { user_id: string; calendar_profile_id: string | null; token_hash: string; revoked_at: string | null }>;
 push_subscriptions: Table<Base & { user_id: string; endpoint: string; p256dh: string; auth: string }>;
};
