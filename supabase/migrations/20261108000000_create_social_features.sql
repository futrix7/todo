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

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (auth.uid() is not null);

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

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
on conflict (user_id) do update
set display_name = excluded.display_name,
    bio = excluded.bio;

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

drop policy if exists "Users can view their friend requests" on public.friend_requests;
create policy "Users can view their friend requests"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
  on public.friend_requests for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> recipient_id
    and status = 'pending'
  );

drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
create policy "Recipients can respond to friend requests"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = recipient_id and status = 'pending')
  with check (
    auth.uid() = recipient_id
    and status in ('accepted', 'declined')
  );

drop policy if exists "Users can remove friend requests or friendships" on public.friend_requests;
create policy "Users can remove friend requests or friendships"
  on public.friend_requests for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

revoke all on public.friend_requests from public, anon, authenticated;
grant select, insert, delete on public.friend_requests to authenticated;
grant update (status) on public.friend_requests to authenticated;

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

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = recipient_id);

revoke all on public.notifications from public, anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

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

drop trigger if exists on_friend_request_notification on public.friend_requests;
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

revoke all on function public.refresh_profile_streak_stats(uuid) from public, anon, authenticated;

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

drop trigger if exists on_task_completion_streak_sync on public.task_completions;
create trigger on_task_completion_streak_sync
  after insert or update or delete on public.task_completions
  for each row execute function public.sync_profile_streak_stats();

do $$
declare
  existing_user record;
begin
  for existing_user in
    select user_id from public.profiles
  loop
    perform public.refresh_profile_streak_stats(existing_user.user_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
