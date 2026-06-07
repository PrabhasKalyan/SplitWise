
-- Relax profiles read policy so group members can see each other's names
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles searchable by authenticated" on public.profiles;
create policy "profiles searchable by authenticated" on public.profiles
for select using (auth.role() = 'authenticated');

-- Fix the chicken-and-egg problem for group creation
-- Allow anyone to insert a membership record if they are the one adding it.
drop policy if exists "group_members inserted by admins" on public.group_members;
drop policy if exists "group_members_insert_policy" on public.group_members;
create policy "group_members_insert_policy" on public.group_members
for insert with check (auth.uid() = added_by);

-- Ensure creators can always see the groups they just created even before membership is processed
drop policy if exists "groups visible to members" on public.groups;
drop policy if exists "groups_select_policy" on public.groups;
create policy "groups_select_policy" on public.groups
for select using (
  auth.uid() = created_by 
  or id in (
    select group_id 
    from public.group_members 
    where user_id = auth.uid() 
      and status <> 'removed'
  )
);
