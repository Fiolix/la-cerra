-- GPS markers for physical boulders. A marker is independent of the blocks table
-- because one physical boulder can have several topo/photo views there.

create table if not exists public.boulder_locations (
  sector_slug text not null,
  boulder_number text not null,
  label text not null,
  block_anchor text not null,
  longitude double precision not null check (longitude between -180 and 180),
  latitude double precision not null check (latitude between -90 and 90),
  is_visible boolean not null default true,
  display_order integer not null default 0,
  primary key (sector_slug, boulder_number),
  constraint boulder_locations_sector_slug_format check (sector_slug ~ '^[a-z0-9_-]+$'),
  constraint boulder_locations_block_anchor_format check (block_anchor ~ '^block-[a-z0-9-]+$')
);

comment on table public.boulder_locations is
  'One GPS marker per physical boulder, linked to a sector page and its canonical block view.';

insert into public.boulder_locations
  (sector_slug, boulder_number, label, block_anchor, longitude, latitude, is_visible, display_order)
values
  ('bermuda_triangle', '1', 'Boulder 1', 'block-01',  9.122800, 40.991681, true, 10),
  ('bermuda_triangle', '2', 'Boulder 2', 'block-02a', 9.121675, 40.990970, true, 20),
  ('bermuda_triangle', '3', 'Boulder 3', 'block-03',  9.121607, 40.991045, true, 30),
  ('bermuda_triangle', '4', 'Boulder 4', 'block-04a', 9.121736, 40.991101, true, 40),
  ('bermuda_triangle', '5', 'Boulder 5', 'block-05',  9.118578, 40.992096, true, 50),
  ('bermuda_triangle', '6', 'Boulder 6', 'block-06',  9.121909, 40.990619, true, 60),
  ('bermuda_triangle', '7', 'Boulder 7', 'block-07a', 9.121970, 40.990557, true, 70)
on conflict (sector_slug, boulder_number) do update
set label = excluded.label,
    block_anchor = excluded.block_anchor,
    longitude = excluded.longitude,
    latitude = excluded.latitude,
    is_visible = excluded.is_visible,
    display_order = excluded.display_order;

alter table public.boulder_locations enable row level security;

grant select on table public.boulder_locations to anon, authenticated;
revoke insert, delete, update on table public.boulder_locations from anon, authenticated;

drop policy if exists "Public can read visible boulder locations" on public.boulder_locations;
drop policy if exists "Admins can read all boulder locations" on public.boulder_locations;

create policy "Public can read visible boulder locations"
on public.boulder_locations
for select
to anon, authenticated
using (is_visible);

create policy "Admins can read all boulder locations"
on public.boulder_locations
for select
to authenticated
using ((select public.is_admin()));
