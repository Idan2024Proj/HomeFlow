-- HomeFlow Phase 3: Transactions foundation

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income', 'both')),
  icon text,
  color text,
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (household_id, name)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index categories_household_idx on public.categories (household_id, sort_order);

-- ---------------------------------------------------------------------------
-- merchants
-- ---------------------------------------------------------------------------
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  default_category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger merchants_set_updated_at
  before update on public.merchants
  for each row execute function public.set_updated_at();

create index merchants_household_normalized_idx
  on public.merchants (household_id, normalized_name);

-- ---------------------------------------------------------------------------
-- payment_methods
-- ---------------------------------------------------------------------------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'credit', 'debit', 'transfer', 'other')),
  last_four char(4),
  owner_user_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_methods_last_four_digits check (
    last_four is null or last_four ~ '^[0-9]{4}$'
  )
);

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

create index payment_methods_household_idx
  on public.payment_methods (household_id)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'ILS',
  occurred_on date not null,
  charged_on date,
  merchant_id uuid references public.merchants (id) on delete set null,
  merchant_name text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  paid_by uuid not null references public.profiles (id),
  split_mode text not null check (split_mode in ('personal', 'equal', 'percent', 'custom')),
  is_shared boolean not null default false,
  note text,
  tags text[] not null default '{}',
  installment_count int check (installment_count is null or installment_count >= 1),
  installment_number int check (installment_number is null or installment_number >= 1),
  parent_transaction_id uuid references public.transactions (id) on delete set null,
  import_batch_id uuid,
  external_fingerprint text,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'pending', 'excluded')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create index transactions_household_occurred_idx
  on public.transactions (household_id, occurred_on desc)
  where deleted_at is null;

create index transactions_household_category_idx
  on public.transactions (household_id, category_id)
  where deleted_at is null;

create unique index transactions_household_fingerprint_uidx
  on public.transactions (household_id, external_fingerprint)
  where external_fingerprint is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- transaction_splits
-- ---------------------------------------------------------------------------
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  share_percent numeric(5, 2) check (share_percent is null or (share_percent >= 0 and share_percent <= 100)),
  created_at timestamptz not null default timezone('utc', now()),
  unique (transaction_id, user_id)
);

create index transaction_splits_household_idx
  on public.transaction_splits (household_id, transaction_id);

-- ---------------------------------------------------------------------------
-- Seed default categories for a household
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_categories(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (household_id, name, kind, icon, is_system, sort_order)
  values
    (p_household_id, 'דיור', 'expense', 'home', true, 10),
    (p_household_id, 'מזון', 'expense', 'utensils', true, 20),
    (p_household_id, 'תחבורה', 'expense', 'car', true, 30),
    (p_household_id, 'חשבונות', 'expense', 'file-text', true, 40),
    (p_household_id, 'בריאות', 'expense', 'heart', true, 50),
    (p_household_id, 'בילויים', 'expense', 'sparkles', true, 60),
    (p_household_id, 'קניות', 'expense', 'shopping-bag', true, 70),
    (p_household_id, 'אחר', 'expense', 'circle', true, 80),
    (p_household_id, 'משכורת', 'income', 'wallet', true, 100),
    (p_household_id, 'הכנסה אחרת', 'income', 'plus-circle', true, 110)
  on conflict (household_id, name) do nothing;

  insert into public.payment_methods (household_id, name, type, is_active)
  select p_household_id, v.name, v.type, true
  from (values
    ('מזומן', 'cash'),
    ('העברה בנקאית', 'transfer'),
    ('אשראי', 'credit')
  ) as v(name, type)
  where not exists (
    select 1 from public.payment_methods pm
    where pm.household_id = p_household_id and pm.name = v.name
  );
end;
$$;

-- Hook into household creation
create or replace function public.create_household_as_owner(
  p_name text,
  p_display_name text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  created public.households;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from public.household_members
    where user_id = uid and status = 'active'
  ) then
    raise exception 'user already belongs to a household';
  end if;

  insert into public.households (name, created_by)
  values (p_name, uid)
  returning * into created;

  insert into public.household_members (
    household_id, user_id, role, display_name, status, joined_at
  ) values (
    created.id, uid, 'owner', p_display_name, 'active', timezone('utc', now())
  );

  insert into public.activity_logs (
    household_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    created.id, uid, 'household.created', 'household', created.id,
    jsonb_build_object('name', created.name)
  );

  perform public.seed_default_categories(created.id);

  return created;
end;
$$;

-- Backfill existing households
do $$
declare
  h record;
begin
  for h in select id from public.households loop
    perform public.seed_default_categories(h.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.merchants enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_splits enable row level security;

create policy categories_member_all on public.categories
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy merchants_member_all on public.merchants
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy payment_methods_member_all on public.payment_methods
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy transactions_member_select on public.transactions
  for select to authenticated
  using (public.is_household_member(household_id));

create policy transactions_member_insert on public.transactions
  for insert to authenticated
  with check (
    public.is_household_member(household_id)
    and created_by = auth.uid()
  );

create policy transactions_member_update on public.transactions
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy transactions_member_delete on public.transactions
  for delete to authenticated
  using (public.is_household_member(household_id));

create policy splits_member_all on public.transaction_splits
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.merchants to authenticated;
grant select, insert, update, delete on public.payment_methods to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.transaction_splits to authenticated;
grant execute on function public.seed_default_categories(uuid) to authenticated;
