-- Taskflow challenge catalog data.
-- Run supabase/schema.sql first. This file only seeds challenge content.

begin;

insert into public.challenge_catalog
  (id, name, category, target_days, description, is_active)
values
  ('75-hard', '75 Hard', 'Fitness', 75,
    'Build consistency by showing up for your chosen daily routine.', true),
  ('30-days-consistent', '30 Days Consistent', 'Fitness', 30,
    'A gentler, flexible alternative: move your body every day.', true),
  ('10k-steps', '10K steps daily', 'Fitness', 30,
    'Get your steps in each day for 30 days.', true),
  ('100-pushups', '100 pushups a day', 'Fitness', 30,
    'Break them into manageable sets that work for you.', true),
  ('morning-workout', 'Morning workout', 'Fitness', 30,
    'Start the day with movement for 30 days.', true),
  ('no-junk-food', 'No junk food', 'Fitness', 30,
    'Make the food choices that support your own goals.', true),
  ('no-sugar', 'No sugar', 'Fitness', 30,
    'Define what counts for you and make a fresh choice each day.', true),
  ('meditation', 'Meditation, 10 min daily', 'Mind', 30,
    'Make a little quiet space for yourself each day.', true),
  ('daily-journaling', 'Journaling every day', 'Mind', 30,
    'Reflect, plan, or write whatever is on your mind.', true),
  ('read-20-pages', 'Read 20 pages daily', 'Mind', 30,
    'Spend a little time with a book each day.', true),
  ('no-social-media', 'No social media', 'Mind', 30,
    'Take a 30-day break from social media.', true),
  ('social-media-hour-cap', 'Social media: 1-hour cap', 'Mind', 30,
    'Set a daily limit that leaves more room for what matters.', true),
  ('morning-digital-detox', 'Digital detox: first hour', 'Mind', 30,
    'Give yourself a screen-free start to the day.', true),
  ('no-smoking', 'No smoking', 'Discipline', 30,
    'A private, self-reported 30-day personal commitment.', true),
  ('no-alcohol', 'No alcohol', 'Discipline', 30,
    'A private, self-reported 30-day personal commitment.', true),
  ('no-vaping', 'No vaping', 'Discipline', 30,
    'A private, self-reported 30-day personal commitment.', true),
  ('no-gaming', 'No gaming', 'Discipline', 30,
    'Take a 30-day break from gaming.', true),
  ('no-short-form-video', 'No short-form videos', 'Discipline', 30,
    'Make room for more intentional screen time.', true),
  ('cold-showers', 'Cold showers', 'Discipline', 30,
    'Start at a level that feels safe and manageable for you.', true),
  ('wake-at-5', 'Wake up at 5 AM', 'Discipline', 30,
    'Keep a consistent early start while getting enough rest.', true),
  ('100-days-of-code', '100 Days of Code', 'Productivity', 100,
    'Practice coding every day and track your 100-day journey.', true),
  ('deep-work', 'Deep work: 2 hours daily', 'Productivity', 30,
    'Protect time for meaningful, distraction-free work.', true),
  ('learn-a-language', 'Learn a language, 15 min daily', 'Productivity', 30,
    'Small daily practice adds up over time.', true),
  ('plan-tomorrow', 'Plan tomorrow tonight', 'Productivity', 21,
    'End the day with a clear, manageable plan.', true),
  ('inbox-zero', 'Inbox zero', 'Productivity', 30,
    'Build a daily habit of processing messages intentionally.', true),
  ('no-procrastination', 'No procrastination', 'Productivity', 30,
    'Take one meaningful first step on a task each day.', true),
  ('no-spend-month', 'No-spend month', 'Money', 30,
    'Choose your own essentials before the challenge begins.', true),
  ('save-daily', 'Save a fixed amount daily', 'Money', 30,
    'Pick an amount that works for your budget and save it daily.', true),
  ('track-expenses', 'Track every expense', 'Money', 30,
    'Build awareness by tracking every expense for 30 days.', true)
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    target_days = excluded.target_days,
    description = excluded.description,
    is_active = excluded.is_active;

update public.challenge_catalog
set is_active = false
where id in ('nofap', 'no-porn');

-- Repair a missing generated task for users who already joined a challenge.
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
    'notes', 'Daily task for the ' || challenge.name || ' challenge.',
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
where challenge.is_active
on conflict (user_id, id) do nothing;

notify pgrst, 'reload schema';
commit;
