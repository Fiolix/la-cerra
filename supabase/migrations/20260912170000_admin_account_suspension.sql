-- Expose the Supabase Auth suspension state in the existing admin-only overview.
-- Suspending an account never deletes profile or ticklist data.

drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  user_id uuid,
  username text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text,
  tick_count bigint,
  is_suspended boolean,
  suspended_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator_required' using errcode = '42501';
  end if;

  return query
  select
    users.id,
    profiles.username,
    users.email::text,
    users.created_at,
    users.last_sign_in_at,
    coalesce(roles.role, 'user')::text,
    (select count(*) from public.ticklist where ticklist.user_id = users.id)::bigint,
    coalesce(users.banned_until > now(), false),
    users.banned_until
  from auth.users as users
  left join public.profiles as profiles on profiles.user_id = users.id
  left join public.user_roles as roles on roles.user_id = users.id
  order by lower(coalesce(profiles.username, users.email, users.id::text));
end;
$$;

revoke all on function public.admin_list_users() from public, anon, authenticated;
grant execute on function public.admin_list_users() to authenticated;

comment on function public.admin_list_users() is
  'Administrator-only account overview including the Supabase Auth suspension state.';
