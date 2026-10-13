begin;
alter table public.households add column description text not null default '' check(length(description)<=1000);
alter table public.households add column updated_at timestamptz not null default now();
alter table public.households add constraint households_org_id_unique unique(organization_id,id);
create trigger households_updated before update on public.households for each row execute function public.set_updated_at();
alter table public.profiles add constraint profiles_household_same_church foreign key(organization_id,household_id) references public.households(organization_id,id);

create table public.family_relationships(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 source_profile_id uuid not null, target_profile_id uuid not null, recipient_profile_id uuid not null,
 kind text not null check(kind in('parent','spouse','sibling','cousin','grandparent','aunt_uncle','guardian','step_parent','in_law','other')),
 notes text not null default '' check(length(notes)<=1000),
 status text not null check(status in('pending','confirmed','declined','removed')),
 requested_by uuid references auth.users(id) on delete set null, reviewed_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,source_profile_id) references public.profiles(organization_id,id) on delete cascade,
 foreign key(organization_id,target_profile_id) references public.profiles(organization_id,id) on delete cascade,
 foreign key(organization_id,recipient_profile_id) references public.profiles(organization_id,id) on delete cascade,
 check(source_profile_id<>target_profile_id),check(recipient_profile_id in(source_profile_id,target_profile_id)),
 check(kind not in('spouse','sibling','cousin','in_law','other') or source_profile_id<target_profile_id)
);
create unique index family_relationships_active_pair on public.family_relationships(organization_id,source_profile_id,target_profile_id,kind) where status in('pending','confirmed');
create index family_relationships_target_idx on public.family_relationships(organization_id,target_profile_id);
create index family_relationships_recipient_idx on public.family_relationships(organization_id,recipient_profile_id,status);
create trigger family_relationships_updated before update on public.family_relationships for each row execute function public.set_updated_at();
alter table public.family_relationships enable row level security;
grant select on public.family_relationships to authenticated;
grant all on public.family_relationships to service_role;
create policy "family relationships parties read" on public.family_relationships for select to authenticated using(
 public.has_permission(organization_id,'people.read') or exists(select 1 from public.profiles p where p.organization_id=family_relationships.organization_id and p.auth_user_id=(select auth.uid()) and p.id in(source_profile_id,target_profile_id) and p.membership_status<>'deceased')
);

create table public.household_invitations(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 household_id uuid not null,source_profile_id uuid not null,target_profile_id uuid not null,
 status text not null default 'pending' check(status in('pending','accepted','declined','cancelled')),
 requested_by uuid references auth.users(id) on delete set null,reviewed_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(organization_id,household_id) references public.households(organization_id,id) on delete cascade,
 foreign key(organization_id,source_profile_id) references public.profiles(organization_id,id) on delete cascade,
 foreign key(organization_id,target_profile_id) references public.profiles(organization_id,id) on delete cascade,
 check(source_profile_id<>target_profile_id)
);
create unique index household_invitations_pending on public.household_invitations(organization_id,household_id,target_profile_id) where status='pending';
create index household_invitations_target_idx on public.household_invitations(organization_id,target_profile_id,status);
create trigger household_invitations_updated before update on public.household_invitations for each row execute function public.set_updated_at();
alter table public.household_invitations enable row level security;
grant select on public.household_invitations to authenticated;
grant all on public.household_invitations to service_role;
create policy "household invitations parties read" on public.household_invitations for select to authenticated using(
 public.has_permission(organization_id,'people.read') or exists(select 1 from public.profiles p where p.organization_id=household_invitations.organization_id and p.auth_user_id=(select auth.uid()) and p.id in(source_profile_id,target_profile_id) and p.membership_status<>'deceased')
);

-- A household grants access to personal records. It can only be changed
-- through the office or a server-verified invitation, never a guessed ID.
create function private.protect_household_assignment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.household_id is distinct from old.household_id and (select auth.uid()) is not null and not public.has_permission(old.organization_id,'people.write') then
  raise exception 'Use the household invitation workflow to change your household.' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.protect_household_assignment() from public,anon,authenticated;
create trigger profiles_protect_household_assignment before update of household_id on public.profiles for each row execute function private.protect_household_assignment();
revoke insert,delete on public.households from authenticated,anon;
-- The family workspace exposes names through its scoped server data layer;
-- being a housemate does not grant access to full profiles or office notes.
drop policy if exists "profiles household read" on public.profiles;

