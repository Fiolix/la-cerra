-- Safe route creation, archiving and deletion for the administration area.

alter table public.routes
  add column if not exists archived_at timestamptz;

comment on column public.routes.archived_at is
  'Archived routes are hidden from public sector pages but retained for existing ticklists.';

create unique index if not exists routes_active_block_letter_unique
  on public.routes (block_id, lower(btrim(buchstabe)))
  where archived_at is null
    and buchstabe is not null
    and btrim(buchstabe) <> '';

create index if not exists ticklist_route_id_idx
  on public.ticklist (route_id);

grant insert on table public.routes to authenticated;

drop policy if exists "Public can read routes" on public.routes;
drop policy if exists "Public can read active routes" on public.routes;
drop policy if exists "Admins can read all routes" on public.routes;
drop policy if exists "Users can read archived ticked routes" on public.routes;

create policy "Public can read active routes"
on public.routes
for select
to anon, authenticated
using (archived_at is null);

create policy "Admins can read all routes"
on public.routes
for select
to authenticated
using ((select public.is_admin()));

create policy "Users can read archived ticked routes"
on public.routes
for select
to authenticated
using (
  exists (
    select 1
    from public.ticklist
    where ticklist.route_id = routes.uuid
      and ticklist.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can insert routes" on public.routes;

create policy "Admins can insert routes"
on public.routes
for insert
to authenticated
with check ((select public.is_admin()));

create or replace function public.admin_route_tick_count(target_route_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator_required' using errcode = '42501';
  end if;

  return (
    select count(*)
    from public.ticklist
    where ticklist.route_id = target_route_id
  );
end;
$$;

create or replace function public.delete_unreferenced_route(target_route_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator_required' using errcode = '42501';
  end if;

  perform 1
  from public.routes
  where routes.uuid = target_route_id
    and routes.archived_at is not null
  for update;

  if not found then
    return false;
  end if;

  if exists (
    select 1
    from public.ticklist
    where ticklist.route_id = target_route_id
  ) then
    raise exception 'route_has_ticklist_entries' using errcode = 'P0001';
  end if;

  delete from public.routes
  where routes.uuid = target_route_id;

  return found;
end;
$$;

revoke all on function public.admin_route_tick_count(uuid) from public, anon, authenticated;
revoke all on function public.delete_unreferenced_route(uuid) from public, anon, authenticated;
grant execute on function public.admin_route_tick_count(uuid) to authenticated;
grant execute on function public.delete_unreferenced_route(uuid) to authenticated;
