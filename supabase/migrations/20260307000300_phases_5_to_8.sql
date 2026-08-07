-- HomeFlow Phases 5-8 schema: settlements, savings, shopping, import, recurring, alerts

-- ---------------------------------------------------------------------------
-- settlements
-- ---------------------------------------------------------------------------
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  amount numeric(12, 2) not null check (amount > 0),
  settled_on date not null default (timezone('utc', now()))::date,
  note text,
  period_year int,
  period_month int check (period_month is null or (period_month >= 1 and period_month <= 12)),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists settlements_household_idx
  on public.settlements (household_id, settled_on desc);

-- ---------------------------------------------------------------------------
-- savings
-- ---------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  contributed_on date not null default (timezone('utc', now()))::date,
  contributed_by uuid not null references public.profiles (id),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- shopping
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger shopping_lists_set_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit text,
  category text,
  estimated_price numeric(12, 2),
  is_checked boolean not null default false,
  added_by uuid not null references public.profiles (id),
  checked_by uuid references public.profiles (id),
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger shopping_items_set_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

create index if not exists shopping_items_list_idx
  on public.shopping_items (list_id, is_checked, sort_order);

-- ---------------------------------------------------------------------------
-- recurring + alerts
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  merchant_id uuid references public.merchants (id) on delete set null,
  frequency text not null default 'monthly'
    check (frequency in ('monthly', 'weekly', 'yearly')),
  next_due_on date not null,
  paid_by uuid references public.profiles (id),
  is_active boolean not null default true,
  detected_automatically boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger recurring_payments_set_updated_at
  before update on public.recurring_payments
  for each row execute function public.set_updated_at();

create table if not exists public.anomaly_alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  type text not null check (type in ('duplicate', 'unusual_amount', 'budget_over', 'other')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  is_dismissed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists anomaly_alerts_household_idx
  on public.anomaly_alerts (household_id, created_at desc)
  where is_dismissed = false;

-- ---------------------------------------------------------------------------
-- import
-- ---------------------------------------------------------------------------
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  source_name text not null,
  file_type text not null check (file_type in ('xlsx', 'csv')),
  column_mapping jsonb not null default '{}'::jsonb,
  status text not null default 'preview'
    check (status in ('preview', 'committed', 'cancelled')),
  row_count int not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger import_batches_set_updated_at
  before update on public.import_batches
  for each row execute function public.set_updated_at();

create table if not exists public.imported_rows (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  raw jsonb not null default '{}'::jsonb,
  parsed jsonb not null default '{}'::jsonb,
  fingerprint text,
  status text not null default 'new'
    check (status in ('new', 'duplicate', 'invalid', 'imported')),
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists imported_rows_batch_idx
  on public.imported_rows (batch_id, status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.settlements enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.anomaly_alerts enable row level security;
alter table public.import_batches enable row level security;
alter table public.imported_rows enable row level security;

do $$ begin
  create policy settlements_member_all on public.settlements for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy savings_goals_member_all on public.savings_goals for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy savings_contributions_member_all on public.savings_contributions for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shopping_lists_member_all on public.shopping_lists for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shopping_items_member_all on public.shopping_items for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy recurring_payments_member_all on public.recurring_payments for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy anomaly_alerts_member_all on public.anomaly_alerts for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy import_batches_member_all on public.import_batches for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy imported_rows_member_all on public.imported_rows for all to authenticated
    using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.settlements to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.savings_contributions to authenticated;
grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
grant select, insert, update, delete on public.recurring_payments to authenticated;
grant select, insert, update, delete on public.anomaly_alerts to authenticated;
grant select, insert, update, delete on public.import_batches to authenticated;
grant select, insert, update, delete on public.imported_rows to authenticated;

-- Realtime for shopping (run in Supabase dashboard if needed):
-- alter publication supabase_realtime add table public.shopping_items;
