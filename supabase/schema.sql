-- Taskflow database schema for Supabase.
-- Safe to re-run: tables, policies, triggers, and functions are recreated in place.

begin;

-- Tasks, completion history, and daily check-ins.
create table if not exists public.tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.tasks enable row level security;
drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
  on public.tasks for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.task_completions (
  user_id uuid not null,
  task_id text not null,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id, completed_on),
  foreign key (user_id, task_id)
    references public.tasks (user_id, id) on delete cascade
);

alter table public.task_completions enable row level security;
drop policy if exists "Users can read their own task completions"
  on public.task_completions;
create policy "Users can read their own task completions"
  on public.task_completions for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can record their own task completions"
  on public.task_completions;
create policy "Users can record their own task completions"
  on public.task_completions for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own task completions"
  on public.task_completions;
create policy "Users can update their own task completions"
  on public.task_completions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own task completions"
  on public.task_completions;
create policy "Users can delete their own task completions"
  on public.task_completions for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.day_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.day_entries enable row level security;
drop policy if exists "Users can read their own day entries"
  on public.day_entries;
create policy "Users can read their own day entries"
  on public.day_entries for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can create their own day entries"
  on public.day_entries;
create policy "Users can create their own day entries"
  on public.day_entries for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own day entries"
  on public.day_entries;
create policy "Users can update their own day entries"
  on public.day_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own day entries"
  on public.day_entries;
create policy "Users can delete their own day entries"
  on public.day_entries for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.tasks, public.task_completions, public.day_entries
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.tasks, public.task_completions, public.day_entries to authenticated;

-- Public profile data and friend relationships.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text not null unique,
  bio text not null default '',
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_on date,
  created_at timestamptz not null default now()
);
alter table public.profiles
  add column if not exists username_locked boolean not null default false;
create unique index if not exists profiles_username_case_insensitive_unique
  on public.profiles (lower(username));

alter table public.profiles enable row level security;
drop policy if exists "Authenticated users can view profiles"
  on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select to authenticated
  using (auth.uid() is not null);
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.claim_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  requested_username text := lower(btrim(p_username));
  existing_username text;
  is_locked boolean;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if requested_username is null
    or requested_username !~ '^[a-z0-9_]{3,20}$'
  then
    raise exception using
      errcode = '22023',
      message = 'username_invalid',
      detail = 'Usernames must be 3-20 characters using lowercase letters, numbers, or underscores.';
  end if;

  select username, username_locked
    into existing_username, is_locked
    from public.profiles
    where user_id = current_user_id
    for update;
  if not found then
    raise exception using errcode = '23503', message = 'profile_not_found';
  end if;

  if is_locked then
    if existing_username = requested_username then
      return existing_username;
    end if;
    raise exception using errcode = '22023', message = 'username_permanent';
  end if;

  update public.profiles
    set username = requested_username,
        username_locked = true
    where user_id = current_user_id;

  return requested_username;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'username_taken';
end;
$$;
revoke all on function public.claim_my_username(text)
  from public, anon, authenticated;
grant execute on function public.claim_my_username(text) to authenticated;

