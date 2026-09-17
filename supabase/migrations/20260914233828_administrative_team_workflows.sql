-- Existing role IDs/codes stay stable so accepted invitations retain access.
update public.roles set name=case code when 'pastor' then 'Pastor' when 'church_executive' then 'Executive Assistant' when 'secretary' then 'Admin Assistant' when 'pastoral_care_team' then 'Deacon / Deaconess Board' else name end;
insert into public.roles(organization_id,code,name) select id,'student_pastor','Student Pastor' from public.organizations on conflict(organization_id,code) do nothing;
insert into public.permissions(code,description) values
 ('tasks.assign','Assign and delegate pastoral office tasks'),('prayer.review','Assign prayers and approve completion'),('prayer.serve','Receive assigned prayers and submit completion'),
 ('forms.manage','Create forms and manage submissions'),('emails.manage','Manage email templates and delivery'),('documents.sign_delegate','Apply the authorized pastor signature and stamp with notification'),('people.delete','Delete ordinary member records'),('calendar.share','Subscribe to the pastor calendar') on conflict do nothing;
delete from public.role_permissions where permission_code in ('pastoral_calendar.manage','calendar.share','documents.manage','documents.certify','documents.sign_delegate','prayer.review') and role_id in(select id from public.roles where code not in('pastor','super_admin','secretary','church_executive'));
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r cross join public.permissions p where r.code='super_admin' on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,x.code from public.roles r cross join (values('people.read'),('people.write'),('documents.manage'),('pastoral_calendar.manage'),('calendar.share'),('communications.send'),('emails.manage'),('forms.manage')) x(code) where r.code in('pastor','secretary','church_executive') on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,x.code from public.roles r cross join(values('tasks.assign'),('people.delete')) x(code) where r.code in('pastor','church_executive') on conflict do nothing;
insert into public.role_permissions(role_id,permission_code) select id,'documents.sign_delegate' from public.roles where code='church_executive' on conflict do nothing;
insert into public.role_permissions(role_id,permission_code) select id,'prayer.review' from public.roles where code='pastor' on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,x.code from public.roles r cross join(values('people.read'),('prayer.serve'),('pastoral_workspace.access')) x(code) where r.code in('pastoral_care_team','student_pastor') on conflict do nothing;

