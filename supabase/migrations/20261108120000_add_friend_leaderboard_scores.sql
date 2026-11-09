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
    select auth.uid() as user_id
    where auth.uid() is not null
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
      task.due_on,
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
    cross join bounds
    group by occurrence.user_id
  ),
  dated_completion_totals as (
    select
      completion.user_id,
      count(*) as dated_completion_count,
      count(*) filter (where completion.completed_on <= task.due_on) as on_time_count
    from public.task_completions as completion
    join task_data as task
      on task.user_id = completion.user_id
      and task.task_id = completion.task_id
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

revoke all on function public.get_friend_leaderboard_scores() from public, anon;
grant execute on function public.get_friend_leaderboard_scores() to authenticated;

notify pgrst, 'reload schema';