create or replace function public.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_name text;
  profile_slug text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Taskflow user'
  );
  profile_slug := btrim(
    regexp_replace(lower(profile_name), '[^a-z0-9]+', '-', 'g'),
    '-'
  );

  insert into public.profiles (user_id, display_name, username, bio)
  values (
    new.id,
    profile_name,
    coalesce(nullif(profile_slug, ''), 'user') || '-' || substr(new.id::text, 1, 6),
    coalesce(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      bio = excluded.bio;

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sync_auth_profile();

insert into public.profiles (user_id, display_name, username, bio)
select
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Taskflow user'
  ),
  coalesce(
    nullif(
      btrim(
        regexp_replace(
          lower(
            coalesce(
              nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
              nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
              'user'
            )
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '-'
      ),
      ''
    ),
    'user'
  ) || '-' || substr(users.id::text, 1, 6),
  coalesce(users.raw_user_meta_data ->> 'bio', '')
from auth.users as users
on conflict (user_id) do nothing;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create unique index if not exists friend_requests_one_active_per_pair
  on public.friend_requests (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  )
  where status in ('pending', 'accepted');
create index if not exists friend_requests_requester_status
  on public.friend_requests (requester_id, status);
create index if not exists friend_requests_recipient_status
  on public.friend_requests (recipient_id, status);

alter table public.friend_requests enable row level security;
drop policy if exists "Users can view their friend requests"
  on public.friend_requests;
create policy "Users can view their friend requests"
  on public.friend_requests for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);
drop policy if exists "Users can send friend requests"
  on public.friend_requests;
create policy "Users can send friend requests"
  on public.friend_requests for insert to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> recipient_id
    and status = 'pending'
  );
drop policy if exists "Recipients can respond to friend requests"
  on public.friend_requests;
create policy "Recipients can respond to friend requests"
  on public.friend_requests for update to authenticated
  using (auth.uid() = recipient_id and status = 'pending')
  with check (
    auth.uid() = recipient_id and status in ('accepted', 'declined')
  );
drop policy if exists "Users can remove friend requests or friendships"
  on public.friend_requests;
create policy "Users can remove friend requests or friendships"
  on public.friend_requests for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);
revoke all on public.friend_requests from public, anon, authenticated;
grant select, insert, delete on public.friend_requests to authenticated;
grant update (status) on public.friend_requests to authenticated;

create or replace function public.enforce_friend_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  locked_user_id uuid;
  accepted_count integer;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then
    return new;
  end if;

  for locked_user_id in
    select user_id
    from unnest(array[new.requester_id, new.recipient_id]) as users(user_id)
    order by user_id::text
  loop
    perform pg_advisory_xact_lock(hashtextextended(locked_user_id::text, 0));
  end loop;

  select count(*)
  into accepted_count
  from public.friend_requests as request
  where request.status = 'accepted'
    and (
      request.requester_id = new.recipient_id
      or request.recipient_id = new.recipient_id
    );
  if accepted_count >= 20 then
    raise exception using
      errcode = '23514',
      message = 'friend_limit_reached';
  end if;

  select count(*)
  into accepted_count
  from public.friend_requests as request
  where request.status = 'accepted'
    and (
      request.requester_id = new.requester_id
      or request.recipient_id = new.requester_id
    );
  if accepted_count >= 20 then
    raise exception using
      errcode = '23514',
      message = 'friend_limit_reached';
  end if;

  return new;
end;
$$;
revoke all on function public.enforce_friend_limit() from public, anon, authenticated;

drop trigger if exists enforce_friend_limit_before_accept
  on public.friend_requests;
