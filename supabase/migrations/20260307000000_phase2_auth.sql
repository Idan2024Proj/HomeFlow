-- HomeFlow Phase 2: Auth foundation
-- profiles, households, household_members, activity_logs, app_settings + RLS

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  preferred_locale text not null default 'he',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ILS',
  timezone text not null default 'Asia/Jerusalem',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- household_members
-- ---------------------------------------------------------------------------
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  role text not null check (role in ('owner', 'member')),
  display_name text not null default '',
  invite_email text,
  status text not null default 'invited'
    check (status in ('active', 'invited', 'removed')),
  invited_by uuid references public.profiles (id),
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint household_members_user_or_invite check (
    user_id is not null or invite_email is not null
  )
);

create unique index household_members_household_user_uidx
  on public.household_members (household_id, user_id)
  where user_id is not null and status <> 'removed';

create unique index household_members_household_invite_email_uidx
  on public.household_members (household_id, lower(invite_email))
  where invite_email is not null and status = 'invited';

create index household_members_user_id_idx
  on public.household_members (user_id)
  where user_id is not null;

create index household_members_invite_email_idx
  on public.household_members (lower(invite_email))
  where invite_email is not null;

create trigger household_members_set_updated_at
  before update on public.household_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index activity_logs_household_created_idx
  on public.activity_logs (household_id, created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (household_id, key)
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helpers (security definer — bypass RLS safely)
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = hid
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = hid
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'owner'
  );
$$;

create or replace function public.share_household_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members them
      on them.household_id = me.household_id
    where me.user_id = auth.uid()
      and me.status = 'active'
      and them.user_id = target_user_id
      and them.status = 'active'
  );
$$;

create or replace function public.has_pending_invite(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members m
    where m.status = 'invited'
      and m.invite_email is not null
      and lower(m.invite_email) = lower(check_email)
  );
$$;

create or replace function public.household_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.households;
$$;

-- Accept invites matching the signed-in user's email
create or replace function public.accept_my_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  accepted integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  select email into user_email from public.profiles where id = uid;
  if user_email is null then
    select email into user_email from auth.users where id = uid;
  end if;

  if user_email is null then
    return 0;
  end if;

  update public.household_members m
  set
    user_id = uid,
    status = 'active',
    joined_at = timezone('utc', now()),
    display_name = case
      when coalesce(m.display_name, '') = '' then split_part(user_email, '@', 1)
      else m.display_name
    end,
    updated_at = timezone('utc', now())
  where m.status = 'invited'
    and m.invite_email is not null
    and lower(m.invite_email) = lower(user_email)
    and (m.user_id is null or m.user_id = uid);

  get diagnostics accepted = row_count;
  return accepted;
end;
$$;

-- Atomic owner bootstrap (avoids RLS chicken-and-egg on insert+select)
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

  return created;
end;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.activity_logs enable row level security;
alter table public.app_settings enable row level security;

-- profiles
create policy profiles_select_own_or_shared
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.share_household_with(id));

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- households
create policy households_select_member
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

create policy households_insert_authenticated
  on public.households for insert
  to authenticated
  with check (created_by = auth.uid());

create policy households_update_owner
  on public.households for update
  to authenticated
  using (public.is_household_owner(id))
  with check (public.is_household_owner(id));

-- household_members
create policy members_select_same_household
  on public.household_members for select
  to authenticated
  using (
    public.is_household_member(household_id)
    or (status = 'invited' and invite_email is not null and lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );

create policy members_insert_owner_or_self_owner_bootstrap
  on public.household_members for insert
  to authenticated
  with check (
    (
      public.is_household_owner(household_id)
      and role in ('owner', 'member')
    )
    or (
      user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
    )
  );

create policy members_update_owner
  on public.household_members for update
  to authenticated
  using (public.is_household_owner(household_id) or user_id = auth.uid())
  with check (public.is_household_owner(household_id) or user_id = auth.uid());

create policy members_delete_owner
  on public.household_members for delete
  to authenticated
  using (public.is_household_owner(household_id));

-- activity_logs
create policy activity_logs_select_member
  on public.activity_logs for select
  to authenticated
  using (public.is_household_member(household_id));

create policy activity_logs_insert_member
  on public.activity_logs for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and actor_id = auth.uid()
  );

-- app_settings
create policy app_settings_select_member
  on public.app_settings for select
  to authenticated
  using (public.is_household_member(household_id));

create policy app_settings_write_owner
  on public.app_settings for all
  to authenticated
  using (public.is_household_owner(household_id))
  with check (public.is_household_owner(household_id));

-- Grants
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.households to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.share_household_with(uuid) to authenticated;
grant execute on function public.accept_my_invites() to authenticated;
grant execute on function public.create_household_as_owner(text, text) to authenticated;

-- Needed before login to gate invite-only signup / magic-link user creation
grant execute on function public.has_pending_invite(text) to anon, authenticated;
grant execute on function public.household_count() to anon, authenticated;
