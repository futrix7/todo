-- Realistic activity seed for the existing hdmani97@gmail.com Supabase Auth user.
-- Run schema.sql and challenge-seed.sql first.
-- The account must already exist and be confirmed in Supabase Auth.

begin;

create temporary table demo_seed_users (
  owner_id uuid not null
) on commit drop;

do $$
declare
  owner_user_id uuid;
begin
  select id
    into owner_user_id
    from auth.users
    where lower(email) = lower('hdmani97@gmail.com');

  if owner_user_id is null then
    raise exception 'Auth user hdmani97@gmail.com not found. Create and confirm this user in Supabase Auth first.';
  end if;

  insert into pg_temp.demo_seed_users (owner_id)
  values (owner_user_id);
end;
$$;

create temporary table demo_seed_accounts on commit drop as
select
  owner_id as user_id,
  md5(owner_id::text || ':demo-work-group')::uuid as work_group_id,
  md5(owner_id::text || ':demo-personal-group')::uuid as personal_group_id
from pg_temp.demo_seed_users;

do $$
declare
  seeded_challenge_count integer;
begin
  select count(*)
    into seeded_challenge_count
    from public.challenge_catalog
    where id in ('meditation', 'deep-work', 'no-spend-month');

  if seeded_challenge_count <> 3 then
    raise exception 'Run supabase/challenge-seed.sql before supabase/demo-seed.sql.';
  end if;
end;
$$;

with group_rows as (
  select work_group_id as id, user_id, 'Work'::text as name, 'work'::text as icon
  from pg_temp.demo_seed_accounts
  union all
  select personal_group_id, user_id, 'Personal', 'home'
  from pg_temp.demo_seed_accounts
)
insert into public.task_groups (id, user_id, name, icon)
select id, user_id, name, icon
from group_rows
where true
on conflict (id) do update
set user_id = excluded.user_id,
    name = excluded.name,
    icon = excluded.icon;

with samples (
  id,
  title,
  notes,
  group_kind,
  priority,
  category,
  repeat,
  due_days_offset,
  start_time,
  end_time,
  duration,
  reminder,
  completed_today,
  created_days_ago,
  current_streak,
  longest_streak
) as (
  values
    (
      'demo-plan-day', 'Plan the day', 'Choose three focused priorities.',
      'personal', 'high', 'Personal', 'daily', null::integer,
      '08:30', '08:50', 20, true, true, 28, 8, 12
    ),
    (
      'demo-read', 'Read 20 pages', 'A little reading every weekday.',
      'personal', 'medium', 'Personal', 'weekdays', null::integer,
      '20:30', '20:50', 20, true, true, 28, 5, 8
    ),
    (
      'demo-weekly-review', 'Review project milestones', 'Check progress and choose next steps.',
      'work', 'medium', 'Work', 'weekly', null::integer,
      '16:00', '16:30', 30, false, true, 28, 3, 6
    ),
    (
      'demo-monthly-budget', 'Review monthly budget', 'Check spending and plan the month.',
      'personal', 'low', 'Money', 'monthly', null::integer,
      '18:00', '18:20', 20, false, false, 0, 0, 0
    ),
    (
      'demo-send-update', 'Send the project update', 'Finish and send the update before its due date.',
      'work', 'high', 'Work', 'none', 2,
      '15:00', '15:20', 20, true, true, 4, 0, 0
    ),
    (
      'demo-pay-bill', 'Pay electricity bill', 'One-time task with a due date.',
      'personal', 'high', 'Home', 'none', 2,
      null::text, null::text, null::integer, true, false, 5, 0, 0
    )
),
task_rows as (
  select
    account.user_id,
    sample.id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', sample.id,
        'title', sample.title,
        'notes', sample.notes,
        'groupId', case
          when sample.group_kind = 'work' then account.work_group_id::text
          else account.personal_group_id::text
        end,
        'completed', (
          sample.completed_today
          and (
            sample.repeat <> 'weekdays'
            or extract(isodow from current_date) between 1 and 5
          )
        ),
        'priority', sample.priority,
        'category', sample.category,
        'dueDate', case
          when sample.due_days_offset is not null
            then (current_date + sample.due_days_offset)::text
          else null
        end,
        'startTime', sample.start_time,
        'endTime', sample.end_time,
        'duration', sample.duration,
        'repeat', sample.repeat,
        'reminder', sample.reminder,
        'streakEnabled', sample.repeat <> 'none',
        'currentStreak', sample.current_streak,
        'longestStreak', sample.longest_streak,
        'lastCompletedOn', case
          when sample.completed_today
            and (
              sample.repeat <> 'weekdays'
              or extract(isodow from current_date) between 1 and 5
            )
            then current_date::text
          else null
        end,
        'createdAt', (current_date - sample.created_days_ago)::text
      )
    ) as data
  from pg_temp.demo_seed_accounts as account
  cross join samples as sample
)
insert into public.tasks (user_id, id, data, updated_at)
select user_id, id, data, now()
from task_rows
where true
on conflict (user_id, id) do update
set data = excluded.data,
    updated_at = excluded.updated_at;