-- All writes, approval, audit, and inbox notification happen atomically.
-- Only the authenticated server action can call this service-only API.
create function public.manage_family(command text,org uuid,actor uuid,payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare viewer public.profiles; staff boolean; household uuid; person uuid; target uuid; original_target uuid; relationship_kind text; link uuid; current_link public.family_relationships; invite public.household_invitations; new_status text; target_user uuid; result jsonb; entity text;
begin
 -- Serialize family writes in this church so reciprocal requests and
 -- simultaneous invitation responses cannot deadlock on profile FKs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('family:'||org::text,0));
 select * into viewer from public.profiles where organization_id=org and auth_user_id=actor for no key update;
 if not found or viewer.membership_status='deceased' then raise exception 'Sign in with an active church profile.'; end if;
 select exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id where ur.organization_id=org and ur.user_id=actor and rp.permission_code='people.write') into staff;
 if jsonb_typeof(payload)<>'object' then raise exception 'Invalid family information.'; end if;

 if command='save_household' then
  if length(trim(coalesce(payload->>'name',''))) not between 2 and 120 or length(coalesce(payload->>'description',''))>1000 then raise exception 'Enter a family name between 2 and 120 characters and a short description.'; end if;
  household:=nullif(payload->>'household_id','')::uuid;
  if coalesce((payload->>'new')::boolean,false) then
   if not staff then raise exception 'Only church staff can create additional directory households.'; end if;
   household:=null;
  elsif household is null then household:=viewer.household_id;
  end if;
  if household is null then
   insert into public.households(organization_id,name,description) values(org,trim(payload->>'name'),trim(coalesce(payload->>'description',''))) returning id into household;
   if not coalesce((payload->>'new')::boolean,false) then update public.profiles set household_id=household where id=viewer.id and organization_id=org; end if;
  else
   if not staff and household is distinct from viewer.household_id then raise exception 'You can only edit your own household.'; end if;
   update public.households set name=trim(payload->>'name'),description=trim(coalesce(payload->>'description','')) where id=household and organization_id=org and (not(payload?'updated_at') or updated_at=(payload->>'updated_at')::timestamptz);
   if not found then raise exception 'This household changed or could not be found. Refresh before saving.'; end if;
  end if;
  link:=household;entity:='households';result:=jsonb_build_object('id',household);

 elsif command='assign_member' then
  if not staff then raise exception 'Church staff permission is required.'; end if;
  household:=nullif(payload->>'household_id','')::uuid;person:=(payload->>'profile_id')::uuid;
  if household is not null and not exists(select 1 from public.households where organization_id=org and id=household) then raise exception 'Choose a household in this church.'; end if;
  update public.profiles set household_id=household where id=person and organization_id=org and updated_at=(payload->>'updated_at')::timestamptz;
  if not found then raise exception 'This person changed or could not be found. Refresh before saving.'; end if;
  link:=person;entity:='profiles';result:=jsonb_build_object('id',person);

 elsif command in('request_relationship','invite_household') then
  person:=coalesce(nullif(payload->>'source_id','')::uuid,viewer.id);
  if not staff and person<>viewer.id then raise exception 'You can only request your own relationships.'; end if;
  if not exists(select 1 from public.profiles where organization_id=org and id=person) then raise exception 'Choose a person in this church.'; end if;
  target:=nullif(payload->>'target_id','')::uuid;
  if target is not null and not staff then raise exception 'Use the relative’s account email to request a connection.'; end if;
  if target is null then
   if length(coalesce(payload->>'email',''))>254 then raise exception 'Enter a valid email address.'; end if;
   select id into target from public.profiles where organization_id=org and lower(email::text)=lower(trim(payload->>'email')) and membership_status<>'deceased' order by auth_user_id nulls last limit 1;
   -- The caller receives the same message for an unknown account: this is
   -- not an email/name directory lookup endpoint.
   if target is null then return jsonb_build_object('received',true); end if;
  end if;
  if person=target then raise exception 'Choose a different person.'; end if;
  select auth_user_id into target_user from public.profiles where organization_id=org and id=target;
  if not found then raise exception 'Choose a person in this church.'; end if;
  original_target:=target;
  if command='invite_household' then
   household:=coalesce(nullif(payload->>'household_id','')::uuid,viewer.household_id);
   if household is null or not exists(select 1 from public.households where id=household and organization_id=org) then raise exception 'Create your household first.'; end if;
   if not staff and household is distinct from viewer.household_id then raise exception 'You can only invite someone to your own household.'; end if;
   if exists(select 1 from public.profiles where id=target and household_id=household) then return jsonb_build_object('received',true); end if;
   insert into public.household_invitations(organization_id,household_id,source_profile_id,target_profile_id,requested_by)
    values(org,household,person,target,actor) on conflict(organization_id,household_id,target_profile_id) where status='pending' do nothing returning id into link;
   if link is null then return jsonb_build_object('received',true); end if;
   entity:='household_invitations';
  else
   relationship_kind:=payload->>'kind';
   if relationship_kind in('child','grandchild','niece_nephew','dependent','step_child') then
    target:=person;person:=original_target;
    relationship_kind:=case relationship_kind when 'child' then 'parent' when 'grandchild' then 'grandparent' when 'niece_nephew' then 'aunt_uncle' when 'dependent' then 'guardian' else 'step_parent' end;
   elsif relationship_kind in('spouse','sibling','cousin','in_law','other') and person>target then target:=person;person:=original_target;
   end if;
   if relationship_kind not in('parent','spouse','sibling','cousin','grandparent','aunt_uncle','guardian','step_parent','in_law','other') or relationship_kind is null or length(coalesce(payload->>'notes',''))>1000 then raise exception 'Choose a valid relationship and a short explanation.'; end if;
   new_status:=case when staff and coalesce((payload->>'confirmed')::boolean,false) then 'confirmed' else 'pending' end;
   insert into public.family_relationships(organization_id,source_profile_id,target_profile_id,recipient_profile_id,kind,notes,status,requested_by,reviewed_by)
    values(org,person,target,original_target,relationship_kind,trim(coalesce(payload->>'notes','')),new_status,actor,case when new_status='confirmed' then actor else null end)
    on conflict(organization_id,source_profile_id,target_profile_id,kind) where status in('pending','confirmed') do nothing returning id into link;
   if link is null then return jsonb_build_object('received',true); end if;
   entity:='family_relationships';
  end if;
  if target_user is not null and new_status is distinct from 'confirmed' then
   insert into public.notifications(organization_id,user_id,type,title,body,url) values(org,target_user,'family','Family connection request','Review a household invitation or family relationship in My Household.','/member/household');
  elsif target_user is null and new_status is distinct from 'confirmed' then
   insert into public.notifications(organization_id,user_id,type,title,body,url) select distinct org,ur.user_id,'family','Family request needs office review','A relative without a linked account needs confirmation.','/admin/families' from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.organization_id=org and r.code in('secretary','church_admin','super_admin','church_executive');
  end if;
  result:=jsonb_build_object('received',true);

 elsif command='review_relationship' then
  link:=(payload->>'id')::uuid;new_status:=payload->>'decision';
  if new_status not in('confirmed','declined','removed') or new_status is null then raise exception 'Choose a valid decision.'; end if;
  select * into current_link from public.family_relationships where organization_id=org and id=link for update;
  if not found or current_link.updated_at is distinct from (payload->>'updated_at')::timestamptz then raise exception 'This connection changed. Refresh before making a decision.'; end if;
  if new_status='removed' then
   if not staff and viewer.id not in(current_link.source_profile_id,current_link.target_profile_id) then raise exception 'You cannot remove this connection.'; end if;
   if current_link.status not in('pending','confirmed') then raise exception 'This connection is already closed.'; end if;
  else
   if not staff and viewer.id<>current_link.recipient_profile_id then raise exception 'Only the recipient or church staff can confirm this request.'; end if;
   if current_link.status<>'pending' then raise exception 'This request has already been reviewed.'; end if;
  end if;
  update public.family_relationships set status=new_status,reviewed_by=actor where id=link;
  entity:='family_relationships';result:=jsonb_build_object('id',link);

 elsif command='review_invitation' then
  link:=(payload->>'id')::uuid;new_status:=payload->>'decision';
  if new_status not in('accepted','declined','cancelled') or new_status is null then raise exception 'Choose a valid invitation decision.'; end if;
  select * into invite from public.household_invitations where organization_id=org and id=link for update;
  if not found or invite.status<>'pending' or invite.updated_at is distinct from(payload->>'updated_at')::timestamptz then raise exception 'This invitation changed. Refresh before making a decision.'; end if;
  if new_status='cancelled' then
   if not staff and viewer.id not in(invite.source_profile_id,invite.target_profile_id) then raise exception 'You cannot cancel this invitation.'; end if;
  elsif not staff and viewer.id<>invite.target_profile_id then raise exception 'Only the invited person or church staff can respond.';
  end if;
  if new_status='accepted' then
   update public.profiles set household_id=invite.household_id where organization_id=org and id=invite.target_profile_id;
   update public.household_invitations set status='cancelled',reviewed_by=actor where organization_id=org and target_profile_id=invite.target_profile_id and id<>link and status='pending';
  end if;
  update public.household_invitations set status=new_status,reviewed_by=actor where id=link;
  entity:='household_invitations';result:=jsonb_build_object('id',link);
 else raise exception 'Unknown family action.';
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) values(org,actor,'family.'||command,entity,link::text,jsonb_build_object('decision',new_status));
 return result;
end $$;
revoke all on function public.manage_family(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.manage_family(text,uuid,uuid,jsonb) to service_role;
commit;
