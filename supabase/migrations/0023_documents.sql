-- Church document requests: a member asks the pastor's office for a
-- letter/certificate, the secretary team prepares it from a reusable
-- template, and the pastor reviews and certifies (signature + stamp) the
-- final PDF before it's released to the member. See docs/DOCUMENTS.md.

alter table public.profiles
  add column if not exists signature_path text,
  add column if not exists stamp_path text;

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug citext not null,
  name text not null,
  description text,
  category text,
  -- Body is simple merge-field text (e.g. "This letter certifies that
  -- {{member_name}} is a member in good standing of {{church_name}}..."),
  -- rendered into the certified PDF. Kept as plain text/lightweight markup
  -- rather than a rich document format so it's easy to review and safe to
  -- render without needing a document-conversion dependency.
  body text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create trigger document_templates_set_updated_at before update on public.document_templates
  for each row execute function public.set_updated_at();

create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete set null,
  template_id uuid references public.document_templates(id) on delete set null,
  title text not null,
  purpose text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'prepared', 'pending_pastor', 'stamped', 'completed', 'denied')),
  prepared_body text,
  denial_reason text,
  assigned_to uuid references auth.users(id),
  certified_by uuid references auth.users(id),
  certified_at timestamptz,
  document_number text unique,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger document_requests_set_updated_at before update on public.document_requests
  for each row execute function public.set_updated_at();
create index document_requests_requester_idx on public.document_requests (requester_profile_id);
create index document_requests_status_idx on public.document_requests (organization_id, status);

create sequence public.document_number_seq;
create or replace function public.assign_document_number()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('stamped', 'completed') and new.document_number is null then
    new.document_number := 'BB-DOC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.document_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;
create trigger document_requests_assign_number
  before insert or update on public.document_requests
  for each row execute function public.assign_document_number();

-- New permission codes -------------------------------------------------
insert into public.permissions (code, description) values
  ('documents.manage', 'Prepare document requests and manage templates'),
  ('documents.certify', 'Review, sign/stamp and finalize certified documents');

insert into public.role_permissions (role_id, permission_code)
select r.id, 'documents.manage' from public.roles r where r.code = 'church_admin';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values ('documents.manage'), ('documents.certify')) as x(code)
where r.code = 'pastor';

-- New role for the pastor's administrative/secretary team (Jessica Sewell,
-- Pennola Williams, Jamelia Peart per the conference roster) — granted to
-- specific people via Admin -> Roles once their accounts are linked.
insert into public.roles (organization_id, code, name)
select id, 'secretary', 'Pastor''s Office Secretary' from public.organizations where slug = 'bull-bay';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values ('documents.manage'), ('people.read')) as x(code)
where r.code = 'secretary';

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where r.code = 'super_admin' and p.code in ('documents.manage', 'documents.certify')
on conflict do nothing;

-- RLS ------------------------------------------------------------------
alter table public.document_templates enable row level security;
create policy "document_templates staff read" on public.document_templates
  for select to authenticated using (public.has_permission(organization_id, 'documents.manage') or public.has_permission(organization_id, 'documents.certify'));
create policy "document_templates staff manage" on public.document_templates
  for all to authenticated
  using (public.has_permission(organization_id, 'documents.manage'))
  with check (public.has_permission(organization_id, 'documents.manage'));

alter table public.document_requests enable row level security;
create policy "document_requests own read" on public.document_requests
  for select to authenticated using (requester_profile_id = public.current_profile_id());
create policy "document_requests own create" on public.document_requests
  for insert to authenticated with check (requester_profile_id = public.current_profile_id() and status = 'submitted');
create policy "document_requests staff read" on public.document_requests
  for select to authenticated using (public.has_permission(organization_id, 'documents.manage') or public.has_permission(organization_id, 'documents.certify'));
create policy "document_requests staff manage" on public.document_requests
  for update to authenticated
  using (public.has_permission(organization_id, 'documents.manage') or public.has_permission(organization_id, 'documents.certify'))
  with check (public.has_permission(organization_id, 'documents.manage') or public.has_permission(organization_id, 'documents.certify'));
