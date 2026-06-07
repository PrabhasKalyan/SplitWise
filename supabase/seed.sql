insert into public.profiles (id, email, full_name, avatar_url)
values
  ('11111111-1111-1111-1111-111111111111', 'ava@example.com', 'Ava Sharma', null),
  ('22222222-2222-2222-2222-222222222222', 'neel@example.com', 'Neel Rao', null),
  ('33333333-3333-3333-3333-333333333333', 'tara@example.com', 'Tara Mehta', null)
on conflict (id) do nothing;

insert into public.groups (id, name, type, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Goa Escape', 'trip', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Flat 3B', 'home', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.group_members (id, group_id, user_id, name, email, is_admin, status, join_token, added_by)
values
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ava Sharma', 'ava@example.com', true, 'active', 'join-goa-ava', '11111111-1111-1111-1111-111111111111'),
  ('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Neel Rao', 'neel@example.com', false, 'active', 'join-goa-neel', '11111111-1111-1111-1111-111111111111'),
  ('aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Tara Mehta', 'tara@example.com', false, 'pending_account_link', 'join-goa-tara', '11111111-1111-1111-1111-111111111111'),
  ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Neel Rao', 'neel@example.com', true, 'active', 'join-home-neel', '22222222-2222-2222-2222-222222222222'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Tara Mehta', 'tara@example.com', false, 'active', 'join-home-tara', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.expenses (
  id,
  group_id,
  entry_type,
  settlement_scope,
  title,
  description,
  expense_date,
  total_amount,
  split_method,
  receipt_url,
  created_by,
  payer_payload,
  settlement_payload,
  is_deleted
)
values
  (
    'eeee1111-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'expense',
    null,
    'Beach villa',
    'Three-night stay for the Goa trip',
    current_date - interval '4 day',
    9000,
    'equal',
    null,
    '11111111-1111-1111-1111-111111111111',
    '[{"groupMemberId":"aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa","amount":9000}]'::jsonb,
    null,
    false
  ),
  (
    'eeee2222-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'expense',
    null,
    'Scooter rental',
    'Split by percentage',
    current_date - interval '3 day',
    1500,
    'percentage',
    null,
    '22222222-2222-2222-2222-222222222222',
    '[{"groupMemberId":"aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa","amount":1500}]'::jsonb,
    null,
    false
  ),
  (
    'eeee3333-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'settlement',
    'group',
    'Trip settle-up',
    'Partial payment back to Ava',
    current_date - interval '1 day',
    1000,
    'settlement',
    null,
    '22222222-2222-2222-2222-222222222222',
    '[]'::jsonb,
    '[{"fromGroupMemberId":"aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa","toGroupMemberId":"aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa","amount":1000}]'::jsonb,
    false
  )
on conflict (id) do nothing;

insert into public.expense_participants (
  id,
  expense_id,
  group_id,
  group_member_id,
  owed_amount,
  input_value,
  input_type,
  is_included
)
values
  ('ffff1111-ffff-ffff-ffff-ffffffffffff', 'eeee1111-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3000, null, 'equal', true),
  ('f0002222-f000-f000-f000-f000f000f000', 'eeee1111-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3000, null, 'equal', true),
  ('f0003333-f000-f000-f000-f000f000f000', 'eeee1111-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3000, null, 'equal', true),
  ('f0004444-f000-f000-f000-f000f000f000', 'eeee2222-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 750, 50, 'percentage', true),
  ('f0005555-f000-f000-f000-f000f000f000', 'eeee2222-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 450, 30, 'percentage', true),
  ('f0006666-f000-f000-f000-f000f000f000', 'eeee2222-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 300, 20, 'percentage', true)
on conflict (id) do nothing;
