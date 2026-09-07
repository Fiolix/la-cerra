-- Secure foundation for the La Cerra administration area.
-- Public route/block reads remain unchanged. Only authenticated admins gain updates.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);

comment on table public.user_roles is
  'Server-managed application roles. This table is not directly exposed to browser users.';

alter table public.user_roles enable row level security;

revoke all on table public.user_roles from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- RLS policies require matching table privileges as well.
grant select on table public.blocks, public.routes to anon, authenticated;
grant update on table public.blocks, public.routes to authenticated;

drop policy if exists "Admins can update blocks" on public.blocks;

create policy "Admins can update blocks"
on public.blocks
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can update routes" on public.routes;

create policy "Admins can update routes"
on public.routes
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
