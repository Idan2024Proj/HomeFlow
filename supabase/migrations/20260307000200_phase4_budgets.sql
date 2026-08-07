-- HomeFlow Phase 4: budgets table (read on dashboard; full CRUD in Phase 5)

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  year int not null check (year >= 2000 and year <= 2100),
  month int not null check (month >= 1 and month <= 12),
  amount numeric(12, 2) not null check (amount >= 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (household_id, category_id, year, month)
);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create index if not exists budgets_household_period_idx
  on public.budgets (household_id, year, month);

alter table public.budgets enable row level security;

drop policy if exists budgets_member_all on public.budgets;
create policy budgets_member_all on public.budgets
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

grant select, insert, update, delete on public.budgets to authenticated;