create trigger enforce_friend_limit_before_accept
  before update of status on public.friend_requests
  for each row execute function public.enforce_friend_limit();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  request_id uuid references public.friend_requests (id) on delete set null,
  kind text not null
    check (kind in ('friend_request', 'friend_accepted', 'friend_request_declined')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created
  on public.notifications (recipient_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "Users can view their notifications"
  on public.notifications;
create policy "Users can view their notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = recipient_id);
drop policy if exists "Users can update their notifications"
  on public.notifications;
create policy "Users can update their notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
drop policy if exists "Users can delete their notifications"
  on public.notifications;
create policy "Users can delete their notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = recipient_id);
revoke all on public.notifications from public, anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  reported_user_id uuid not null
    references auth.users (id) on delete cascade,
  reason text not null check (
    reason in (
      'spam',
      'harassment',
      'inappropriate_content',
      'impersonation',
      'other'
    )
  ),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index if not exists user_reports_status_created
  on public.user_reports (status, created_at desc);
alter table public.user_reports enable row level security;
drop policy if exists "Users can submit reports about other users"
  on public.user_reports;
create policy "Users can submit reports about other users"
  on public.user_reports for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and reporter_id <> reported_user_id
    and status = 'pending'
  );
revoke all on public.user_reports from public, anon, authenticated;
grant insert (reported_user_id, reason, details)
  on public.user_reports to authenticated;

create or replace function public.notify_friend_request_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, actor_id, request_id, kind)
    values (new.recipient_id, new.requester_id, new.id, 'friend_request');
  elsif old.status = 'pending' and new.status in ('accepted', 'declined') then
    insert into public.notifications (recipient_id, actor_id, request_id, kind)
    values (
      new.requester_id,
      new.recipient_id,
      new.id,
      case
        when new.status = 'accepted' then 'friend_accepted'
        else 'friend_request_declined'
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_friend_request_notification
  on public.friend_requests;
create trigger on_friend_request_notification
  after insert or update of status on public.friend_requests
  for each row execute function public.notify_friend_request_changes();

create or replace function public.refresh_profile_streak_stats(target_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  with days as (
    select distinct completed_on
    from public.task_completions
    where user_id = target_user_id
  ),
  grouped_days as (
    select
      completed_on,
      completed_on - row_number() over (order by completed_on)::integer as streak_group
    from days
  ),
  streaks as (
    select
      streak_group,
      count(*)::integer as length,
      max(completed_on) as last_day
    from grouped_days
    group by streak_group
  )
  update public.profiles
  set current_streak = coalesce(
        (
          select length
          from streaks
          where last_day >= current_date - 1
          order by last_day desc
          limit 1
        ),
        0
      ),
      longest_streak = coalesce((select max(length) from streaks), 0),
      last_activity_on = (select max(completed_on) from days)
  where user_id = target_user_id;
$$;
revoke all on function public.refresh_profile_streak_stats(uuid)
  from public, anon, authenticated;

create or replace function public.sync_profile_streak_stats()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_profile_streak_stats(old.user_id);
    return old;
  end if;
  perform public.refresh_profile_streak_stats(new.user_id);
  return new;
end;
$$;

drop trigger if exists on_task_completion_streak_sync
  on public.task_completions;
create trigger on_task_completion_streak_sync
  after insert or update or delete on public.task_completions
  for each row execute function public.sync_profile_streak_stats();

do $$
declare
  existing_user record;
begin
  for existing_user in select user_id from public.profiles
  loop
    perform public.refresh_profile_streak_stats(existing_user.user_id);
  end loop;
end;
$$;

-- Private, user-owned task groups.
create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 1 and 60),
  icon text not null default 'file',
  created_at timestamptz not null default now()
);
alter table public.task_groups
  add column if not exists icon text not null default 'file';
create unique index if not exists task_groups_user_name_unique
  on public.task_groups (user_id, lower(name));
alter table public.task_groups enable row level security;
drop policy if exists "Users can view their own task groups"
  on public.task_groups;
create policy "Users can view their own task groups"
  on public.task_groups for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can create their own task groups"
  on public.task_groups;
create policy "Users can create their own task groups"
  on public.task_groups for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own task groups"
  on public.task_groups;
create policy "Users can update their own task groups"
  on public.task_groups for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own task groups"
  on public.task_groups;
create policy "Users can delete their own task groups"
  on public.task_groups for delete to authenticated
  using (auth.uid() = user_id);
revoke all on public.task_groups from public, anon, authenticated;
grant select, insert, update, delete on public.task_groups to authenticated;

create or replace function public.remove_task_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  perform 1
  from public.task_groups
  where id = p_group_id
    and user_id = current_user_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'task_group_not_found';
  end if;

  update public.tasks
  set data = data - 'groupId',
      updated_at = now()
  where user_id = current_user_id
    and data ->> 'groupId' = p_group_id::text;

  delete from public.task_groups
  where id = p_group_id
    and user_id = current_user_id;
end;
$$;
revoke all on function public.remove_task_group(uuid) from public, anon, authenticated;
grant execute on function public.remove_task_group(uuid) to authenticated;

alter table public.task_groups
  drop constraint if exists task_groups_icon_valid;
