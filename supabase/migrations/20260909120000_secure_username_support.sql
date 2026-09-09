-- Prepare usernames for secure login without exposing profile rows.

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    char_length(btrim(username)) between 3 and 30
    and btrim(username) ~ '^[[:alnum:]_.-]+$'
  );

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(btrim(username)));

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    candidate is not null
    and char_length(btrim(candidate)) between 3 and 30
    and btrim(candidate) ~ '^[[:alnum:]_.-]+$'
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(username)) = lower(btrim(candidate))
    );
$$;

revoke all on function public.is_username_available(text) from public, anon, authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;
