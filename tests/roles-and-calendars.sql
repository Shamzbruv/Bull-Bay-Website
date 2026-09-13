-- Run in a transaction, against a database with the launch migration applied.
-- All fixture accounts, grants, calendar entries and notifications roll back.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','launch-member@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','launch-pastor@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','launch-admin@example.invalid');
select set_config('test.org',(select id::text from public.organizations where slug='bull-bay'),true);
select set_config('test.owner',(select user_id::text from private.platform_owners where organization_id=current_setting('test.org')::uuid),true);
select set_config('test.member',(select id::text from public.profiles where auth_user_id='11111111-1111-4111-8111-111111111111'),true);
select set_config('test.pastor',(select id::text from public.profiles where auth_user_id='22222222-2222-4222-8222-222222222222'),true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select public.assign_person_role(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222',(select id from public.roles where organization_id=current_setting('test.org')::uuid and code='pastor'));
select public.assign_person_role(current_setting('test.org')::uuid,'33333333-3333-4333-8333-333333333333',(select id from public.roles where organization_id=current_setting('test.org')::uuid and code='church_admin'));
do $$ begin
 if not exists(select 1 from public.pastoral_team_members where profile_id=current_setting('test.pastor')::uuid and is_active and is_pastor) then raise exception 'FAIL pastor calendar provisioning'; end if;
 begin
   perform public.assign_person_role(current_setting('test.org')::uuid,current_setting('test.owner')::uuid,null);
   raise exception 'FAIL self demotion accepted';
 exception when insufficient_privilege then null; end;
end $$;
-- No browser role, including super admin, can directly write grants/catalogue.
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','public.user_roles','INSERT') or has_table_privilege('authenticated','public.roles','UPDATE') or has_table_privilege('authenticated','public.role_permissions','INSERT') then raise exception 'FAIL direct role mutation privileges'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
 begin
   perform public.assign_person_role(current_setting('test.org')::uuid,'33333333-3333-4333-8333-333333333333',(select id from public.roles where code='super_admin' and organization_id=current_setting('test.org')::uuid));
   raise exception 'FAIL admin escalation accepted';
 exception when insufficient_privilege then null; end;
end $$;
-- Grant a second super admin, who must not be able to demote the owner or self.
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select public.assign_person_role(current_setting('test.org')::uuid,'33333333-3333-4333-8333-333333333333',(select id from public.roles where code='super_admin' and organization_id=current_setting('test.org')::uuid));
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
 if (select count(*) from public.user_roles where user_id='33333333-3333-4333-8333-333333333333')<>1 then raise exception 'FAIL role replacement accumulated grants'; end if;
 begin perform public.assign_person_role(current_setting('test.org')::uuid,current_setting('test.owner')::uuid,null); raise exception 'FAIL owner demotion'; exception when insufficient_privilege then null; end;
 begin perform public.assign_person_role(current_setting('test.org')::uuid,'33333333-3333-4333-8333-333333333333',null); raise exception 'FAIL second super admin self demotion'; exception when insufficient_privilege then null; end;
end $$;
-- Tomorrow: 09:00-12:00 Jamaica; a private event hides 09:30-10:00.
insert into public.pastoral_calendar_availability(profile_id,day_of_week,start_time,end_time)
values(current_setting('test.pastor')::uuid,extract(dow from (now() at time zone 'America/Jamaica')::date+1),'09:00','12:00');
select set_config('test.slot',(((now() at time zone 'America/Jamaica')::date+1+time '09:00') at time zone 'America/Jamaica')::text,true);
insert into public.pastoral_calendar_events(profile_id,title,starts_at,ends_at,kind,visibility)
values(current_setting('test.pastor')::uuid,'Private fixture',current_setting('test.slot')::timestamptz+interval '30 minutes',current_setting('test.slot')::timestamptz+interval '1 hour','busy','private');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.pastoral_calendar_events where profile_id=current_setting('test.pastor')::uuid) then raise exception 'FAIL private calendar visible to member'; end if;
 if (select count(*) from public.available_counsel_slots(current_setting('test.pastor')::uuid,(now() at time zone 'America/Jamaica')::date+1))<>5 then raise exception 'FAIL busy slot filtering'; end if;
 if exists(select 1 from public.available_counsel_slots(current_setting('test.pastor')::uuid,(now() at time zone 'America/Jamaica')::date-1)) then raise exception 'FAIL past slots'; end if;
end $$;
insert into public.counsel_requests(organization_id,requester_profile_id,requested_with_profile_id,reason,preferred_date,preferred_time)
values(current_setting('test.org')::uuid,current_setting('test.member')::uuid,current_setting('test.pastor')::uuid,'Pastoral counselling',(now() at time zone 'America/Jamaica')::date+1,'09:00');
select set_config('test.request',(select id::text from public.counsel_requests where requester_profile_id=current_setting('test.member')::uuid),true);
do $$ begin
 begin perform public.respond_counsel_request(current_setting('test.request')::uuid,'scheduled',current_setting('test.slot')::timestamptz,current_setting('test.slot')::timestamptz+interval '30 minutes'); raise exception 'FAIL member self scheduling'; exception when insufficient_privilege then null; end;
 begin
 insert into public.counsel_requests(organization_id,requester_profile_id,requested_with_profile_id,reason,preferred_date,preferred_time)
 values(current_setting('test.org')::uuid,current_setting('test.member')::uuid,current_setting('test.pastor')::uuid,'Pastoral counselling',(now() at time zone 'America/Jamaica')::date+1,'08:00');
 raise exception 'FAIL out of hours request';
 exception when raise_exception then if SQLERRM like 'FAIL%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.respond_counsel_request(current_setting('test.request')::uuid,'scheduled',current_setting('test.slot')::timestamptz,current_setting('test.slot')::timestamptz+interval '30 minutes');
do $$ begin
 if (select count(*) from public.pastoral_calendar_events where counsel_request_id=current_setting('test.request')::uuid)<>1 then raise exception 'FAIL linked appointment'; end if;
 if (select status from public.counsel_requests where id=current_setting('test.request')::uuid)<>'scheduled' then raise exception 'FAIL scheduled status'; end if;
 begin
 perform public.respond_counsel_request(current_setting('test.request')::uuid,'scheduled',current_setting('test.slot')::timestamptz,current_setting('test.slot')::timestamptz+interval '30 minutes');
 raise exception 'FAIL duplicate schedule';
 exception when raise_exception then if SQLERRM like 'FAIL%' then raise; end if; end;
 begin
 insert into public.pastoral_calendar_events(profile_id,title,starts_at,ends_at) values(current_setting('test.pastor')::uuid,'Conflict',current_setting('test.slot')::timestamptz,current_setting('test.slot')::timestamptz+interval '1 hour');
 raise exception 'FAIL overlapping entry'; exception when exclusion_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
select public.respond_counsel_request(current_setting('test.request')::uuid,'cancelled');
reset role;
do $$ begin
 if exists(select 1 from public.pastoral_calendar_events where counsel_request_id=current_setting('test.request')::uuid) then raise exception 'FAIL orphan on cancellation'; end if;
 if (select count(*) from public.available_counsel_slots(current_setting('test.pastor')::uuid,(now() at time zone 'America/Jamaica')::date+1))<>5 then raise exception 'FAIL cancellation did not free slot'; end if;
 if (select count(*) from public.notifications where user_id='11111111-1111-4111-8111-111111111111')<2 then raise exception 'FAIL status notifications'; end if;
end $$;
-- Deactivation removes booking availability, preserving calendar history.
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select public.assign_person_role(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222',null);
do $$ begin
 if exists(select 1 from public.pastoral_team_members where profile_id=current_setting('test.pastor')::uuid and is_active) then raise exception 'FAIL revoked pastoral access'; end if;
 if exists(select 1 from public.available_counsel_slots(current_setting('test.pastor')::uuid,(now() at time zone 'America/Jamaica')::date+1)) then raise exception 'FAIL inactive slots'; end if;
end $$;
rollback;
select 'PASS: roles, owner lock, role replacement, provisioning, private slots, hours, scheduling, overlap prevention, cancellation and notifications' as result;
