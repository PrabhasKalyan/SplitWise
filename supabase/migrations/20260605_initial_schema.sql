create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('trip', 'home', 'couple', 'other')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  is_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'pending_account_link', 'removed')),
  join_token text not null unique,
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists group_members_unique_email_active_idx
  on public.group_members (group_id, email, status);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  entry_type text not null check (entry_type in ('expense', 'settlement')),
  settlement_scope text check (settlement_scope in ('group', 'global')),
  title text not null,
  description text not null default '',
  expense_date date not null,
  total_amount integer not null check (total_amount >= 0),
  split_method text not null check (split_method in ('equal', 'unequal', 'percentage', 'shares', 'settlement')),
  receipt_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  payer_payload jsonb not null default '[]'::jsonb,
  settlement_payload jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (entry_type = 'expense' and group_id is not null and settlement_scope is null)
    or
    (entry_type = 'settlement' and settlement_scope is not null)
  )
);

create table if not exists public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  owed_amount integer not null check (owed_amount >= 0),
  input_value integer,
  input_type text check (input_type in ('amount', 'percentage', 'share', 'equal')),
  is_included boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_participants_expense_idx on public.expense_participants (expense_id);
create index if not exists expense_participants_group_member_idx on public.expense_participants (group_member_id);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.status <> 'removed'
  );
$$;

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.status <> 'removed'
      and gm.is_admin = true
  );
$$;

create policy "profiles self read" on public.profiles
for select using (auth.uid() = id);

create policy "profiles self upsert" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "groups visible to members" on public.groups
for select using (public.is_group_member(id));

create policy "groups created by authed user" on public.groups
for insert with check (auth.uid() = created_by);

create policy "groups updated by admins" on public.groups
for update using (public.is_group_admin(id)) with check (public.is_group_admin(id));

create policy "group_members visible to members" on public.group_members
for select using (public.is_group_member(group_id));

create policy "group_members inserted by admins" on public.group_members
for insert with check (public.is_group_admin(group_id));

create policy "group_members updated by admins or self-link" on public.group_members
for update using (
  public.is_group_admin(group_id)
  or auth.uid() = user_id
)
with check (
  public.is_group_admin(group_id)
  or auth.uid() = user_id
);

create policy "expenses visible to members or authenticated for global" on public.expenses
for select using (
  (group_id is not null and public.is_group_member(group_id))
  or
  (entry_type = 'settlement' and settlement_scope = 'global' and auth.role() = 'authenticated')
);

create policy "expenses inserted by group members" on public.expenses
for insert with check (
  (entry_type = 'expense' and public.is_group_member(group_id))
  or
  (entry_type = 'settlement' and settlement_scope = 'group' and public.is_group_member(group_id))
  or
  (entry_type = 'settlement' and settlement_scope = 'global' and auth.role() = 'authenticated')
);

create policy "expenses updated by creator or admin" on public.expenses
for update using (
  auth.uid() = created_by
  or (group_id is not null and public.is_group_admin(group_id))
  or (entry_type = 'settlement' and settlement_scope = 'global' and auth.role() = 'authenticated')
)
with check (
  auth.uid() = created_by
  or (group_id is not null and public.is_group_admin(group_id))
  or (entry_type = 'settlement' and settlement_scope = 'global' and auth.role() = 'authenticated')
);

create policy "expense participants visible to group members" on public.expense_participants
for select using (public.is_group_member(group_id));

create policy "expense participants inserted by group members" on public.expense_participants
for insert with check (public.is_group_member(group_id));

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;
