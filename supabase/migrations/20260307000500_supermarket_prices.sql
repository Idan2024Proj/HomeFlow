-- HomeFlow: supermarket transparency catalog (global, not household-scoped)

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
  product_code text not null unique,
  barcode text,
  name text not null,
  normalized_name text not null default '',
  manufacturer text,
  unit_of_measure text,
  quantity numeric(12, 3),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists supermarket_products_normalized_name_idx
  on public.supermarket_products (normalized_name);

create index if not exists supermarket_products_name_trgm_ready_idx
  on public.supermarket_products (name);

create table if not exists public.latest_store_prices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.supermarket_stores (id) on delete cascade,
  product_id uuid not null references public.supermarket_products (id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  unit_price numeric(12, 2),
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
  source_updated_at timestamptz,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists price_history_store_product_idx
  on public.price_history (store_id, product_id, recorded_at desc);

create table if not exists public.store_import_status (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.supermarket_stores (id) on delete cascade,
  feed_type text not null check (feed_type in ('stores', 'prices', 'promotions')),
  status text not null check (status in ('success', 'failed', 'running')),
  source_file text,
  row_count int not null default 0,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  unique (store_id, feed_type)
);

-- Global catalog: readable by authenticated household members (comparison UI)
alter table public.supermarket_chains enable row level security;
alter table public.supermarket_stores enable row level security;
alter table public.supermarket_products enable row level security;
alter table public.latest_store_prices enable row level security;
alter table public.price_history enable row level security;
alter table public.store_import_status enable row level security;

drop policy if exists supermarket_chains_select_auth on public.supermarket_chains;
create policy supermarket_chains_select_auth on public.supermarket_chains
  for select to authenticated using (true);

drop policy if exists supermarket_stores_select_auth on public.supermarket_stores;
create policy supermarket_stores_select_auth on public.supermarket_stores
  for select to authenticated using (true);

drop policy if exists supermarket_products_select_auth on public.supermarket_products;
create policy supermarket_products_select_auth on public.supermarket_products
  for select to authenticated using (true);

drop policy if exists latest_store_prices_select_auth on public.latest_store_prices;
create policy latest_store_prices_select_auth on public.latest_store_prices
  for select to authenticated using (true);

drop policy if exists price_history_select_auth on public.price_history;
create policy price_history_select_auth on public.price_history
  for select to authenticated using (true);

drop policy if exists store_import_status_select_auth on public.store_import_status;
create policy store_import_status_select_auth on public.store_import_status
  for select to authenticated using (true);

grant select on public.supermarket_chains to authenticated;
grant select on public.supermarket_stores to authenticated;
grant select on public.supermarket_products to authenticated;
grant select on public.latest_store_prices to authenticated;
grant select on public.price_history to authenticated;
grant select on public.store_import_status to authenticated;
