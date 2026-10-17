-- Public map markers with admin-only coordinate and visibility updates.
-- The repository GeoJSON remains available as a read-only fallback.

create table if not exists public.map_locations (
  slug text primary key,
  kind text not null check (kind in ('sector', 'parking', 'food', 'accommodation', 'landmark')),
  label text not null,
  longitude double precision not null check (longitude between -180 and 180),
  latitude double precision not null check (latitude between -90 and 90),
  page text,
  category_label text,
  is_visible boolean not null default true,
  display_order integer not null default 0,
  constraint map_locations_slug_format check (slug ~ '^[a-z0-9_-]+$'),
  constraint map_locations_page_format check (page is null or page ~ '^[a-z0-9_-]+\.html$')
);

comment on table public.map_locations is
  'Public sector and point-of-interest markers. Only administrators may update coordinates or marker visibility.';

insert into public.map_locations
  (slug, kind, label, longitude, latitude, page, category_label, is_visible, display_order)
values
  ('somewhere', 'sector', 'Somewhere', 9.124329, 40.994591, 'somewhere.html', null, true, 10),
  ('la_sportiva', 'sector', 'La Sportiva', 9.12322, 40.99451, 'la_sportiva.html', null, true, 20),
  ('sushi-free', 'sector', 'Sushi-Free', 9.12193, 40.98809, 'sushi_free.html', null, true, 30),
  ('bermuda_triangle', 'sector', 'Bermuda Triangle', 9.12156, 40.99086, 'bermuda_triangle.html', null, true, 40),
  ('second_life', 'sector', '2nd Life', 9.11479, 40.99312, 'second_life.html', null, true, 50),
  ('stuntblocs', 'sector', 'Stuntblocs', 9.11518, 40.99233, 'stuntblocs.html', null, true, 60),
  ('jumble', 'sector', 'Jumble', 9.118000, 40.997531, 'jumble.html', null, true, 70),
  ('bloc_meadow', 'sector', 'Bloc Meadow', 9.118886, 40.998653, 'bloc_meadow.html', null, true, 80),
  ('monte_lu_bagnu', 'sector', 'Monte Lu Bagnu', 9.117109, 40.998907, 'monte_lu_bagnu.html', null, true, 90),
  ('monte_pulchiana', 'sector', 'Monte Pulchiana', 9.11563, 40.98765, 'monte_pulchiana.html', null, true, 100),
  ('where_the_wild_things_are', 'sector', 'Where the Wild Things Are', 9.1212500, 40.9921111, 'where_the_wild_things_are.html', null, true, 110),
  ('la_tartaruga', 'sector', 'La Tartaruga', 9.1179550, 40.9908500, 'la_tartaruga.html', null, true, 120),
  ('piru_ruju', 'sector', 'Piru Ruju', 9.1187450, 40.9953880, 'piru_ruju.html', null, true, 130),
  ('boulderplanet', 'sector', 'Boulderplanet', 9.1223330, 40.9953410, 'boulderplanet.html', null, true, 140),
  ('day_parking', 'parking', 'Day Parking', 9.113969, 40.987890, null, 'Parking', true, 210),
  ('restaurant_la_cerra', 'food', 'Restaurant La Cerra', 9.126978, 40.995738, null, 'Restaurant', true, 220),
  ('camping_la_cerra', 'accommodation', 'Camping La Cerra', 9.126565, 40.995022, null, 'Accommodation', true, 230),
  ('guesthouse_la_cerra', 'accommodation', 'La Cerra Guesthouse', 9.125614, 40.994311, null, 'Accommodation', true, 240),
  ('monte_pulchiana_landmark', 'landmark', 'Monte Pulchiana', 9.113625, 40.991985, null, 'Monolith / hiking', true, 250)
on conflict (slug) do nothing;

alter table public.map_locations enable row level security;

grant select on table public.map_locations to anon, authenticated;
revoke insert, delete on table public.map_locations from anon, authenticated;
revoke update on table public.map_locations from anon, authenticated;
grant update (longitude, latitude, is_visible) on table public.map_locations to authenticated;

drop policy if exists "Public can read visible map locations" on public.map_locations;
drop policy if exists "Admins can read all map locations" on public.map_locations;
drop policy if exists "Admins can update map locations" on public.map_locations;

create policy "Public can read visible map locations"
on public.map_locations
for select
to anon, authenticated
using (is_visible);

create policy "Admins can read all map locations"
on public.map_locations
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can update map locations"
on public.map_locations
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
