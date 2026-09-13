-- Role changes and bookings are transactional APIs; browser table writes
-- cannot bypass the self-role lock, owner protection or booking validation.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table private.platform_owners (
  organization_id uuid primary key references public.organizations(id),
  user_id uuid not null references auth.users(id)
);
alter table private.platform_owners enable row level security;
revoke all on private.platform_owners from public, anon, authenticated;
insert into private.platform_owners
select o.id,u.id from public.organizations o cross join auth.users u
where o.slug='bull-bay' and lower(u.email)='shamzbiz1@gmail.com';

create function private.is_super_admin(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
 select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
 where ur.organization_id=org and r.organization_id=org and ur.user_id=auth.uid() and r.code='super_admin');
$$;
revoke all on function private.is_super_admin(uuid) from public,anon;
grant execute on function private.is_super_admin(uuid) to authenticated;

create function private.protect_role_grant() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP <> 'INSERT' then
   if exists (select 1 from private.platform_owners o join public.roles r on r.organization_id=o.organization_id
     where o.user_id=old.user_id and o.organization_id=old.organization_id and r.id=old.role_id and r.code='super_admin') then
     raise exception 'The founding super administrator role is locked.' using errcode='42501';
   end if;
   if auth.uid()=old.user_id then raise exception 'You cannot change your own role.' using errcode='42501'; end if;
 end if;
 if TG_OP <> 'DELETE' then
   if auth.uid()=new.user_id then raise exception 'You cannot change your own role.' using errcode='42501'; end if;
   if not exists(select 1 from public.roles where id=new.role_id and organization_id=new.organization_id)
     or not exists(select 1 from public.profiles where auth_user_id=new.user_id and organization_id=new.organization_id) then
     raise exception 'Role and account must belong to this church.'; end if;
   return new;
 end if;
 return old;
end $$;
revoke all on function private.protect_role_grant() from public,anon,authenticated;
create trigger protect_role_grant before insert or update or delete on public.user_roles for each row execute function private.protect_role_grant();

revoke insert, update, delete on public.user_roles, public.roles, public.role_permissions from authenticated, anon;
drop policy "user_roles staff manage" on public.user_roles;
drop policy "roles staff manage" on public.roles;
drop policy "role_permissions staff manage" on public.role_permissions;

create function private.assign_person_role(org uuid, target_user uuid, selected_role uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare new_code text; target_profile uuid; old_pastoral boolean;
begin
 if not private.is_super_admin(org) then raise exception 'Only a super administrator can assign roles.' using errcode='42501'; end if;
 if target_user=auth.uid() then raise exception 'You cannot change your own role.' using errcode='42501'; end if;
 -- Serialize all assignments in the church, including the last-admin check.
 perform 1 from public.organizations where id=org for update;
 select id into target_profile from public.profiles where auth_user_id=target_user and organization_id=org;
 if target_profile is null then raise exception 'Account not found in this church.'; end if;
 if exists(select 1 from private.platform_owners where user_id=target_user and organization_id=org) then
   raise exception 'The founding super administrator role is locked.' using errcode='42501'; end if;
 if selected_role is not null then
   select code into new_code from public.roles where id=selected_role and organization_id=org;
   if new_code is null then raise exception 'Invalid role.'; end if;
 end if;
 if exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=target_user and ur.organization_id=org and r.code='super_admin')
 and new_code is distinct from 'super_admin' and not exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id<>target_user and ur.organization_id=org and r.code='super_admin') then
   raise exception 'Cannot remove the last super administrator.'; end if;
 select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=target_user and ur.organization_id=org and r.code in ('pastor','pastoral_care_team')) into old_pastoral;
 delete from public.user_roles where organization_id=org and user_id=target_user;
 if selected_role is not null then
   insert into public.user_roles(organization_id,user_id,role_id,granted_by) values(org,target_user,selected_role,auth.uid());
 end if;
 if new_code in ('pastor','pastoral_care_team') then
   insert into public.pastoral_team_members(organization_id,profile_id,role_title,is_pastor,is_active)
   values(org,target_profile,case when new_code='pastor' then 'Pastor' else 'Pastoral Care Team' end,new_code='pastor',true)
   on conflict(organization_id,profile_id) do update set is_active=true,is_pastor=excluded.is_pastor,role_title=excluded.role_title;
 elsif old_pastoral then
   update public.pastoral_team_members set is_active=false,is_pastor=false where organization_id=org and profile_id=target_profile;
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
 values(org,auth.uid(),'role.changed','profiles',target_profile,jsonb_build_object('role',new_code));