with completion_rows as (
  select
    account.user_id,
    'demo-plan-day'::text as task_id,
    day::date as completed_on
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 13,
    current_date,
    interval '1 day'
  ) as days(day)
  union all
  select
    account.user_id,
    'demo-read'::text,
    day::date
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 13,
    current_date,
    interval '1 day'
  ) as days(day)
  where extract(isodow from day) between 1 and 5
  union all
  select
    account.user_id,
    'demo-weekly-review'::text,
    day::date
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 28,
    current_date,
    interval '1 day'
  ) as days(day)
  where extract(isodow from day) = extract(isodow from current_date)
  union all
  select
    account.user_id,
    'demo-send-update'::text,
    current_date
  from pg_temp.demo_seed_accounts as account
)
insert into public.task_completions
  (user_id, task_id, completed_on, completed_at)
select
  user_id,
  task_id,
  completed_on,
  (completed_on + time '18:00') at time zone 'UTC'
from completion_rows
on conflict (user_id, task_id, completed_on) do update
set completed_at = excluded.completed_at;

with mood_days as (
  select
    account.user_id,
    day::date as mood_date,
    (extract(doy from day)::integer % 5) + 1 as mood
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 13,
    current_date,
    interval '1 day'
  ) as days(day)
)
insert into public.day_entries (user_id, id, data, created_at, updated_at)
select
  user_id,
  'd-' || to_char(mood_date, 'YYYY-MM-DD'),
  jsonb_build_object(
    'id', 'd-' || to_char(mood_date, 'YYYY-MM-DD'),
    'date', to_char(mood_date, 'YYYY-MM-DD'),
    'mood', mood,
    'note', case
      when mood <= 2 then 'Work felt overwhelming today, so I am taking things one step at a time.'
      when mood = 3 then 'A steady day with a few small wins.'
      else 'I felt focused and made time for what matters.'
    end,
    'rating', mood,
    'checkedInAt', (mood_date + time '19:30') at time zone 'UTC'
  ),
  (mood_date + time '19:30') at time zone 'UTC',
  (mood_date + time '19:30') at time zone 'UTC'
from mood_days
where true
on conflict (user_id, id) do update
set data = excluded.data,
    updated_at = excluded.updated_at;

