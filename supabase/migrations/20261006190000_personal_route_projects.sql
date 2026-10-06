-- Personal route projects are kept separate from completed ascents.
-- Existing ticklist rows and public community statistics remain unchanged.

create table if not exists public.route_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid not null references public.routes(uuid) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, route_id)
);

comment on table public.route_projects is
  'Routes an authenticated user wants to climb. Completed ascents stay in public.ticklist.';

create index if not exists route_projects_route_id_idx
  on public.route_projects (route_id);

alter table public.route_projects enable row level security;

grant select, insert, delete on table public.route_projects to authenticated;

drop policy if exists "Users can read their route projects" on public.route_projects;
drop policy if exists "Users can add their route projects" on public.route_projects;
drop policy if exists "Users can remove their route projects" on public.route_projects;

create policy "Users can read their route projects"
on public.route_projects
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can add their route projects"
on public.route_projects
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.routes
    where routes.uuid = route_projects.route_id
      and routes.archived_at is null
  )
  and not exists (
    select 1
    from public.ticklist
    where ticklist.user_id = (select auth.uid())
      and ticklist.route_id = route_projects.route_id
  )
);

create policy "Users can remove their route projects"
on public.route_projects
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Saving a completed ascent automatically removes the matching personal project.
create or replace function public.remove_project_after_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.route_projects
  where route_projects.user_id = new.user_id
    and route_projects.route_id = new.route_id;
  return new;
end;
$$;

revoke all on function public.remove_project_after_tick() from public, anon, authenticated;

drop trigger if exists remove_project_after_tick on public.ticklist;
create trigger remove_project_after_tick
after insert or update of route_id, user_id on public.ticklist
for each row execute function public.remove_project_after_tick();

-- Keep archived routes readable when they still belong to a personal project.
drop policy if exists "Users can read archived project routes" on public.routes;
create policy "Users can read archived project routes"
on public.routes
for select
to authenticated
using (
  exists (
    select 1
    from public.route_projects
    where route_projects.route_id = routes.uuid
      and route_projects.user_id = (select auth.uid())
  )
);

-- Permanent deletion must preserve both completed ascents and personal projects.
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
    (select count(*) from public.ticklist where ticklist.route_id = target_route_id)
    +
    (select count(*) from public.route_projects where route_projects.route_id = target_route_id)
  );
end;
$$;

revoke all on function public.admin_route_tick_count(uuid) from public, anon, authenticated;
grant execute on function public.admin_route_tick_count(uuid) to authenticated;

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
    select 1 from public.ticklist where ticklist.route_id = target_route_id
  ) or exists (
    select 1 from public.route_projects where route_projects.route_id = target_route_id
  ) then
    raise exception 'route_has_user_entries' using errcode = 'P0001';
  end if;

  delete from public.routes
  where routes.uuid = target_route_id;

  return found;
end;
$$;

revoke all on function public.delete_unreferenced_route(uuid) from public, anon, authenticated;
grant execute on function public.delete_unreferenced_route(uuid) to authenticated;