alter table public.task_groups
  add constraint task_groups_icon_valid
  check (
    icon in (
      'file', 'folder', 'home', 'work', 'book', 'fitness', 'heart', 'target',
      'bookmarked', 'bug', 'cake', 'calculator', 'camera', 'car', 'chart',
      'chart_pie', 'chef', 'church', 'money', 'clipboard', 'cloud', 'code',
      'coffee', 'compass', 'cooking', 'credit_card', 'dog', 'earth', 'film',
      'flag', 'flask', 'flower', 'gamepad', 'gift', 'graduation', 'hammer',
      'hand_heart', 'headphones', 'laptop', 'leaf', 'idea', 'lock', 'map',
      'pin', 'medal', 'megaphone', 'message', 'mic', 'monitor', 'mountain',
      'music', 'notebook', 'package', 'palette', 'paw', 'phone', 'plane',
      'plug', 'puzzle', 'rocket', 'school', 'scissors', 'settings', 'shield',
      'shopping', 'shower', 'smartphone', 'soup', 'sparkles', 'sprout', 'star',
      'medical', 'theater', 'ticket', 'timer', 'train', 'trees', 'truck',
      'umbrella', 'utensils', 'video', 'wallet', 'watch', 'wrench', 'zap',
      'trophy'
    )
  );

-- Challenge catalog and private participation/check-in data.
create table if not exists public.challenge_catalog (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null,
  category text not null
    check (category in ('Fitness', 'Mind', 'Discipline', 'Productivity', 'Money')),
  target_days integer not null check (target_days > 0),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.challenge_catalog enable row level security;
drop policy if exists "Authenticated users can view active challenges"
  on public.challenge_catalog;
create policy "Authenticated users can view active challenges"
  on public.challenge_catalog for select to authenticated
  using (is_active);
revoke all on public.challenge_catalog from public, anon, authenticated;
grant select on public.challenge_catalog to authenticated;

create table if not exists public.challenge_participants (
  challenge_id text not null
    check (challenge_id ~ '^[a-z0-9-]{1,80}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_on date not null default current_date,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index if not exists challenge_participants_user
  on public.challenge_participants (user_id, challenge_id);
alter table public.challenge_participants enable row level security;
drop policy if exists "Users can view their own challenge participation"
  on public.challenge_participants;
create policy "Users can view their own challenge participation"
  on public.challenge_participants for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can join challenges for themselves"
  on public.challenge_participants;
create policy "Users can join challenges for themselves"
  on public.challenge_participants for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can leave their own challenges"
  on public.challenge_participants;
create policy "Users can leave their own challenges"
  on public.challenge_participants for delete to authenticated
  using (auth.uid() = user_id);
revoke all on public.challenge_participants from public, anon, authenticated;
grant select, insert, delete on public.challenge_participants to authenticated;

create table if not exists public.challenge_checkins (
  challenge_id text not null,
  user_id uuid not null,
  completed_on date not null,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id, completed_on),
  foreign key (challenge_id, user_id)
    references public.challenge_participants (challenge_id, user_id)
    on delete cascade
);
create index if not exists challenge_checkins_daily
  on public.challenge_checkins (challenge_id, completed_on);
alter table public.challenge_checkins enable row level security;
drop policy if exists "Users can view their own challenge check-ins"
  on public.challenge_checkins;
create policy "Users can view their own challenge check-ins"
  on public.challenge_checkins for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can add their own challenge check-ins"
  on public.challenge_checkins;
create policy "Users can add their own challenge check-ins"
  on public.challenge_checkins for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.challenge_participants as participant
      where participant.challenge_id = challenge_checkins.challenge_id
        and participant.user_id = auth.uid()
        and challenge_checkins.completed_on >= participant.joined_on
    )
  );
drop policy if exists "Users can remove their own challenge check-ins"
  on public.challenge_checkins;
create policy "Users can remove their own challenge check-ins"
  on public.challenge_checkins for delete to authenticated
  using (auth.uid() = user_id);
revoke all on public.challenge_checkins from public, anon, authenticated;
grant select, insert, delete on public.challenge_checkins to authenticated;

drop function if exists public.get_challenge_stats(text[], date);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.challenge_participants'::regclass
      and conname = 'challenge_participants_challenge_id_fkey'
  ) then
    alter table public.challenge_participants
      add constraint challenge_participants_challenge_id_fkey
      foreign key (challenge_id)
      references public.challenge_catalog (id)
      on delete cascade;
  end if;
end;
$$;