with samples (
  id,
  name,
  emoji,
  notes,
  category,
  habit_type,
  frequency,
  schedule_days,
  started_on,
  start_time,
  target_value,
  unit,
  color,
  archived
) as (
  values
    (
      'demo-meditate', 'Morning meditation', '🧘',
      'Take a few quiet minutes to start the day.', 'Mind',
      'yes_no', 'daily', array[]::smallint[], current_date - 30,
      '07:30', 1, '', 'teal', false
    ),
    (
      'demo-water', 'Drink water', '💧',
      'Work toward a steady hydration routine.', 'Health',
      'count', 'daily', array[]::smallint[], current_date - 30,
      null::text, 8, 'glasses', 'blue', false
    ),
    (
      'demo-journal', 'Journal for 15 minutes', '📓',
      'Write down a reflection or a plan.', 'Mind',
      'measure', 'weekdays', array[]::smallint[], current_date - 30,
      '20:30', 15, 'min', 'violet', false
    ),
    (
      'demo-screen-free', 'Screen-free evening', '📵',
      'Keep the last part of the evening screen-free.', 'Personal',
      'quit', 'custom',
      array[extract(dow from current_date)::smallint],
      current_date - 30, '21:30', 1, '', 'rose', false
    ),
    (
      'demo-budget-review', 'Monthly budget review', '💵',
      'Review spending and set a simple plan.', 'Money',
      'yes_no', 'monthly', array[]::smallint[], current_date,
      '18:00', 1, '', 'amber', false
    ),
    (
      'demo-archived-stretch', 'Afternoon stretch', '🌿',
      'I moved stretching into my evening wind-down.', 'Health',
      'yes_no', 'custom', array[0, 1, 2, 3, 4, 5, 6]::smallint[],
      current_date - 30, null::text, 1, '', 'gray', true
    )
)
insert into public.habits (
  user_id,
  id,
  name,
  emoji,
  notes,
  category,
  habit_type,
  frequency,
  schedule_days,
  started_on,
  end_on,
  start_time,
  target_value,
  unit,
  color,
  archived,
  updated_at
)
select
  account.user_id,
  sample.id,
  sample.name,
  sample.emoji,
  sample.notes,
  sample.category,
  sample.habit_type,
  sample.frequency,
  sample.schedule_days,
  sample.started_on,
  null,
  sample.start_time,
  sample.target_value,
  sample.unit,
  sample.color,
  sample.archived,
  now()
from pg_temp.demo_seed_accounts as account
cross join samples as sample
where true
on conflict (user_id, id) do update
set name = excluded.name,
    emoji = excluded.emoji,
    notes = excluded.notes,
    category = excluded.category,
    habit_type = excluded.habit_type,
    frequency = excluded.frequency,
    schedule_days = excluded.schedule_days,
    started_on = excluded.started_on,
    end_on = excluded.end_on,
    start_time = excluded.start_time,
    target_value = excluded.target_value,
    unit = excluded.unit,
    color = excluded.color,
    archived = excluded.archived,
    updated_at = excluded.updated_at;

with habit_logs as (
  select
    account.user_id,
    'demo-meditate'::text as habit_id,
    day::date as completed_on,
    case
      when day::date = current_date
        or day::date = current_date - 5 then 0
      else 1
    end::numeric as value,
    case
      when day::date = current_date then 'in_progress'
      when day::date = current_date - 5 then 'skipped'
      else 'completed'
    end as status,
    (day::date + time '07:45') at time zone 'UTC' as logged_at
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 13,
    current_date,
    interval '1 day'
  ) as days(day)
  union all
  select
    account.user_id,
    'demo-water',
    day::date,
    case
      when day::date = current_date then 5
      when (current_date - day::date) % 5 = 0 then 0
      else 8
    end::numeric,
    case
      when day::date = current_date then 'in_progress'
      when (current_date - day::date) % 5 = 0 then 'skipped'
      else 'completed'
    end,
    (day::date + time '20:00') at time zone 'UTC'
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 13,
    current_date,
    interval '1 day'
  ) as days(day)
  union all
  select
    account.user_id,
    'demo-journal',
    day::date,
    case when day::date = current_date then 5 else 15 end::numeric,
    case
      when day::date = current_date then 'in_progress'
      when (current_date - day::date) % 7 = 0 then 'skipped'
      else 'completed'
    end,
    (day::date + time '20:45') at time zone 'UTC'
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 13,
    current_date,
    interval '1 day'
  ) as days(day)
  where extract(isodow from day) between 1 and 5
  union all
  select
    account.user_id,
    'demo-screen-free',
    day::date,
    case when day::date = current_date - 7 then 0 else 1 end::numeric,
    case when day::date = current_date - 7 then 'skipped' else 'completed' end,
    (day::date + time '21:30') at time zone 'UTC'
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 28,
    current_date,
    interval '1 day'
  ) as days(day)
  where extract(dow from day) = extract(dow from current_date)
  union all
  select
    account.user_id,
    'demo-budget-review',
    current_date,
    0::numeric,
    'in_progress',
    (current_date + time '18:00') at time zone 'UTC'
  from pg_temp.demo_seed_accounts as account
  union all
  select
    account.user_id,
    'demo-archived-stretch',
    day::date,
    1::numeric,
    'completed',
    (day::date + time '15:00') at time zone 'UTC'
  from pg_temp.demo_seed_accounts as account
  cross join generate_series(
    current_date - 7,
    current_date - 1,
    interval '1 day'
  ) as days(day)
)
insert into public.habit_logs
  (user_id, habit_id, completed_on, value, status, logged_at)
