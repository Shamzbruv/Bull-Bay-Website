-- Signatures belong to one exact document, never to a reusable pastor asset.
alter table public.document_requests add column officiant_approval_hash text;
create table public.document_officiants (
 request_id uuid primary key references public.document_requests(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 200),
 email text not null check (length(email) between 3 and 320),
 token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
 binding jsonb not null,
 expires_at timestamptz not null,
 requested_by uuid not null references auth.users(id),
 requested_at timestamptz not null default now(),
 signed_at timestamptz,
 signature_png text check (length(signature_png) <= 400000 and signature_png ~ '^data:image/png;base64,'),
 acknowledgement text,
 check ((signed_at is null and signature_png is null and acknowledgement is null) or
        (signed_at is not null and signature_png is not null and length(acknowledgement)>0))
);
alter table public.document_officiants enable row level security;
revoke all on public.document_officiants from public, anon, authenticated;
grant select, insert, update, delete on public.document_officiants to service_role;

-- Serialize requests, signatures, replacements and certification against the same document.
-- Invoker functions; these tables are only accessed by authorized server actions.
create function public.guard_document_officiant() returns trigger language plpgsql
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
 if new.signed_at is not null and (new.expires_at <= now() or (tg_op='UPDATE' and old.signed_at is not null)) then raise exception 'Signing request expired or already signed.'; end if;
 return new;
end $$;
revoke all on function public.guard_document_officiant() from public, anon, authenticated;
create trigger document_officiant_guard before insert or update or delete on public.document_officiants for each row execute function public.guard_document_officiant();

create function public.guard_officiant_certification() returns trigger language plpgsql
set search_path = '' as $$
declare s public.document_officiants; b jsonb;
begin
 if new.status='stamped' and old.status is distinct from 'stamped' then
   select * into s from public.document_officiants where request_id=new.id;
   if s.request_id is not null then
     b := jsonb_build_object('body',new.prepared_body,'title',new.title,'details',new.details,'template',new.template_snapshot,'member',new.requester_profile_id,'recipient',new.recipient_name,'email',new.recipient_email);
     if s.signed_at is null or s.binding <> b or new.officiant_approval_hash is distinct from s.token_hash then
       raise exception 'Officiating pastor must acknowledge and sign this exact document before certification.';
     end if;
   elsif new.officiant_approval_hash is not null then
     raise exception 'Officiating pastor request was cancelled. Refresh before certifying.';
   end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_officiant_certification() from public, anon, authenticated;
create trigger document_officiant_certification_guard before update on public.document_requests for each row execute function public.guard_officiant_certification();

create function public.audit_officiant_signature() returns trigger language plpgsql
set search_path = '' as $$
begin
 if new.signed_at is not null and old.signed_at is null then
   insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
   values(new.organization_id,null,'document.officiant_signed','document_requests',new.request_id::text,
     jsonb_build_object('officiant',new.name,'signed_at',new.signed_at,'acknowledgement',new.acknowledgement));
 end if;
 return new;
end $$;
revoke all on function public.audit_officiant_signature() from public, anon, authenticated;
create trigger document_officiant_signature_audit after update on public.document_officiants for each row execute function public.audit_officiant_signature();
