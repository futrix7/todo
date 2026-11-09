-- Idempotent preview data for the account below. Run in the Supabase SQL editor.
do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower('hdmani97@gmail.com')
  limit 1;

  if target_user_id is null then
    raise exception 'No Taskflow account was found for the requested email.';
  end if;

  insert into public.tasks (user_id, id, data)
  select
    target_user_id,
    sample.id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', sample.id,
        'title', sample.title,
        'notes', sample.notes,
        'completed', sample.completed_today,
        'priority', sample.priority,
        'category', sample.category,
        'duration', sample.duration,
        'repeat', sample.repeat,
        'reminder', sample.reminder,
        'streakEnabled', sample.streak_enabled,
        'currentStreak', sample.current_streak,
        'longestStreak', sample.current_streak,
        'lastCompletedOn',
          case when sample.completed_today then current_date else null end,
        'createdAt', current_date - sample.created_days_ago
      )
    )
  from (
    values
      ('preview-morning-walk', 'Morning walk', 'Take a short walk before work.', 'medium', 'Health', 25, 'daily', false, true, true, 5, 14),
      ('preview-focus-session', 'Deep focus session', 'Work on one important task without distractions.', 'high', 'Work', 50, 'weekdays', true, true, true, 3, 10),
      ('preview-read', 'Read for 20 minutes', 'Pick up where you left off.', 'low', 'Personal', 20, 'daily', false, true, false, 0, 8),
      ('preview-meal-plan', 'Plan tomorrow', 'Write down the three most important things.', 'medium', 'Personal', 15, 'daily', true, true, true, 4, 12),
      ('preview-workout', 'Strength workout', 'A quick full-body workout.', 'medium', 'Health', 40, 'weekly', false, false, false, 0, 6)
  ) as sample(
    id, title, notes, priority, category, duration, repeat, reminder,
    streak_enabled, completed_today, current_streak, created_days_ago
  )
  on conflict (user_id, id) do nothing;

  insert into public.task_completions (user_id, task_id, completed_on, completed_at)
  select
    target_user_id,
    sample.task_id,
    current_date - sample.days_ago,
    ((current_date - sample.days_ago) + make_time(sample.hour, 0, 0))::timestamptz
  from (
    values
      ('preview-morning-walk', 0, 8),
      ('preview-morning-walk', 1, 8),
      ('preview-morning-walk', 2, 8),
      ('preview-morning-walk', 3, 8),
      ('preview-morning-walk', 4, 8),
      ('preview-morning-walk', 6, 8),
      ('preview-focus-session', 0, 10),
      ('preview-focus-session', 1, 10),
      ('preview-focus-session', 2, 10),
      ('preview-focus-session', 4, 10),
      ('preview-focus-session', 5, 10),
      ('preview-focus-session', 7, 10),
      ('preview-read', 1, 20),
      ('preview-read', 2, 20),
      ('preview-read', 3, 20),
      ('preview-read', 5, 20),
      ('preview-read', 7, 20),
      ('preview-meal-plan', 0, 19),
      ('preview-meal-plan', 1, 19),
      ('preview-meal-plan', 2, 19),
      ('preview-meal-plan', 3, 19),
      ('preview-meal-plan', 5, 19),
      ('preview-workout', 2, 17),
      ('preview-workout', 5, 17),
      ('preview-workout', 9, 17)
  ) as sample(task_id, days_ago, hour)
  on conflict (user_id, task_id, completed_on) do nothing;

  insert into public.day_entries (user_id, id, data)
  select
    target_user_id,
    sample.id,
    jsonb_build_object(
      'id', sample.id,
      'date', current_date - sample.days_ago,
      'mood', sample.mood,
      'note', sample.note,
      'rating', sample.rating,
      'checkedInAt',
        ((current_date - sample.days_ago) + make_time(sample.hour, 15, 0))::timestamptz
    )
  from (
    values
      ('preview-day-0', 0, 4, 'A steady day with a good focus block.', 'up', 21),
      ('preview-day-1', 1, 3, 'A little busy, but I made progress.', 'up', 20),
      ('preview-day-2', 2, 5, 'Felt great after getting outside.', 'up', 21),
      ('preview-day-3', 3, 2, 'Low energy; an early night helped.', 'down', 22),
      ('preview-day-4', 4, 4, 'Finished the most important task.', 'up', 20),
      ('preview-day-5', 5, 3, 'An ordinary day with a few wins.', 'up', 21),
      ('preview-day-6', 6, 5, 'A relaxing and productive weekend.', 'up', 22)
  ) as sample(id, days_ago, mood, note, rating, hour)
  on conflict (user_id, id) do nothing;
end
$$;