select user_id, habit_id, completed_on, value, status, logged_at
from habit_logs
where true
on conflict (user_id, habit_id, completed_on) do update
set value = excluded.value,
    status = excluded.status,
    logged_at = excluded.logged_at;

insert into public.challenge_catalog (
  id,
  name,
  category,
  target_days,
  description,
  is_active,
  creator_id
)
select
  'demo-14-day-focus',
  '14-Day Focus Routine',
  'Productivity',
  14,
  'Complete one focused work session each day for two weeks.',
  true,
  owner_id
from pg_temp.demo_seed_users
where true
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    target_days = excluded.target_days,
    description = excluded.description,
    is_active = excluded.is_active,
    creator_id = excluded.creator_id;

with sample_participants (challenge_id, user_id, joined_on) as (
  select 'meditation', owner_id, current_date - 20
  from pg_temp.demo_seed_users
  union all
  select 'deep-work', owner_id, current_date - 14
  from pg_temp.demo_seed_users
  union all
  select 'no-spend-month', owner_id, current_date - 10
  from pg_temp.demo_seed_users
  union all
  select 'demo-14-day-focus', owner_id, current_date - 4
  from pg_temp.demo_seed_users
)
insert into public.challenge_participants (challenge_id, user_id, joined_on)
select challenge_id, user_id, joined_on
from sample_participants
where true
on conflict (challenge_id, user_id) do update
set joined_on = excluded.joined_on;

insert into public.challenge_checkins (challenge_id, user_id, completed_on)
select
  participant.challenge_id,
  participant.user_id,
  day::date
from public.challenge_participants as participant
join pg_temp.demo_seed_accounts as account
  on account.user_id = participant.user_id
cross join lateral generate_series(
  greatest(participant.joined_on, current_date - 6)::timestamp,
  current_date::timestamp,
  interval '1 day'
) as days(day)
where participant.challenge_id in (
  'meditation', 'deep-work', 'no-spend-month', 'demo-14-day-focus'
)
on conflict (challenge_id, user_id, completed_on) do nothing;

-- The app creates one daily task for each joined challenge.
insert into public.tasks (user_id, id, data, updated_at)
select
  participant.user_id,
  'challenge-' || challenge.id,
  jsonb_build_object(
    'id', 'challenge-' || challenge.id,
    'title', case
      when challenge.id = 'cold-showers' then 'Cold shower'
      else challenge.name
    end,
    'notes', 'Record your daily progress for ' || challenge.name || '.',
    'completed', false,
    'priority', 'medium',
    'category', 'Challenge',
    'repeat', 'daily',
    'reminder', false,
    'streakEnabled', true,
    'currentStreak', 0,
    'longestStreak', 0,
    'createdAt', participant.joined_on::text
  ),
  now()
from public.challenge_participants as participant
join public.challenge_catalog as challenge
  on challenge.id = participant.challenge_id
join pg_temp.demo_seed_accounts as account
  on account.user_id = participant.user_id
where participant.challenge_id in (
  'meditation', 'deep-work', 'no-spend-month', 'demo-14-day-focus'
)
on conflict (user_id, id) do nothing;

insert into public.task_completions
  (user_id, task_id, completed_on, completed_at)
select
  checkin.user_id,
  'challenge-' || checkin.challenge_id,
  checkin.completed_on,
  checkin.created_at
from public.challenge_checkins as checkin
join pg_temp.demo_seed_accounts as account
  on account.user_id = checkin.user_id
where checkin.challenge_id in (
  'meditation', 'deep-work', 'no-spend-month', 'demo-14-day-focus'
)
on conflict (user_id, task_id, completed_on) do update
set completed_at = excluded.completed_at;

notify pgrst, 'reload schema';
commit;
