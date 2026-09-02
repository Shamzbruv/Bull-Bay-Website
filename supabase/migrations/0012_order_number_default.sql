-- Replace the BEFORE INSERT trigger for order_number with a column
-- DEFAULT. Functionally identical, but a DEFAULT lets Supabase's generated
-- TypeScript types mark order_number as optional on insert (a trigger-set
-- NOT NULL column has no way to signal "will be filled in" to the type
-- generator), so app code doesn't need to fake a value.

create or replace function public.next_order_number()
returns text
language plpgsql
as $$
begin
  return 'BB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
end;
$$;

drop trigger if exists orders_assign_number on public.orders;
drop function if exists public.assign_order_number();

alter table public.orders alter column order_number set default public.next_order_number();