-- Extend existing role provisioning without changing founder/self protections.
do $$ declare definition text; begin
 select pg_get_functiondef('private.assign_person_role(uuid,uuid,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'''pastor'',''pastoral_care_team''','''pastor'',''pastoral_care_team'',''student_pastor''');
 definition:=replace(definition,'''Pastoral Care Team''','(select name from public.roles where id=selected_role)');
 execute definition;
end $$;
update public.pastoral_team_members t set role_title=r.name from public.profiles p join public.user_roles ur on ur.user_id=p.auth_user_id join public.roles r on r.id=ur.role_id where t.profile_id=p.id and r.code in('pastor','pastoral_care_team','student_pastor');

-- Immutable attribution is captured even for direct database writes.
alter table public.pastoral_calendar_events add column created_by uuid references auth.users(id) on delete set null, add column updated_by uuid references auth.users(id) on delete set null;
alter table public.pastoral_calendar_availability add column created_by uuid references auth.users(id) on delete set null, add column updated_by uuid references auth.users(id) on delete set null;
create function private.calendar_accountability() returns trigger language plpgsql security definer set search_path='' as $$
declare person uuid; org uuid; owner_user uuid; actor_name text; row_id uuid;
begin
 person:=case when tg_op='DELETE' then old.profile_id else new.profile_id end;
 row_id:=case when tg_op='DELETE' then old.id else new.id end;
 select organization_id,auth_user_id into org,owner_user from public.profiles where id=person;
 if tg_when='BEFORE' then
  if tg_op='INSERT' then new.created_by:=auth.uid(); else new.created_by:=old.created_by; end if;
  new.updated_by:=auth.uid(); return new;
 end if;
 select concat_ws(' ',first_name,last_name) into actor_name from public.profiles where auth_user_id=auth.uid();
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) values(org,auth.uid(),'calendar.'||lower(tg_op),tg_table_name,row_id::text,jsonb_build_object('calendar_profile_id',person,'actor_name',actor_name));
 if owner_user is not null and auth.uid() is distinct from owner_user then
  insert into public.notifications(organization_id,user_id,type,title,body,url) values(org,owner_user,'calendar','Your calendar was updated',coalesce(nullif(actor_name,''),'Church office')||' '||lower(tg_op)||'d a calendar entry or working hours.','/pastor/calendar');
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.calendar_accountability() from public,anon,authenticated;
create trigger calendar_attribution before insert or update on public.pastoral_calendar_events for each row execute function private.calendar_accountability();
create trigger calendar_audit after insert or update or delete on public.pastoral_calendar_events for each row execute function private.calendar_accountability();
create trigger availability_attribution before insert or update on public.pastoral_calendar_availability for each row execute function private.calendar_accountability();
create trigger availability_audit after insert or update or delete on public.pastoral_calendar_availability for each row execute function private.calendar_accountability();

-- Workflow writes are server-only; each server action authenticates and checks
-- its capability. RLS still scopes every direct read.
create table public.office_tasks (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), title text not null, description text not null default '',
 assigned_to uuid not null references auth.users(id), assigned_by uuid not null references auth.users(id), parent_id uuid references public.office_tasks(id),
 due_at timestamptz, status text not null default 'assigned' check(status in('assigned','in_progress','awaiting_review','completed','cancelled')),
 completion_note text, completed_at timestamptz, reviewed_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index office_tasks_assignee_idx on public.office_tasks(assigned_to,status);
alter table public.office_tasks enable row level security;
create policy "tasks visible to participants and leaders" on public.office_tasks for select to authenticated using(assigned_to=auth.uid() or assigned_by=auth.uid() or public.has_permission(organization_id,'tasks.assign'));
grant select on public.office_tasks to authenticated;
revoke insert,update,delete on public.office_tasks from authenticated,anon;

alter table public.prayer_requests drop constraint prayer_requests_status_check;
alter table public.prayer_requests add constraint prayer_requests_status_check check(status in('new','in_progress','awaiting_review','prayed','closed'));
alter table public.prayer_requests add column completion_note text, add column completion_requested_at timestamptz, add column reviewed_by uuid references auth.users(id), add column reviewed_at timestamptz;
revoke update,delete on public.prayer_requests from authenticated,anon;
-- Assigned students have the same access even before their calendar is provisioned.
create policy "prayer board assignment read" on public.prayer_requests for select to authenticated using(assigned_to=auth.uid() and public.has_permission(organization_id,'prayer.serve'));

create table public.email_templates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, slug text not null, subject text not null, body text not null,
 reply_to text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,slug)
);
create table public.email_deliveries (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), template_id uuid references public.email_templates(id), recipient text not null,
 subject text not null, html text not null, reply_to text, attachment_path text, attachment_name text,
 status text not null default 'pending' check(status in('pending','sending','sent','failed')), attempts integer not null default 0, last_error text, dedupe_key text unique,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), sent_at timestamptz, locked_at timestamptz
);
create index email_deliveries_pending_idx on public.email_deliveries(status,created_at);
alter table public.document_templates add column layout text not null default 'letter' check(layout in('letter','certificate')), add column design jsonb not null default '{}', add column email_template_id uuid references public.email_templates(id), add column version integer not null default 1;
alter table public.document_requests add column template_snapshot jsonb, add column signer_profile_id uuid references public.profiles(id), add column prepared_by uuid references auth.users(id);
-- Managers can create documents on behalf of a member; certification is
-- performed exclusively by the server after validating the signer role.
revoke update on public.document_requests from authenticated;

create table public.office_forms (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), title text not null, description text not null default '',
 fields jsonb not null default '[]', is_active boolean not null default true, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.form_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), form_id uuid not null references public.office_forms(id),
 recipient_profile_id uuid not null references public.profiles(id), token_hash text not null unique, form_snapshot jsonb not null, expires_at timestamptz not null,
 sent_by uuid references auth.users(id), answers jsonb, submitted_at timestamptz, created_at timestamptz not null default now()
);
create index form_assignments_form_idx on public.form_assignments(form_id,created_at);

-- OAuth credentials, refresh tokens and push keys are never available through
-- the authenticated Data API; server access only.
create table public.integration_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table public.calendar_connections (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id) on delete cascade,
 calendar_profile_id uuid references public.profiles(id) on delete cascade, google_email text not null, refresh_token text not null, google_calendar_id text not null,
 last_synced_at timestamptz, last_error text, created_at timestamptz not null default now(), unique(user_id,calendar_profile_id)
);
create table public.calendar_subscriptions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id) on delete cascade,
 calendar_profile_id uuid references public.profiles(id) on delete cascade, token_hash text not null unique, created_at timestamptz not null default now(), revoked_at timestamptz
);
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now()
);
alter table public.notifications add column push_processed_at timestamptz;
create index notification_push_pending_idx on public.notifications(created_at) where push_processed_at is null;
-- Do not push historical messages when enabling the worker.
update public.notifications set push_processed_at=now();

do $$ declare t text; begin
 foreach t in array array['email_templates','email_deliveries','office_forms','form_assignments','integration_settings','calendar_connections','calendar_subscriptions','push_subscriptions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy "office email templates read" on public.email_templates for select to authenticated using(public.has_permission(organization_id,'emails.manage'));
create policy "office email deliveries read" on public.email_deliveries for select to authenticated using(public.has_permission(organization_id,'emails.manage'));
create policy "office forms read" on public.office_forms for select to authenticated using(public.has_permission(organization_id,'forms.manage'));
create policy "office responses read" on public.form_assignments for select to authenticated using(public.has_permission(organization_id,'forms.manage'));
grant select on public.email_templates,public.email_deliveries,public.office_forms,public.form_assignments to authenticated;
grant all on public.office_tasks to service_role;

-- Directory deletion goes through an audited server action that protects all
-- staff and the founder. Prevent direct deletes bypassing those checks.
revoke delete on public.profiles from authenticated,anon;

create function public.office_prayer_transition(org uuid, actor uuid, prayer uuid, decision text, assignee uuid default null, note text default null) returns public.prayer_requests
language plpgsql security invoker set search_path='' as $$
declare r public.prayer_requests; reviewer boolean; eligible boolean;
begin
 select * into r from public.prayer_requests where id=prayer and organization_id=org for update;
 if not found then raise exception 'Prayer request not found.'; end if;
 select exists(select 1 from public.user_roles ur join public.roles ro on ro.id=ur.role_id where ur.user_id=actor and ur.organization_id=org and ro.code in('pastor','super_admin')) into reviewer;
 if decision='assign' then
  if not reviewer then raise exception 'Only the Pastor can assign prayer requests.'; end if;
  select exists(select 1 from public.user_roles ur join public.roles ro on ro.id=ur.role_id where ur.user_id=assignee and ur.organization_id=org and ro.code in('pastoral_care_team','student_pastor')) into eligible;
  if not eligible then raise exception 'Choose a member of the Deacon / Deaconess Board or a Student Pastor.'; end if;
  if r.status in('prayed','closed') then raise exception 'This prayer is already complete.'; end if;
  update public.prayer_requests set assigned_to=assignee,status='in_progress',completion_note=null,completion_requested_at=null where id=prayer returning * into r;
  insert into public.notifications(organization_id,user_id,type,title,body,url) values(org,assignee,'prayer','A prayer request is assigned to you','Open your prayer tasks to review the request.','/member/tasks');
 elsif decision='submit' then
  if r.assigned_to is distinct from actor or r.status<>'in_progress' then raise exception 'Only the assigned person can submit this prayer for review.'; end if;
  update public.prayer_requests set status='awaiting_review',completion_note=nullif(trim(note),''),completion_requested_at=now() where id=prayer returning * into r;
  insert into public.notifications(organization_id,user_id,type,title,body,url) select org,ur.user_id,'prayer','Prayer completion awaits your approval','A board member has submitted a prayer completion.','/pastor/care' from public.user_roles ur join public.roles ro on ro.id=ur.role_id where ur.organization_id=org and ro.code='pastor';
 elsif decision='approve' then
  if not reviewer or r.status<>'awaiting_review' then raise exception 'Only the Pastor can approve a submitted completion.'; end if;
  update public.prayer_requests set status='prayed',reviewed_by=actor,reviewed_at=now() where id=prayer returning * into r;
  insert into public.notifications(organization_id,user_id,type,title,body,url) select org,auth_user_id,'prayer','We have prayed for you','The Pastor has confirmed that your prayer request has been completed.','/member/prayer' from public.profiles where id=r.submitter_profile_id and auth_user_id is not null;
 elsif decision='return' then
  if not reviewer or r.status<>'awaiting_review' then raise exception 'Only the Pastor can return a submitted completion.'; end if;
  update public.prayer_requests set status='in_progress',completion_note=nullif(trim(note),'') where id=prayer returning * into r;
  insert into public.notifications(organization_id,user_id,type,title,body,url) values(org,r.assigned_to,'prayer','Prayer request returned for follow-up',note,'/member/tasks');
 else raise exception 'Invalid prayer action.';
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) values(org,actor,'prayer.'||decision,'prayer_requests',prayer::text,jsonb_build_object('assigned_to',r.assigned_to));
 return r;
end $$;
revoke all on function public.office_prayer_transition(uuid,uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.office_prayer_transition(uuid,uuid,uuid,text,uuid,text) to service_role;

create function public.claim_office_email(delivery uuid) returns setof public.email_deliveries language sql security invoker set search_path='' as $$
 update public.email_deliveries set status='sending',attempts=attempts+1,locked_at=now()
 where id=delivery and attempts<5 and (status in('pending','failed') or (status='sending' and locked_at<now()-interval '10 minutes')) returning *;
$$;
revoke all on function public.claim_office_email(uuid) from public,anon,authenticated;
grant execute on function public.claim_office_email(uuid) to service_role;
create function public.office_delete_member(org uuid, actor uuid, person uuid) returns void language plpgsql security invoker set search_path='' as $$
declare member_user uuid;
begin
 if not exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id where ur.user_id=actor and ur.organization_id=org and rp.permission_code='people.delete') then raise exception 'Member deletion is not allowed for this role.'; end if;
 select auth_user_id into member_user from public.profiles where id=person and organization_id=org for update;
 if not found then raise exception 'Member not found.'; end if;
 if member_user=actor or exists(select 1 from public.user_roles where user_id=member_user) then raise exception 'Your own account and staff accounts cannot be deleted here. The Super Administrator must review staff access first.'; end if;
 if member_user is not null then
  delete from auth.sessions where user_id=member_user;
  delete from auth.refresh_tokens where user_id=member_user::text;
  update auth.users set banned_until='infinity'::timestamptz where id=member_user;
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) values(org,actor,'member.deleted','profiles',person::text,'{}');
 delete from public.profiles where id=person and organization_id=org;
end $$;
revoke all on function public.office_delete_member(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.office_delete_member(uuid,uuid,uuid) to service_role;

insert into public.email_templates(organization_id,slug,name,subject,body) select id,'document-ready','Document ready','Your document is ready — {{document_title}}','Dear {{recipient_name}},

Your {{document_title}} has been certified by the church office. The PDF is attached to this email.

You can also view your documents here: {{action_url}}

With blessings,
{{church_name}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'certificate-ready','Certificate ready','Your certificate — {{document_title}}','Dear {{recipient_name}},

We are pleased to send your {{document_title}}. Your certified PDF is attached.

May God continue to bless you and your family.

{{church_name}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'prayer-completed','Prayer completed','We have prayed for you','Dear {{recipient_name}},

Our Deacon / Deaconess Board has prayed for you, and the Pastor has confirmed the completion of your prayer request.

You remain in our prayers. Please contact the church office if you would like further support.

With love,
{{church_name}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'form-invitation','Form invitation','Please complete: {{form_title}}','Dear {{recipient_name}},

The administrative team invites you to complete {{form_title}}.

Open your private form here: {{action_url}}

This link expires in 30 days. Please keep it private.

{{church_name}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'invitation','Staff and member invitation','Your invitation — {{role_name}}','Dear {{recipient_name}},

You have been invited to join {{church_name}} as {{role_name}}.

Accept your invitation and choose your password: {{action_url}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'password-recovery','Password recovery','Reset your church account password','To reset your church account password, open this secure link:

{{action_url}}

If you did not request this, you can ignore this message.' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'role-changed','Role changed','Your church role has changed','Dear {{recipient_name}},

Your assigned church role is now {{role_name}}. Sign in to view your workspace.

{{action_url}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.email_templates(organization_id,slug,name,subject,body) select id,'staff-notification','Staff workflow notification','{{heading}}','{{intro}}

{{details}}

Open the workspace: {{action_url}}' from public.organizations on conflict(organization_id,slug) do nothing;
insert into public.document_templates(organization_id,slug,name,description,category,body,layout,design,email_template_id) select o.id,'baptism-certificate','Certificate of Baptism','Editable church master template with signature and stamp areas.','Baptism','This certifies that {{member_name}} was baptized in the name of the Father, the Son, and the Holy Spirit on {{baptism_date}} at {{baptism_place}}.

In the presence of family, friends, and the congregation, they declared their faith and commitment to Jesus Christ.

Officiating minister: {{minister_name}}','certificate','{"accent": "#ba963c", "signer_name": "Rev. Dr. Kevin Page", "footer": "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica \u00b7 (876) 596-3890 \u00b7 ntcog_bullbay@yahoo.com", "banner": "BAPTIZED IN CHRIST", "subtitle": "One Family \u00b7 One Faith \u00b7 One Mission"}'::jsonb,e.id from public.organizations o join public.email_templates e on e.organization_id=o.id and e.slug='certificate-ready' on conflict(organization_id,slug) do nothing;
insert into public.document_templates(organization_id,slug,name,description,category,body,layout,design,email_template_id) select o.id,'baby-dedication-certificate','Baby Dedication Certificate','Editable church master template with signature and stamp areas.','Baby dedication','This certifies that {{child_name}}, born on {{birth_date}} at {{birth_place}}, was presented to the Lord in dedication on {{dedication_date}} at {{dedication_place}}.

Parents: {{parent_names}}
Godparents: {{godparent_names}}

The family and congregation commit to nurturing this child in faith and love, according to God’s Word.

Officiating minister: {{minister_name}}','certificate','{"accent": "#ba963c", "signer_name": "Rev. Dr. Kevin Page", "footer": "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica \u00b7 (876) 596-3890 \u00b7 ntcog_bullbay@yahoo.com", "banner": "DEDICATED TO THE LORD", "subtitle": "\u201cSuffer the little children to come unto me\u2026\u201d \u2014 Mark 10:14", "orientation": "portrait"}'::jsonb,e.id from public.organizations o join public.email_templates e on e.organization_id=o.id and e.slug='certificate-ready' on conflict(organization_id,slug) do nothing;
insert into public.document_templates(organization_id,slug,name,description,category,body,layout,design,email_template_id) select o.id,'membership-fellowship-certificate','Certificate of Membership','Editable church master template with signature and stamp areas.','Membership','This certifies that {{member_name}}, having publicly confessed faith in Jesus Christ and having received the Right Hand of Fellowship, is welcomed as a member of {{church_name}} on {{fellowship_date}}.

May you continue to grow in the grace and knowledge of our Lord and Saviour Jesus Christ, faithfully serve Him, and walk in fellowship with His people.

“Now ye are the body of Christ, and members in particular.” — 1 Corinthians 12:27','certificate','{"accent": "#ba963c", "signer_name": "Rev. Dr. Kevin Page", "footer": "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica \u00b7 (876) 596-3890 \u00b7 ntcog_bullbay@yahoo.com", "banner": "RIGHT HAND OF FELLOWSHIP", "subtitle": "Together in Christ"}'::jsonb,e.id from public.organizations o join public.email_templates e on e.organization_id=o.id and e.slug='certificate-ready' on conflict(organization_id,slug) do nothing;
insert into public.document_templates(organization_id,slug,name,description,category,body,layout,design,email_template_id) select o.id,'church-letterhead','Church Letterhead','Editable church master template with signature and stamp areas.','Correspondence','{{date_today}}

{{recipient_name}}
{{recipient_address}}

Dear {{salutation}},

{{letter_body}}

Sincerely,
Bull Bay New Testament Church of God','letter','{"accent": "#ba963c", "signer_name": "Rev. Dr. Kevin Page", "footer": "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica \u00b7 (876) 596-3890 \u00b7 ntcog_bullbay@yahoo.com"}'::jsonb,e.id from public.organizations o join public.email_templates e on e.organization_id=o.id and e.slug='document-ready' on conflict(organization_id,slug) do nothing;
insert into public.document_templates(organization_id,slug,name,description,category,body,layout,design,email_template_id) select o.id,'good-standing-letter','Letter of Good Standing','Editable church master template with signature and stamp areas.','Membership','{{date_today}}

{{recipient_name}}
{{recipient_address}}

To whom it may concern,

This letter confirms that {{member_name}} has been a member of {{church_name}} since {{membership_since}} and is in good standing with the congregation.

This letter is issued for the following purpose: {{purpose}}.

Sincerely,
Bull Bay New Testament Church of God','letter','{"accent": "#ba963c", "signer_name": "Rev. Dr. Kevin Page", "footer": "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica \u00b7 (876) 596-3890 \u00b7 ntcog_bullbay@yahoo.com"}'::jsonb,e.id from public.organizations o join public.email_templates e on e.organization_id=o.id and e.slug='document-ready' on conflict(organization_id,slug) do nothing;
insert into public.document_templates(organization_id,slug,name,description,category,body,layout,design,email_template_id) select o.id,'appreciation-certificate','Certificate of Appreciation','Editable church master template with signature and stamp areas.','Recognition','Presented to {{member_name}} in grateful recognition of {{contribution}}.

Your dedication, generosity, and faithful service have blessed our church family.

Presented on {{presentation_date}}.','certificate','{"accent": "#ba963c", "signer_name": "Rev. Dr. Kevin Page", "footer": "Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica \u00b7 (876) 596-3890 \u00b7 ntcog_bullbay@yahoo.com", "banner": "WITH HEARTFELT APPRECIATION"}'::jsonb,e.id from public.organizations o join public.email_templates e on e.organization_id=o.id and e.slug='certificate-ready' on conflict(organization_id,slug) do nothing;
-- Administrative assistants may respond to the Pastor's meeting requests.
do $$ declare definition text; begin
 select pg_get_functiondef('private.respond_counsel_request(uuid,text,timestamptz,timestamptz,text)'::regprocedure) into definition;
 definition:=replace(definition,'or public.has_permission(req.organization_id,''care.manage'') then null;', 'or public.has_permission(req.organization_id,''care.manage'') or (public.has_permission(req.organization_id,''pastoral_calendar.manage'') and exists(select 1 from public.pastoral_team_members where profile_id=req.requested_with_profile_id and is_pastor and is_active)) then null;');
 execute definition;
end $$;
create policy "pastor office meeting read" on public.counsel_requests for select to authenticated using(public.has_permission(organization_id,'pastoral_calendar.manage') and exists(select 1 from public.pastoral_team_members where profile_id=requested_with_profile_id and is_pastor and is_active));

create function public.claim_office_worker() returns boolean language sql security invoker set search_path='' as $$
 with claimed as(update public.integration_settings set updated_at=now() where key='office_worker' and updated_at<now()-interval '55 seconds' returning key) select exists(select 1 from claimed);
$$;
revoke all on function public.claim_office_worker() from public,anon,authenticated;
grant execute on function public.claim_office_worker() to service_role;
-- Submissions cannot pre-assign or pre-complete their own prayers.
create function private.guard_prayer_submission() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status<>'new' or new.assigned_to is not null or new.reviewed_by is not null or new.completion_requested_at is not null or new.reviewed_at is not null then raise exception 'New prayers must await pastoral assignment.'; end if;
 if new.submitter_profile_id is not null and not exists(select 1 from public.profiles where id=new.submitter_profile_id and organization_id=new.organization_id) then raise exception 'The submitter must belong to this church.'; end if;
 return new;
end $$;
revoke all on function private.guard_prayer_submission() from public,anon,authenticated;
create trigger guard_prayer_submission before insert on public.prayer_requests for each row execute function private.guard_prayer_submission();
-- Templates and staff read access must never expose reusable signing assets.
drop policy if exists "staff-assets manage" on storage.objects;

create function private.notify_document_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='submitted' then
  insert into public.notifications(organization_id,user_id,type,title,body,url)
  select new.organization_id,ur.user_id,'document','New document request',new.title,'/admin/documents' from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.organization_id=new.organization_id and r.code in('secretary','church_executive');
 end if;
 return new;
end $$;
revoke all on function private.notify_document_submission() from public,anon,authenticated;
create trigger notify_document_submission after insert on public.document_requests for each row execute function private.notify_document_submission();
