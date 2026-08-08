-- HomeFlow: supermarket price transparency (global catalog, not household-scoped)

create table if not exists public.supermarket_chains (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  provider text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.supermarket_stores (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.supermarket_chains (id) on delete cascade,
  external_id text not null,
  sub_chain_external_id text,
  name text,
  address text,
  city text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (chain_id, external_id)
);

create index if not exists supermarket_stores_city_idx
  on public.supermarket_stores (city);

create table if not exists public.supermarket_products (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.supermarket_chains (id) on delete cascade,
  product_code text not null,
  barcode text,
  name text not null,
  manufacturer text,
  manufacturer_item_description text,
  unit_of_measure text,
  quantity numeric(12, 3),
  normalized_name text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (chain_id, product_code)
);

create index if not exists supermarket_products_normalized_name_idx
  on public.supermarket_products (normalized_name);

create index if not exists supermarket_products_barcode_idx
  on public.supermarket_products (barcode)
  where barcode is not null;

create table if not exists public.latest_store_prices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.supermarket_stores (id) on delete cascade,
  product_id uuid not null references public.supermarket_products (id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  unit_price numeric(12, 4),
  allow_discount boolean,
  source_updated_at timestamptz,
  imported_at timestamptz not null default timezone('utc', now()),
  unique (store_id, product_id)
);

create index if not exists latest_store_prices_product_idx
  on public.latest_store_prices (product_id);

create index if not exists latest_store_prices_store_product_idx
  on public.latest_store_prices (store_id, product_id);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.supermarket_stores (id) on delete cascade,
  product_id uuid not null references public.supermarket_products (id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  unit_price numeric(12, 4),
  source_updated_at timestamptz,
  imported_at timestamptz not null default timezone('utc', now())
);

create index if not exists price_history_store_product_idx
  on public.price_history (store_id, product_id, imported_at desc);

create table if not exists public.store_import_status (
  store_id uuid primary key references public.supermarket_stores (id) on delete cascade,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_status text not null default 'never'
    check (last_status in ('never', 'success', 'failed', 'suspicious')),
  last_error text,
  last_item_count int,
  last_source_file text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.supermarket_promotions (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.supermarket_chains (id) on delete cascade,
  store_id uuid references public.supermarket_stores (id) on delete cascade,
  external_promotion_id text not null,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  min_quantity numeric(12, 3),
  promotional_price numeric(12, 2),
  club_only boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (chain_id, store_id, external_promotion_id)
);

create table if not exists public.supermarket_promotion_products (
  promotion_id uuid not null references public.supermarket_promotions (id) on delete cascade,
  product_code text not null,
  primary key (promotion_id, product_code)
);

-- Triggers
create trigger supermarket_chains_set_updated_at
  before update on public.supermarket_chains
  for each row execute function public.set_updated_at();

create trigger supermarket_stores_set_updated_at
  before update on public.supermarket_stores
  for each row execute function public.set_updated_at();

create trigger supermarket_products_set_updated_at
  before update on public.supermarket_products
  for each row execute function public.set_updated_at();

create trigger supermarket_promotions_set_updated_at
  before update on public.supermarket_promotions
  for each row execute function public.set_updated_at();

create trigger store_import_status_set_updated_at
  before update on public.store_import_status
  for each row execute function public.set_updated_at();

-- RLS: global catalog readable by authenticated members; writes via service role only
alter table public.supermarket_chains enable row level security;
alter table public.supermarket_stores enable row level security;
alter table public.supermarket_products enable row level security;
alter table public.latest_store_prices enable row level security;
alter table public.price_history enable row level security;
alter table public.store_import_status enable row level security;
alter table public.supermarket_promotions enable row level security;
alter table public.supermarket_promotion_products enable row level security;

drop policy if exists supermarket_chains_select on public.supermarket_chains;
create policy supermarket_chains_select on public.supermarket_chains
  for select to authenticated using (true);

drop policy if exists supermarket_stores_select on public.supermarket_stores;
create policy supermarket_stores_select on public.supermarket_stores
  for select to authenticated using (true);

drop policy if exists supermarket_products_select on public.supermarket_products;
create policy supermarket_products_select on public.supermarket_products
  for select to authenticated using (true);

drop policy if exists latest_store_prices_select on public.latest_store_prices;
create policy latest_store_prices_select on public.latest_store_prices
  for select to authenticated using (true);

drop policy if exists price_history_select on public.price_history;
create policy price_history_select on public.price_history
  for select to authenticated using (true);

drop policy if exists store_import_status_select on public.store_import_status;
create policy store_import_status_select on public.store_import_status
  for select to authenticated using (true);

drop policy if exists supermarket_promotions_select on public.supermarket_promotions;
create policy supermarket_promotions_select on public.supermarket_promotions
  for select to authenticated using (true);

drop policy if exists supermarket_promotion_products_select on public.supermarket_promotion_products;
create policy supermarket_promotion_products_select on public.supermarket_promotion_products
  for select to authenticated using (true);

grant select on public.supermarket_chains to authenticated;
grant select on public.supermarket_stores to authenticated;
grant select on public.supermarket_products to authenticated;
grant select on public.latest_store_prices to authenticated;
grant select on public.price_history to authenticated;
grant select on public.store_import_status to authenticated;
grant select on public.supermarket_promotions to authenticated;
grant select on public.supermarket_promotion_products to authenticated;
