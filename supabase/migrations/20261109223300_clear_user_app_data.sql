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

  delete from public.notifications
  where recipient_id = current_user_id;

  delete from public.friend_requests
  where requester_id = current_user_id
     or recipient_id = current_user_id;

  delete from public.tasks
  where user_id = current_user_id;

  delete from public.day_entries
  where user_id = current_user_id;
end;
$$;

revoke all on function public.clear_my_app_data(text) from public, anon, authenticated;
grant execute on function public.clear_my_app_data(text) to authenticated;

notify pgrst, 'reload schema';
