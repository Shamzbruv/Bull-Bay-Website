-- Forms become a full form builder (docs/FORMS.md): a public link for each
-- form, settings, responses from anyone (not just emailed invitations),
-- quiz scores, uploaded files and emailed receipts.

-- Each form gets a short public address (/f/<public_id>) and its settings.
-- `fields` now holds the builder's items (questions, sections, text,
-- images, videos); see lib/forms/schema.ts.
alter table public.office_forms
  add column if not exists public_id text not null default substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 12),
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1;
create unique index if not exists office_forms_public_id_key on public.office_forms (public_id);

-- Every response, whether from the public link, a signed-in member or an
-- emailed invitation. The form's questions are kept with each response, so
-- editing a form later never changes what an earlier response meant.
create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid not null references public.office_forms(id) on delete cascade,
  assignment_id uuid references public.form_assignments(id) on delete set null,
  respondent_profile_id uuid references public.profiles(id) on delete set null,
  respondent_name text check (respondent_name is null or char_length(respondent_name) <= 300),
  respondent_email text check (respondent_email is null or char_length(respondent_email) <= 320),
  answers jsonb not null default '{}'::jsonb,
  form_version integer not null default 1,
  form_snapshot jsonb not null default '[]'::jsonb,
  score numeric,
  max_score numeric,
  -- Marks and feedback given by hand: { questionId: { points, feedback } }.
  grading jsonb not null default '{}'::jsonb,
  score_released boolean not null default false,
  -- For "allow respondents to edit after submitting" without signing in.
  edit_token_hash text unique,
  -- Uploaded files live under form-uploads/<form_id>/<upload_session>/.
  upload_session text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists form_responses_form_idx on public.form_responses (form_id, submitted_at desc);
create index if not exists form_responses_respondent_idx on public.form_responses (respondent_profile_id);
drop trigger if exists form_responses_set_updated_at on public.form_responses;
create trigger form_responses_set_updated_at before update on public.form_responses
  for each row execute function public.set_updated_at();

-- Read by the office, and by the member who responded. All writes go
-- through the server, which checks the form's rules first.
alter table public.form_responses enable row level security;
drop policy if exists "form responses office read" on public.form_responses;
create policy "form responses office read" on public.form_responses
  for select using (public.has_permission(organization_id, 'forms.manage'));
drop policy if exists "form responses own read" on public.form_responses;
create policy "form responses own read" on public.form_responses
  for select using (respondent_profile_id is not null and respondent_profile_id = public.current_profile_id());

alter table public.form_assignments
  add column if not exists reminded_at timestamptz,
  add column if not exists response_id uuid references public.form_responses(id) on delete set null;
-- Deleting a form takes its invitations with it.
alter table public.form_assignments drop constraint if exists form_assignments_form_id_fkey;
alter table public.form_assignments
  add constraint form_assignments_form_id_fkey foreign key (form_id) references public.office_forms(id) on delete cascade;

-- Uploaded answers: private, read only through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('form-uploads', 'form-uploads', false, 26214400)
on conflict (id) do nothing;

-- The Responses tab updates as answers arrive.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.form_responses; exception when duplicate_object then null; end;
  end if;
end $$;

-- A copy of the response for the person who filled it in.
insert into public.email_templates (organization_id, slug, name, subject, body)
select id, 'form-receipt', 'Form response receipt', 'Your response: {{form_title}}', 'Dear {{recipient_name}},

Thank you for completing "{{form_title}}". Here is a copy of what you sent:

{{answers}}
{{edit_line}}
With blessings,
{{church_name}}'
from public.organizations
on conflict (organization_id, slug) do nothing;