end $$;
create function public.assign_person_role(org uuid, target_user uuid, selected_role uuid default null) returns void
language sql security invoker set search_path='' as $$ select private.assign_person_role(org,target_user,selected_role); $$;
revoke all on function private.assign_person_role(uuid,uuid,uuid),public.assign_person_role(uuid,uuid,uuid) from public,anon;
grant execute on function private.assign_person_role(uuid,uuid,uuid),public.assign_person_role(uuid,uuid,uuid) to authenticated;

-- Repair existing pastor/care assignments without inventing working hours.
insert into public.pastoral_team_members(organization_id,profile_id,role_title,is_pastor,is_active)
select ur.organization_id,p.id,r.name,r.code='pastor',true from public.user_roles ur
join public.roles r on r.id=ur.role_id join public.profiles p on p.auth_user_id=ur.user_id and p.organization_id=ur.organization_id
where r.code in ('pastor','pastoral_care_team')
on conflict(organization_id,profile_id) do update set is_pastor=excluded.is_pastor,is_active=true;

-- Database-level exclusion protects against concurrent overlapping writes.
create extension if not exists btree_gist with schema extensions;
alter table public.pastoral_calendar_events add constraint pastoral_calendar_no_overlap
exclude using gist (profile_id with =, tstzrange(starts_at,ends_at,'[)') with &&);
create unique index pastoral_calendar_one_request on public.pastoral_calendar_events(counsel_request_id) where counsel_request_id is not null;
alter table public.pastoral_calendar_availability add constraint pastoral_availability_no_overlap
exclude using gist(profile_id with =, day_of_week with =, int8range(extract(epoch from start_time)::bigint,extract(epoch from end_time)::bigint,'[)') with &&);
create index if not exists counsel_requests_requester_idx on public.counsel_requests(requester_profile_id);

create function private.calendar_slot_open(person uuid, slot_start timestamptz, slot_end timestamptz) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and slot_start>=now() and slot_end>slot_start
 and exists(select 1 from public.pastoral_team_members t join public.profiles me on me.auth_user_id=auth.uid() and me.organization_id=t.organization_id
 where t.profile_id=person and t.is_active)
 and (slot_start at time zone 'America/Jamaica')::date=(slot_end at time zone 'America/Jamaica')::date
 and exists(select 1 from public.pastoral_calendar_availability a where a.profile_id=person
 and a.day_of_week=extract(dow from slot_start at time zone 'America/Jamaica')
 and a.start_time<=(slot_start at time zone 'America/Jamaica')::time
 and a.end_time>=(slot_end at time zone 'America/Jamaica')::time)
 and not exists(select 1 from public.pastoral_calendar_events e where e.profile_id=person and e.starts_at<slot_end and e.ends_at>slot_start);
