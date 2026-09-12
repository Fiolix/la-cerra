-- Read-only user overview and narrowly scoped profile/role administration.
-- Auth passwords, sessions and account deletion remain outside the browser client.

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  username text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text,
  tick_count bigint
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
    (select count(*) from public.ticklist where ticklist.user_id = users.id)::bigint
  from auth.users as users
  left join public.profiles as profiles on profiles.user_id = users.id
  left join public.user_roles as roles on roles.user_id = users.id
  order by lower(coalesce(profiles.username, users.email, users.id::text));
end;
$$;

create or replace function public.admin_update_username(target_user_id uuid, new_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_username text := btrim(new_username);
begin
  if not public.is_admin() then
    raise exception 'administrator_required' using errcode = '42501';
  end if;

  if cleaned_username is null
    or char_length(cleaned_username) not between 3 and 30
    or cleaned_username !~ '^[[:alnum:]_.-]+$'
  then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(btrim(username)) = lower(cleaned_username)
      and user_id <> target_user_id
  ) then
    raise exception 'username_taken' using errcode = '23505';
  end if;

  update public.profiles
  set username = cleaned_username
  where user_id = target_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  return cleaned_username;
end;
$$;

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_role text := lower(btrim(new_role));
begin
  if not public.is_admin() then
    raise exception 'administrator_required' using errcode = '42501';
  end if;

  if cleaned_role not in ('user', 'moderator', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if target_user_id = auth.uid() and cleaned_role <> 'admin' then
    raise exception 'cannot_change_own_admin_role' using errcode = '42501';
  end if;

  if cleaned_role = 'user' then
    delete from public.user_roles where user_id = target_user_id;
  else
    insert into public.user_roles (user_id, role)
    values (target_user_id, cleaned_role)
    on conflict (user_id) do update set role = excluded.role;
  end if;

  return cleaned_role;
end;
$$;

revoke all on function public.admin_list_users() from public, anon, authenticated;
revoke all on function public.admin_update_username(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon, authenticated;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_username(uuid, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

comment on function public.admin_list_users() is
  'Administrator-only account overview without exposing auth.users directly.';
comment on function public.admin_update_username(uuid, text) is
  'Administrator-only username correction with existing username rules.';
comment on function public.admin_set_user_role(uuid, text) is
  'Administrator-only role assignment. The caller cannot remove their own admin role.';
