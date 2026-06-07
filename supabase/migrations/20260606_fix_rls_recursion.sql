
-- Security definer function to bypass RLS for membership checks
create or replace function public.get_user_groups()
returns table (group_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select gm.group_id 
  from public.group_members gm
  where gm.user_id = auth.uid() 
    and gm.status <> 'removed';
$$;

-- Drop old policies
drop policy if exists "groups_select_policy" on public.groups;
drop policy if exists "group_members_select_policy" on public.group_members;
drop policy if exists "expenses_select_policy" on public.expenses;
drop policy if exists "expense_participants_select_policy" on public.expense_participants;
drop policy if exists "groups visible to members" on public.groups;
drop policy if exists "group_members visible to members" on public.group_members;
drop policy if exists "expenses visible to members or authenticated for global" on public.expenses;
drop policy if exists "expense participants visible to group members" on public.expense_participants;

-- Non-recursive select policies
create policy "groups_select_policy" on public.groups
for select using (
  id in (select public.get_user_groups())
);

create policy "group_members_select_policy" on public.group_members
for select using (
  group_id in (select public.get_user_groups())
);

create policy "expenses_select_policy" on public.expenses
for select using (
  (group_id in (select public.get_user_groups()))
  or
  (entry_type = 'settlement' and settlement_scope = 'global' and auth.role() = 'authenticated')
);

create policy "expense_participants_select_policy" on public.expense_participants
for select using (
  group_id in (select public.get_user_groups())
);