$$;
revoke all on function private.calendar_slot_open(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function private.calendar_slot_open(uuid,timestamptz,timestamptz) to authenticated;

create function private.available_counsel_slots(person uuid, on_date date) returns table(starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path='' as $$
 select distinct slot, slot+interval '30 minutes'
 from public.pastoral_calendar_availability a
 cross join lateral generate_series((on_date+a.start_time) at time zone 'America/Jamaica', (on_date+a.end_time) at time zone 'America/Jamaica'-interval '30 minutes',interval '30 minutes') slot
 where a.profile_id=person and a.day_of_week=extract(dow from on_date)
 and on_date between (now() at time zone 'America/Jamaica')::date and (now() at time zone 'America/Jamaica')::date+90
 and private.calendar_slot_open(person,slot,slot+interval '30 minutes') order by slot;
$$;
create function public.available_counsel_slots(person uuid, on_date date) returns table(starts_at timestamptz,ends_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.available_counsel_slots(person,on_date); $$;
revoke all on function private.available_counsel_slots(uuid,date),public.available_counsel_slots(uuid,date) from public,anon;
grant execute on function private.available_counsel_slots(uuid,date),public.available_counsel_slots(uuid,date) to authenticated;

-- Requests remain pending until the recipient confirms. Validate even direct API inserts.
create function private.validate_counsel_request() returns trigger
language plpgsql security definer set search_path='' as $$
declare slot_start timestamptz;
begin
 if new.requester_profile_id is distinct from public.current_profile_id() or not exists(select 1 from public.profiles where id=new.requester_profile_id and organization_id=new.organization_id)
 then raise exception 'Invalid requester.' using errcode='42501'; end if;
 if new.status<>'requested' or new.scheduled_event_id is not null or new.staff_notes is not null then raise exception 'Only a new request can be submitted.'; end if;
 if not exists(select 1 from public.pastoral_team_members where profile_id=new.requested_with_profile_id and organization_id=new.organization_id and is_active) then raise exception 'Choose an active pastoral team member.'; end if;
 if new.preferred_date is null or new.preferred_time is null then raise exception 'Choose an available date and time.'; end if;
 slot_start=(new.preferred_date+new.preferred_time) at time zone 'America/Jamaica';
 if not private.calendar_slot_open(new.requested_with_profile_id,slot_start,slot_start+interval '30 minutes') then raise exception 'That time is no longer available. Choose another slot.'; end if;
 new.is_urgent=false;
 return new;
end $$;
revoke all on function private.validate_counsel_request() from public,anon,authenticated;
create trigger validate_counsel_request before insert on public.counsel_requests for each row execute function private.validate_counsel_request();

revoke update,delete on public.counsel_requests from authenticated,anon;
create function private.respond_counsel_request(request_id uuid, decision text, slot_start timestamptz default null, slot_end timestamptz default null, note text default null) returns void
language plpgsql security definer set search_path='' as $$
declare req public.counsel_requests; event_id uuid; actor_profile uuid;
begin
 actor_profile=public.current_profile_id();
 if auth.uid() is null or actor_profile is null then raise exception 'Sign in required.' using errcode='42501'; end if;
 select * into req from public.counsel_requests where id=request_id for update;
 if req.id is null then raise exception 'Request not found.'; end if;
 if decision='cancelled' and req.requester_profile_id=actor_profile then null;
 elsif req.requested_with_profile_id=actor_profile or public.has_permission(req.organization_id,'care.manage') then null;
 else raise exception 'You cannot respond to this request.' using errcode='42501'; end if;
 if decision='scheduled' then
   if req.status<>'requested' then raise exception 'This request has already been handled.'; end if;
   -- Same profile row lock is also taken by ordinary calendar writes.
   perform 1 from public.profiles where id=req.requested_with_profile_id for update;
   if slot_start is null or slot_end is null or not private.calendar_slot_open(req.requested_with_profile_id,slot_start,slot_end) then raise exception 'Choose a free time within published working hours.'; end if;
   insert into public.pastoral_calendar_events(profile_id,title,starts_at,ends_at,kind,visibility,counsel_request_id)
   values(req.requested_with_profile_id,'Pastoral appointment',slot_start,slot_end,'appointment','private',req.id) returning id into event_id;
   update public.counsel_requests set status='scheduled',scheduled_event_id=event_id where id=req.id;
 elsif decision in ('declined','cancelled','completed') then
   if req.status not in ('requested','scheduled') or (decision='completed' and req.status<>'scheduled') then raise exception 'This request cannot be changed from its current status.'; end if;
   if decision='completed' and exists(select 1 from public.pastoral_calendar_events where id=req.scheduled_event_id and ends_at>now()) then raise exception 'Complete the meeting after its scheduled end.'; end if;
   update public.counsel_requests set status=decision,staff_notes=case when req.requester_profile_id=actor_profile then staff_notes else note end,
     scheduled_event_id=case when decision='completed' then scheduled_event_id else null end where id=req.id;
   if decision<>'completed' and req.scheduled_event_id is not null then delete from public.pastoral_calendar_events where id=req.scheduled_event_id; end if;
 else raise exception 'Invalid response.'; end if;
end $$;
create function public.respond_counsel_request(request_id uuid, decision text, slot_start timestamptz default null, slot_end timestamptz default null, note text default null) returns void
language sql security invoker set search_path='' as $$ select private.respond_counsel_request(request_id,decision,slot_start,slot_end,note); $$;
revoke all on function private.respond_counsel_request(uuid,text,timestamptz,timestamptz,text),public.respond_counsel_request(uuid,text,timestamptz,timestamptz,text) from public,anon;
grant execute on function private.respond_counsel_request(uuid,text,timestamptz,timestamptz,text),public.respond_counsel_request(uuid,text,timestamptz,timestamptz,text) to authenticated;

create function private.guard_calendar_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare person uuid;
begin
 person=case when TG_OP='DELETE' then old.profile_id else new.profile_id end;
 perform 1 from public.profiles where id=person for update;
 if TG_OP<>'DELETE' and not exists(select 1 from public.pastoral_team_members where profile_id=person and is_active) then raise exception 'Only active pastoral team members have a calendar.'; end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
revoke all on function private.guard_calendar_write() from public,anon,authenticated;
create trigger guard_calendar_write before insert or update or delete on public.pastoral_calendar_events for each row execute function private.guard_calendar_write();
create trigger guard_availability_write before insert or update or delete on public.pastoral_calendar_availability for each row execute function private.guard_calendar_write();

-- Linked appointments can only be changed by the transactional response API.
drop policy "pastoral_calendar_events self manage" on public.pastoral_calendar_events;
create policy "calendar owner insert" on public.pastoral_calendar_events for insert to authenticated with check (
 counsel_request_id is null and kind<>'appointment' and (profile_id=public.current_profile_id() or exists(select 1 from public.profiles p where p.id=profile_id and public.has_permission(p.organization_id,'pastoral_calendar.manage'))));
create policy "calendar owner update" on public.pastoral_calendar_events for update to authenticated using (
 counsel_request_id is null and (profile_id=public.current_profile_id() or exists(select 1 from public.profiles p where p.id=profile_id and public.has_permission(p.organization_id,'pastoral_calendar.manage')))) with check (
 counsel_request_id is null and kind<>'appointment' and (profile_id=public.current_profile_id() or exists(select 1 from public.profiles p where p.id=profile_id and public.has_permission(p.organization_id,'pastoral_calendar.manage'))));
create policy "calendar owner delete" on public.pastoral_calendar_events for delete to authenticated using (
 counsel_request_id is null and (profile_id=public.current_profile_id() or exists(select 1 from public.profiles p where p.id=profile_id and public.has_permission(p.organization_id,'pastoral_calendar.manage'))));
create policy "calendar manager read" on public.pastoral_calendar_events for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=profile_id and public.has_permission(p.organization_id,'pastoral_calendar.manage')));

-- Profile account identifiers must not be reassigned through a staff edit.
create function private.protect_profile_identity() returns trigger
language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and (new.auth_user_id is distinct from old.auth_user_id or new.organization_id is distinct from old.organization_id) then
 raise exception 'Account identity cannot be reassigned.' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.protect_profile_identity() from public,anon,authenticated;
create trigger protect_profile_identity before update on public.profiles for each row execute function private.protect_profile_identity();

-- Durable notifications are committed with the request/status change.
create function private.notify_counsel_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 if TG_OP='INSERT' then
   select auth_user_id into recipient from public.profiles where id=new.requested_with_profile_id;
   if recipient is not null then insert into public.notifications(organization_id,user_id,type,title,body,url)
     values(new.organization_id,recipient,'counsel_request','New meeting request','A member requested a time on your calendar.','/member/team-calendar'); end if;
 elsif old.status is distinct from new.status then
   select auth_user_id into recipient from public.profiles where id=new.requester_profile_id;
   if recipient is not null then insert into public.notifications(organization_id,user_id,type,title,body,url)
     values(new.organization_id,recipient,'counsel_request','Meeting request ' || new.status,'Open your meeting requests for details.','/member/counsel'); end if;
   select auth_user_id into recipient from public.profiles where id=new.requested_with_profile_id;
   if recipient is not null and new.status='cancelled' then insert into public.notifications(organization_id,user_id,type,title,url)
     values(new.organization_id,recipient,'counsel_request','Meeting cancelled','/member/team-calendar'); end if;
 end if;
 return new;
end $$;
revoke all on function private.notify_counsel_change() from public,anon,authenticated;
create trigger notify_counsel_change after insert or update on public.counsel_requests for each row execute function private.notify_counsel_change();

-- Deleting the owner's profile would strand the account even if its role survived.
create function private.protect_owner_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.platform_owners where user_id=old.auth_user_id and organization_id=old.organization_id) then
   raise exception 'The founding super administrator account is protected.' using errcode='42501'; end if;
 return old;
