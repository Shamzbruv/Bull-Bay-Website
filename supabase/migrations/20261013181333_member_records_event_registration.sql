begin;

alter table public.profiles drop constraint profiles_membership_status_check;
alter table public.profiles add constraint profiles_membership_status_check check (membership_status in ('visitor','returning_visitor','attendee','prospective_member','member','inactive','deceased'));
alter table public.profiles add column membership_information text;
alter table public.profiles add column deceased_at date;
alter table public.profiles add constraint profiles_deceased_date_check check (deceased_at is null or (membership_status='deceased' and (date_of_birth is null or deceased_at >= date_of_birth)));
alter table public.profiles add constraint profiles_org_person_unique unique (organization_id,id);

-- These office details are deliberately separate from self-readable profiles.
create table public.member_details (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 profile_id uuid not null,
 category text not null check (length(trim(category)) between 1 and 100),
 label text not null check (length(trim(label)) between 1 and 100),
 value text not null check (length(trim(value)) between 1 and 10000),
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (organization_id,profile_id) references public.profiles(organization_id,id) on delete cascade
);
create index member_details_person_idx on public.member_details(organization_id,profile_id);
create trigger member_details_updated before update on public.member_details for each row execute function public.set_updated_at();
alter table public.member_details enable row level security;
grant select,insert,update,delete on public.member_details to authenticated,service_role;
create policy "member details staff read" on public.member_details for select to authenticated using(public.has_permission(organization_id,'people.read'));
create policy "member details staff insert" on public.member_details for insert to authenticated with check(public.has_permission(organization_id,'people.write'));
create policy "member details staff update" on public.member_details for update to authenticated using(public.has_permission(organization_id,'people.write')) with check(public.has_permission(organization_id,'people.write'));
create policy "member details staff delete" on public.member_details for delete to authenticated using(public.has_permission(organization_id,'people.write'));

drop policy "user_roles self read" on public.user_roles;
create policy "user_roles self read" on public.user_roles for select to authenticated using(user_id=(select auth.uid()) or public.has_permission(organization_id,'roles.manage') or public.has_permission(organization_id,'people.read'));
insert into public.role_permissions(role_id,permission_code)
select r.id,x.code from public.roles r cross join(values('people.read'),('people.write'),('people.delete'),('events.manage'),('direction.manage')) x(code)
where r.code in ('secretary','church_executive','church_admin') on conflict do nothing;

-- Snapshot event answers separately from the member's current contact details.
alter table public.event_registrations add column registration_details jsonb not null default '{}'::jsonb check(jsonb_typeof(registration_details)='object');
-- Public visitors submit through the validated server action, not directly
-- through the REST API. Existing owner cancellation/read policies remain.
drop policy "event_registrations create" on public.event_registrations;

-- A lock on the event serializes capacity and duplicate checks. Notifications
-- are inserted in the same transaction so the secretary inbox cannot be missed.
create function public.register_church_event(org uuid,event uuid,person uuid,member boolean,contact_name text,contact_email text,contact_phone text,party_size integer,details jsonb,additional_notes text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare e public.events; p public.profiles; existing uuid; registration uuid; used integer;
begin
 select * into e from public.events where id=event and organization_id=org for update;
 if not found or e.status<>'published' then raise exception 'This event is not open for registration.'; end if;
 if e.starts_at <= now() or (e.registration_closes_at is not null and e.registration_closes_at <= now()) then raise exception 'Registration for this event has closed.'; end if;
 if e.registration_opens_at is not null and e.registration_opens_at > now() then raise exception 'Registration has not opened yet.'; end if;
 if person is not null then
  select * into p from public.profiles where id=person and organization_id=org;
  if not found or p.membership_status='deceased' then raise exception 'This member record cannot register for an event.'; end if;
 end if;
 if member and person is null then raise exception 'Church members must sign in to register.'; end if;
 if e.visibility='members' and (not member or person is null) then raise exception 'Please sign in as a church member for this event.'; end if;
 if e.visibility='staff' and not exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id where ur.organization_id=org and ur.user_id=p.auth_user_id and rp.permission_code='events.manage') then raise exception 'This event is restricted to church staff.'; end if;
 if party_size is null or party_size not between 1 and 50 or contact_name is null or length(trim(contact_name)) not between 2 and 200 or contact_email is null or length(contact_email)>254 or contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or contact_phone is null or length(contact_phone) not between 7 and 50 or details is null or jsonb_typeof(details)<>'object' then raise exception 'Please check the registration details.'; end if;
 select id into existing from public.event_registrations where event_id=event and status in ('registered','waitlisted','attended') and ((person is not null and profile_id=person) or lower(guest_email::text)=lower(contact_email)) limit 1;
 if existing is not null then return jsonb_build_object('id',existing,'created',false); end if;
 select coalesce(sum(quantity),0) into used from public.event_registrations where event_id=event and status in ('registered','attended');
 if e.capacity is not null and used+party_size>e.capacity then raise exception 'There are not enough spaces for this group. Please contact the church office.'; end if;
 insert into public.event_registrations(event_id,profile_id,guest_name,guest_email,guest_phone,quantity,registration_details,notes)
 values(event,person,trim(contact_name),lower(trim(contact_email)),trim(contact_phone),party_size,details||jsonb_build_object('is_member',member),nullif(trim(additional_notes),'')) returning id into registration;
 insert into public.notifications(organization_id,user_id,type,title,body,url)
 select distinct org,ur.user_id,'event_registration','New event registration',e.title||' — '||trim(contact_name)||' ('||party_size||' attending)', '/admin/events/'||event||'/registrations'
 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.organization_id=org and r.code in ('secretary','church_executive','church_admin','super_admin');
 return jsonb_build_object('id',registration,'created',true);
end $$;
revoke all on function public.register_church_event(uuid,uuid,uuid,boolean,text,text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.register_church_event(uuid,uuid,uuid,boolean,text,text,text,integer,jsonb,text) to service_role;

-- The existing deletion routine protects every user_roles holder, including
-- ordinary Member accounts. Protect only actual staff, plus the caller.
create or replace function public.office_delete_member(org uuid,actor uuid,person uuid) returns void language plpgsql security invoker set search_path='' as $$
declare member_user uuid;
begin
 if not exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id where ur.user_id=actor and ur.organization_id=org and rp.permission_code='people.delete') then raise exception 'Member deletion is not allowed for this role.'; end if;
 select auth_user_id into member_user from public.profiles where id=person and organization_id=org for update;
 if not found then raise exception 'Member not found.'; end if;
 if member_user=actor or exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=member_user and r.code<>'member') then raise exception 'Your own account and staff accounts are protected. Ask the Super Administrator to review staff access first.'; end if;
 if member_user is not null then
  delete from auth.sessions where user_id=member_user;
  delete from auth.refresh_tokens where user_id=member_user::text;
  update auth.users set banned_until='infinity'::timestamptz where id=member_user;
  delete from public.user_roles where user_id=member_user and organization_id=org;
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) values(org,actor,'member.deleted','profiles',person::text,'{}');
 delete from public.profiles where id=person and organization_id=org;
end $$;
revoke all on function public.office_delete_member(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.office_delete_member(uuid,uuid,uuid) to service_role;
commit;
