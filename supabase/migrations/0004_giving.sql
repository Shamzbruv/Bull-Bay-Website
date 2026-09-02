-- Giving domain, kept conceptually and structurally separate from commerce
-- (0005): a donation is never the same accounting object as a purchase.

create table public.funds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code citext not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  donor_profile_id uuid references public.profiles(id) on delete set null,
  donor_name text,
  donor_email citext,
  amount_minor integer not null check (amount_minor > 0),
  currency char(3) not null default 'JMD',
  is_recurring boolean not null default false,
  provider text,
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded', 'partially_refunded')),
  receipt_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create trigger donations_set_updated_at before update on public.donations
  for each row execute function public.set_updated_at();
create index donations_donor_idx on public.donations (donor_profile_id);
create index donations_org_idx on public.donations (organization_id, status, created_at desc);

create table public.donation_allocations (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  fund_id uuid not null references public.funds(id) on delete restrict,
  amount_minor integer not null check (amount_minor > 0)
);
create index donation_allocations_donation_idx on public.donation_allocations (donation_id);

-- receipt numbering: immutable internal UUID, human-friendly sequential
-- external number, e.g. BB-2026-000184.
create sequence public.donation_receipt_seq;

create or replace function public.assign_donation_receipt_number()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and new.receipt_number is null then
    new.receipt_number := 'BB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.donation_receipt_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger donations_assign_receipt
  before insert or update on public.donations
  for each row execute function public.assign_donation_receipt_number();