end $$;
revoke all on function private.protect_owner_profile() from public,anon,authenticated;
create trigger protect_owner_profile before delete on public.profiles for each row execute function private.protect_owner_profile();

-- Notification recipients may only mark messages read, never rewrite their content.
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select on public.notifications to authenticated;

-- The ministry leader editor updates only the description. Enforce that at
-- the database boundary too, including requests made without the UI.
create function private.protect_ministry_leader_columns() returns trigger
language plpgsql set search_path='' as $$
begin
 if auth.uid() is not null and not public.has_permission(old.organization_id,'content.manage')
 and (to_jsonb(new)-array['description','updated_at']) is distinct from (to_jsonb(old)-array['description','updated_at']) then
   raise exception 'Ministry leaders may only edit their ministry description.' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.protect_ministry_leader_columns() from public,anon,authenticated;
create trigger protect_ministry_leader_columns before update on public.ministries for each row execute function private.protect_ministry_leader_columns();

-- Trigger-only helpers must not be exposed as callable browser RPCs.
revoke execute on function public.audit_care_case_access_change(),public.audit_ministry_assignment_change(),
 public.audit_refund_created(),public.audit_user_roles_change(),public.handle_new_auth_user(),public.rls_auto_enable()
 from public,anon,authenticated;
alter function public.set_updated_at() set search_path='';
alter function public.immutable_english_tsvector(text) set search_path='';
alter function public.assign_donation_receipt_number() set search_path='';
alter function public.next_order_number() set search_path='';
alter function public.assign_document_number() set search_path='';
