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
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create table if not exists public.task_completions (
  user_id uuid not null,
  task_id text not null,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id, completed_on),
  foreign key (user_id, task_id)
    references public.tasks (user_id, id)
    on delete cascade
);

alter table public.task_completions enable row level security;

drop policy if exists "Users can read their own task completions" on public.task_completions;
create policy "Users can read their own task completions"
  on public.task_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can record their own task completions" on public.task_completions;
create policy "Users can record their own task completions"
  on public.task_completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own task completions" on public.task_completions;
create policy "Users can update their own task completions"
  on public.task_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own task completions" on public.task_completions;
create policy "Users can delete their own task completions"
  on public.task_completions for delete
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

drop policy if exists "Users can read their own day entries" on public.day_entries;
create policy "Users can read their own day entries"
  on public.day_entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own day entries" on public.day_entries;
create policy "Users can create their own day entries"
  on public.day_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own day entries" on public.day_entries;
create policy "Users can update their own day entries"
  on public.day_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own day entries" on public.day_entries;
create policy "Users can delete their own day entries"
  on public.day_entries for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
