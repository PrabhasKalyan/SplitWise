
-- Drop the old status-based index
drop index if exists public.group_members_unique_email_active_idx;

-- Create a more robust partial unique index: 
-- (group_id, email) must be unique for all members who aren't 'removed'
create unique index group_members_unique_email_per_group_idx 
  on public.group_members (group_id, email) 
  where (status <> 'removed');
