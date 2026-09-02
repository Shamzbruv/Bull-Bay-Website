-- Commerce domain. Money as integer minor units throughout. Order line
-- items snapshot name/SKU/price at time of purchase — never recompute from
-- current product data. Inventory is a ledger, not a mutable counter.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug citext not null,
  name text not null,
  description text,
  kind text not null check (kind in ('physical', 'digital', 'software', 'service', 'subscription')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  price_minor integer not null check (price_minor >= 0),
  currency char(3) not null default 'JMD',
  taxable boolean not null default true,
  tax_class text not null default 'standard',
  image_urls text[] not null default '{}',
  digital_asset_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create index products_active_idx on public.products (organization_id, status, kind);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  price_minor_override integer,
  track_inventory boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_delta integer not null,
  reason text not null check (reason in ('initial_stock', 'order', 'return', 'adjustment', 'restock')),
  reference_type text,
  reference_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at);

create view public.variant_stock_levels as
  select variant_id, coalesce(sum(quantity_delta), 0) as available
  from public.inventory_movements
  group by variant_id;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_number text not null unique,
  customer_profile_id uuid references public.profiles(id) on delete set null,
  customer_email citext,
  customer_name text,
  status text not null default 'pending'
    check (status in ('pending', 'awaiting_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded', 'partially_refunded')),
  subtotal_minor integer not null default 0,
  discount_minor integer not null default 0,
  tax_minor integer not null default 0,
  shipping_minor integer not null default 0,
  total_minor integer not null default 0,
  currency char(3) not null default 'JMD',
  fulfillment_method text check (fulfillment_method in ('pickup', 'local_delivery', 'parish_delivery', 'international_shipping', 'digital_delivery')),
  shipping_address jsonb,
  provider text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create index orders_customer_idx on public.orders (customer_profile_id);
create index orders_org_idx on public.orders (organization_id, status, created_at desc);

create sequence public.order_number_seq;

create or replace function public.assign_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'BB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  name_snapshot text not null,
  sku_snapshot text,
  unit_price_minor integer not null,
  quantity integer not null check (quantity > 0),
  tax_minor integer not null default 0,
  total_minor integer not null
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  donation_id uuid references public.donations(id) on delete set null,
  provider text not null,
  provider_payment_id text not null,
  amount_minor integer not null,
  currency char(3) not null default 'JMD',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  constraint payments_target check (order_id is not null or donation_id is not null)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider_refund_id text,
  amount_minor integer not null check (amount_minor > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.audit_refund_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'refund.issued', 'payments', new.payment_id::text,
    jsonb_build_object('refund_id', new.id, 'amount_minor', new.amount_minor, 'reason', new.reason));
  return new;
end;
$$;

create trigger refunds_audit
  after insert on public.refunds
  for each row execute function public.audit_refund_created();

create table public.digital_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  email citext,
  expires_at timestamptz,
  max_downloads integer,
  download_count integer not null default 0,
  license_key_hash text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index digital_entitlements_profile_idx on public.digital_entitlements (profile_id);

-- idempotent webhook processing: every provider event lands here exactly
-- once (unique constraint), verified/parsed before any order/donation
-- mutates. No live provider is wired yet, but the table exists so the
-- pattern is ready.
create table public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
