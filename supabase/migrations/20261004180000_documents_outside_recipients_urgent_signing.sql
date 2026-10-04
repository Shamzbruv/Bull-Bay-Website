-- Documents can now be emailed to someone who isn't in the members list
-- (typed-in name, email and address), and the office can apply the Pastor's
-- signature and church stamp to an urgent document without waiting for him;
-- the Pastor is told each time, by bell and email.

-- Who the finished PDF is emailed to when it isn't the member on
-- requester_profile_id. The member may still be set: a letter about a member
-- sent straight to an embassy stays on that member's record.
alter table public.document_requests
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists recipient_address text,
  -- Set when the office signed on the Pastor's behalf because it couldn't wait.
  add column if not exists urgent_reason text;

alter table public.document_requests
  drop constraint if exists document_requests_outside_recipient_check;
alter table public.document_requests
  add constraint document_requests_outside_recipient_check check (
    (recipient_email is null or (
      char_length(recipient_email) <= 320
      and recipient_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and recipient_name is not null
    ))
    and (recipient_name is null or char_length(btrim(recipient_name)) between 1 and 200)
    and (recipient_address is null or char_length(recipient_address) <= 1000)
    and (urgent_reason is null or char_length(btrim(urgent_reason)) between 1 and 1000)
  );

insert into public.permissions(code, description) values
  ('documents.urgent_sign', 'Apply the Pastor''s signature and church stamp to an urgent document (the Pastor is notified each time)')
on conflict do nothing;

-- The office roles that prepare documents, plus the super administrator
-- (who holds every permission).
insert into public.role_permissions(role_id, permission_code)
select id, 'documents.urgent_sign' from public.roles where code in ('super_admin', 'church_executive', 'secretary')
on conflict do nothing;

-- The member-facing "document ready" email points at the member portal,
-- which someone outside the church can't use.
insert into public.email_templates(organization_id, slug, name, subject, body)
select id, 'document-sent', 'Document sent outside the church', '{{document_title}} from {{church_name}}', 'Dear {{recipient_name}},

Please find attached {{document_title}} ({{document_number}}) from {{church_name}}.

If you have any questions about it, simply reply to this email.

With blessings,
{{church_name}}'
from public.organizations
on conflict (organization_id, slug) do nothing;
