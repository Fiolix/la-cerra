-- Safe block creation and centrally managed sector visibility.

create table if not exists public.sector_settings (
  slug text primary key,
  label text not null,
  is_visible boolean not null default true,
  display_order integer not null,
  constraint sector_settings_slug_format check (slug ~ '^[a-z0-9_-]+$')
);

comment on table public.sector_settings is
  'Fixed sector catalogue. Administrators may change visibility only; sector content is not deleted.';

insert into public.sector_settings (slug, label, is_visible, display_order)
values
  ('somewhere', 'Somewhere', true, 10),
  ('la_sportiva', 'La Sportiva', true, 20),
  ('sushi-free', 'Sushi-Free', true, 30),
  ('bermuda_triangle', 'Bermuda Triangle', true, 40),
  ('second_life', '2nd Life', true, 50),
  ('stuntblocs', 'Stuntblocs', true, 60),
  ('monte_lu_bagnu', 'Monte Lu Bagnu', true, 70),
  ('monte_pulchiana', 'Monte Pulchiana', true, 80)
on conflict (slug) do update
set label = excluded.label,
    display_order = excluded.display_order;

alter table public.sector_settings enable row level security;

grant select on table public.sector_settings to anon, authenticated;
revoke update on table public.sector_settings from authenticated;
grant update (is_visible) on table public.sector_settings to authenticated;

drop policy if exists "Public can read sector settings" on public.sector_settings;
drop policy if exists "Admins can update sector visibility" on public.sector_settings;

create policy "Public can read sector settings"
on public.sector_settings
for select
to anon, authenticated
using (true);

create policy "Admins can update sector visibility"
on public.sector_settings
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create unique index if not exists blocks_sector_number_unique
  on public.blocks (sektor, lower(btrim(nummer)))
  where nummer is not null and btrim(nummer) <> '';

grant insert on table public.blocks to authenticated;

drop policy if exists "Admins can insert blocks" on public.blocks;

create policy "Admins can insert blocks"
on public.blocks
for insert
to authenticated
with check ((select public.is_admin()));
