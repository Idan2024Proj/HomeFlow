-- HomeFlow: receipt line items linked to transactions

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  name text not null,
  quantity numeric(12, 3),
  unit_price numeric(12, 2),
  total_price numeric(12, 2),
  raw_text text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists receipt_items_transaction_idx
  on public.receipt_items (transaction_id);

alter table public.receipt_items enable row level security;

drop policy if exists receipt_items_select on public.receipt_items;
create policy receipt_items_select on public.receipt_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = receipt_items.transaction_id
        and public.is_household_member(t.household_id)
    )
  );

drop policy if exists receipt_items_insert on public.receipt_items;
create policy receipt_items_insert on public.receipt_items
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.transactions t
      where t.id = receipt_items.transaction_id
        and public.is_household_member(t.household_id)
    )
  );

drop policy if exists receipt_items_update on public.receipt_items;
create policy receipt_items_update on public.receipt_items
  for update to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = receipt_items.transaction_id
        and public.is_household_member(t.household_id)
    )
  )
  with check (
    exists (
      select 1
      from public.transactions t
      where t.id = receipt_items.transaction_id
        and public.is_household_member(t.household_id)
    )
  );

drop policy if exists receipt_items_delete on public.receipt_items;
create policy receipt_items_delete on public.receipt_items
  for delete to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = receipt_items.transaction_id
        and public.is_household_member(t.household_id)
    )
  );

grant select, insert, update, delete on public.receipt_items to authenticated;