create or replace function public.get_challenge_stats(p_challenge_ids text[])
returns table (challenge_id text, participant_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select challenge.id, count(participant.user_id)
  from public.challenge_catalog as challenge
  left join public.challenge_participants as participant
    on participant.challenge_id = challenge.id
  where challenge.is_active
    and challenge.id = any(coalesce(p_challenge_ids, array[]::text[]))
  group by challenge.id;
$$;
revoke all on function public.get_challenge_stats(text[])
  from public, anon, authenticated;
grant execute on function public.get_challenge_stats(text[])
  to authenticated;

create or replace function public.join_challenge_and_create_task(
  p_challenge_id text,
  p_joined_on date
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  challenge public.challenge_catalog%rowtype;
  task_title text;
  task_id text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to join a challenge.'
      using errcode = '42501';
  end if;
  if p_joined_on is null
    or p_joined_on < current_date - 1
    or p_joined_on > current_date + 1
  then
    raise exception 'Challenge joining requires a current local date.'
      using errcode = '22023';
  end if;

  select catalog.* into challenge
  from public.challenge_catalog as catalog
  where catalog.id = p_challenge_id and catalog.is_active;
  if not found then
    raise exception 'This challenge is not available.'
      using errcode = '22023';
  end if;

  task_id := 'challenge-' || challenge.id;
  task_title := case
    when challenge.id = 'cold-showers' then 'Cold shower'
    else challenge.name
  end;
  insert into public.challenge_participants (challenge_id, user_id, joined_on)
  values (challenge.id, current_user_id, p_joined_on)
  on conflict (challenge_id, user_id) do nothing;
  insert into public.tasks (user_id, id, data, updated_at)
  values (
    current_user_id,
    task_id,
    jsonb_build_object(
      'id', task_id,
      'title', task_title,
      'notes', 'Daily task for the ' || challenge.name || ' challenge.',
      'completed', false,
      'priority', 'medium',
      'category', 'Challenge',
      'repeat', 'daily',
      'reminder', false,
      'streakEnabled', true,
      'currentStreak', 0,
      'longestStreak', 0,
      'createdAt', p_joined_on::text
    ),
    now()
  )
  on conflict (user_id, id) do nothing;
end;
$$;
revoke all on function public.join_challenge_and_create_task(text, date)
  from public, anon, authenticated;
grant execute on function public.join_challenge_and_create_task(text, date)
  to authenticated;

-- Friend leaderboard score for the signed-in user and accepted friends.
create or replace function public.get_friend_leaderboard_scores()
returns table (
  user_id uuid,
  score numeric,
  completion_rate numeric,
  consistency_rate numeric,
  on_time_rate numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with bounds as (
    select current_date as as_of, current_date - 29 as period_start
  ),
  viewer as (
    select auth.uid() as user_id where auth.uid() is not null
  ),
  target_users as (
    select user_id from viewer
    union
    select case
      when request.requester_id = viewer.user_id then request.recipient_id
      else request.requester_id
    end
    from public.friend_requests as request
    cross join viewer
    where request.status = 'accepted'
      and (
        request.requester_id = viewer.user_id
        or request.recipient_id = viewer.user_id
      )
  ),
  task_data as (
    select
      task.user_id,
      task.id as task_id,
      case
        when task.data ->> 'createdAt' ~ '^\d{4}-\d{2}-\d{2}'
          then substring(task.data ->> 'createdAt' from 1 for 10)::date
        else task.updated_at::date
      end as created_on,
      case
        when task.data ->> 'dueDate' ~ '^\d{4}-\d{2}-\d{2}$'
          then (task.data ->> 'dueDate')::date
        else null
      end as due_on,
      case
        when task.data ->> 'repeat' in ('daily', 'weekdays', 'weekly', 'monthly')
          then task.data ->> 'repeat'
        else 'none'
      end as repeat
    from public.tasks as task
    join target_users using (user_id)
  ),
  scheduled_occurrences as (
    select
      task.user_id,
      task.task_id,
      task.repeat,
      occurrence.day::date as occurrence_on
    from task_data as task
    cross join bounds
    cross join lateral generate_series(
      greatest(bounds.period_start, task.created_on),
      bounds.as_of,
      interval '1 day'
    ) as occurrence(day)
    where
      (
        task.repeat = 'none'
        and occurrence.day::date = coalesce(task.due_on, task.created_on)
      )
      or task.repeat = 'daily'
      or (
        task.repeat = 'weekdays'
        and extract(isodow from occurrence.day) between 1 and 5
      )
      or (
        task.repeat = 'weekly'
        and extract(isodow from occurrence.day) = extract(isodow from task.created_on)
      )
      or (
        task.repeat = 'monthly'
        and extract(day from occurrence.day) = extract(day from task.created_on)
      )
  ),
  occurrence_totals as (
    select
      occurrence.user_id,
      count(*) as due_count,
      count(*) filter (
        where exists (
          select 1
          from public.task_completions as completion
          cross join bounds
          where completion.user_id = occurrence.user_id
            and completion.task_id = occurrence.task_id
            and completion.completed_on between occurrence.occurrence_on and bounds.as_of
            and (
              occurrence.repeat = 'none'
              or completion.completed_on = occurrence.occurrence_on
            )
        )
      ) as completed_count,
      count(distinct occurrence.occurrence_on) as due_day_count
    from scheduled_occurrences as occurrence
    group by occurrence.user_id
  ),
  dated_completion_totals as (
    select
      completion.user_id,
      count(*) as dated_completion_count,
      count(*) filter (where completion.completed_on <= task.due_on) as on_time_count
    from public.task_completions as completion
    join task_data as task
      on task.user_id = completion.user_id and task.task_id = completion.task_id
    cross join bounds
    where task.due_on is not null
      and completion.completed_on between bounds.period_start and bounds.as_of
    group by completion.user_id
  ),
  activity_days as (
    select completion.user_id, count(distinct completion.completed_on) as active_days
    from public.task_completions as completion
    join target_users using (user_id)
    cross join bounds
    where completion.completed_on between bounds.period_start and bounds.as_of
    group by completion.user_id
  ),
  rates as (
    select
      target.user_id,
      case
        when coalesce(occurrence.due_count, 0) > 0
          then coalesce(occurrence.completed_count, 0)::numeric / occurrence.due_count
        else null
      end as completion_rate,
      case
        when coalesce(occurrence.due_count, 0) > 0
          then least(
            1::numeric,
            coalesce(activity.active_days, 0)::numeric / occurrence.due_day_count
          )
        else null
      end as consistency_rate,
      case
        when coalesce(dated.dated_completion_count, 0) > 0
          then dated.on_time_count::numeric / dated.dated_completion_count
        else null
      end as on_time_rate
    from target_users as target
    left join occurrence_totals as occurrence using (user_id)
    left join dated_completion_totals as dated using (user_id)
    left join activity_days as activity using (user_id)
  )
  select
    rates.user_id,
    case
      when rates.completion_rate is not null
        and rates.consistency_rate is not null
        and rates.on_time_rate is not null
      then round(
        100 * (
          0.5 * rates.completion_rate
          + 0.3 * rates.consistency_rate
          + 0.2 * rates.on_time_rate
        ),
        1
      )
      else null
    end as score,
    rates.completion_rate,
    rates.consistency_rate,
    rates.on_time_rate
  from rates;
$$;
revoke all on function public.get_friend_leaderboard_scores()
  from public, anon;
grant execute on function public.get_friend_leaderboard_scores()
  to authenticated;

-- Account data reset. Child rows are removed by their foreign-key cascades.
create or replace function public.clear_my_app_data(p_confirmation text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'You must be signed in to clear app data.'
      using errcode = '42501';
  end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'Confirmation must be DELETE.'
      using errcode = '22023';
  end if;

  delete from public.challenge_participants
  where user_id = current_user_id;
  delete from public.notifications
  where recipient_id = current_user_id;
  delete from public.friend_requests
  where requester_id = current_user_id or recipient_id = current_user_id;
  delete from public.tasks
  where user_id = current_user_id;
  delete from public.task_groups
  where user_id = current_user_id;
  delete from public.day_entries
  where user_id = current_user_id;
end;
$$;
revoke all on function public.clear_my_app_data(text)
  from public, anon, authenticated;
grant execute on function public.clear_my_app_data(text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
