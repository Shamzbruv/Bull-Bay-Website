create table public.pastor_signature_authorizations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null check(length(email) between 3 and 320),
 name text check(length(trim(name)) between 2 and 200),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 invited_by uuid not null references auth.users(id),
 invited_at timestamptz not null default now(),
 accepted_at timestamptz,
 signature_png text check(length(signature_png)<=400000 and signature_png ~ '^data:image/png;base64,'),
 consent_text text,
 revoked_at timestamptz,
 revoked_by uuid references auth.users(id),
 check((accepted_at is null and name is null and signature_png is null and consent_text is null) or
       (accepted_at is not null and name is not null and signature_png is not null and consent_text is not null and length(consent_text)>0)),
 check((revoked_at is null)=(revoked_by is null))
);
create unique index pastor_signature_active_email on public.pastor_signature_authorizations(organization_id,lower(email)) where revoked_at is null;
alter table public.pastor_signature_authorizations enable row level security;
revoke all on public.pastor_signature_authorizations from public,anon,authenticated;
grant select,insert,update on public.pastor_signature_authorizations to service_role;
alter table public.document_officiants add column authorization_id uuid references public.pastor_signature_authorizations(id);

create function public.guard_pastor_signature_authorization() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
   if new.accepted_at is not null or new.revoked_at is not null then raise exception 'A new invitation must await the pastor authorization.'; end if;
   return new;
 end if;
 if old.revoked_at is not null then raise exception 'Revoked authorization cannot be changed.'; end if;
 if new.id<>old.id or new.organization_id<>old.organization_id or new.email<>old.email or new.invited_by<>old.invited_by or new.invited_at<>old.invited_at then raise exception 'Invitation identity cannot be changed.'; end if;
 if old.accepted_at is not null and (new.name is distinct from old.name or new.signature_png is distinct from old.signature_png or new.consent_text is distinct from old.consent_text or new.accepted_at is distinct from old.accepted_at or new.token_hash<>old.token_hash or new.expires_at<>old.expires_at) then raise exception 'Accepted consent is immutable; revoke and invite again to replace it.'; end if;
 if old.accepted_at is null and new.accepted_at is not null and (old.expires_at<=now() or new.revoked_at is not null or new.token_hash<>old.token_hash or new.expires_at<>old.expires_at) then raise exception 'Invitation expired or revoked.'; end if;
 return new;
end $$;
revoke all on function public.guard_pastor_signature_authorization() from public,anon,authenticated;
create trigger pastor_signature_authorization_guard before insert or update on public.pastor_signature_authorizations for each row execute function public.guard_pastor_signature_authorization();

create function public.audit_pastor_signature_authorization() returns trigger language plpgsql set search_path='' as $$
begin
 if old.accepted_at is null and new.accepted_at is not null then
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) values(new.organization_id,null,'pastor_signature.authorized','pastor_signature_authorizations',new.id::text,jsonb_build_object('name',new.name,'accepted_at',new.accepted_at,'consent_text',new.consent_text));
 end if;
 return new;
end $$;
revoke all on function public.audit_pastor_signature_authorization() from public,anon,authenticated;
create trigger pastor_signature_authorization_audit after update on public.pastor_signature_authorizations for each row execute function public.audit_pastor_signature_authorization();

-- Reusable authorizations are checked against the original consent, including at issuance.
create function public.validate_saved_pastor_signature() returns trigger language plpgsql set search_path='' as $$
declare a public.pastor_signature_authorizations;
begin
 if new.authorization_id is not null then
  select * into a from public.pastor_signature_authorizations where id=new.authorization_id for share;
  if a.id is null or a.organization_id<>new.organization_id or a.revoked_at is not null or a.accepted_at is null or
     new.name is distinct from a.name or new.email is distinct from a.email or new.signature_png is distinct from a.signature_png or new.signed_at is distinct from a.accepted_at or new.acknowledgement is distinct from a.consent_text then
    raise exception 'Choose an active pastor signature authorization from this church.';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.validate_saved_pastor_signature() from public,anon,authenticated;
create trigger a_validate_saved_pastor_signature before insert or update on public.document_officiants for each row execute function public.validate_saved_pastor_signature();

create function public.guard_saved_signature_certification() returns trigger language plpgsql set search_path='' as $$
declare a public.pastor_signature_authorizations; selected uuid;
begin
 if new.status='stamped' and old.status is distinct from 'stamped' then
  select authorization_id into selected from public.document_officiants where request_id=new.id;
  if selected is not null then
   select * into a from public.pastor_signature_authorizations where id=selected for share;
   if a.id is null or a.organization_id<>new.organization_id or a.accepted_at is null or a.revoked_at is not null then raise exception 'Pastor signature authorization has been revoked. Choose an active signature.'; end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_saved_signature_certification() from public,anon,authenticated;
create trigger document_saved_signature_certification_guard before update on public.document_requests for each row execute function public.guard_saved_signature_certification();

-- Re-selecting a saved authorization creates a new document binding.
create or replace function public.guard_document_officiant() returns trigger language plpgsql
set search_path = '' as $$
declare r public.document_requests; b jsonb;
begin
 select * into r from public.document_requests where id = coalesce(new.request_id, old.request_id) for update;
 if tg_op = 'DELETE' then
   if r.id is not null and r.status <> 'pending_pastor' then raise exception 'This document is already issued or no longer awaiting a signature.'; end if;
   return old;
 end if;
 if r.id is null or r.organization_id <> new.organization_id or r.status <> 'pending_pastor' then raise exception 'Document is not awaiting certification.'; end if;
 b := jsonb_build_object('body',r.prepared_body,'title',r.title,'details',r.details,'template',r.template_snapshot,'member',r.requester_profile_id,'recipient',r.recipient_name,'email',r.recipient_email);
 if new.binding <> b then raise exception 'The document changed. Send a fresh signing request.'; end if;
 if new.signed_at is not null and (new.expires_at <= now() or (tg_op='UPDATE' and old.signed_at is not null and old.token_hash=new.token_hash)) then raise exception 'Signing request expired or already signed.'; end if;
 return new;
end $$;

-- Blanket permission is not a claim that a pastor acknowledged a particular ceremony.
create or replace function public.audit_officiant_signature() returns trigger language plpgsql
set search_path = '' as $$
begin
 if new.authorization_id is null and new.signed_at is not null and old.signed_at is null then
   insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
   values(new.organization_id,null,'document.officiant_signed','document_requests',new.request_id::text,
     jsonb_build_object('officiant',new.name,'signed_at',new.signed_at,'acknowledgement',new.acknowledgement));
 end if;
 return new;
end $$;
