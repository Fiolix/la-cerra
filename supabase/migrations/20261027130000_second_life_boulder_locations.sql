-- GPS markers supplied for the five physical boulders in 2nd Life.
-- Boulders 1 and 2 use their separate B views as canonical map targets,
-- because their A views share a combined block record (01a-02a).

insert into public.boulder_locations
  (sector_slug, boulder_number, label, block_anchor, longitude, latitude, is_visible, display_order)
values
  ('second_life', '1', 'Boulder 1', 'block-01b',  9.114841, 40.993005, true, 10),
  ('second_life', '2', 'Boulder 2', 'block-02b',  9.114790, 40.992966, true, 20),
  ('second_life', '3', 'Boulder 3', 'block-03',   9.114838, 40.992950, true, 30),
  ('second_life', '4', 'Boulder 4', 'block-04a',  9.114727, 40.992902, true, 40),
  ('second_life', '5', 'Boulder 5', 'block-05',   9.114947, 40.992845, true, 50)
on conflict (sector_slug, boulder_number) do update
set label = excluded.label,
    block_anchor = excluded.block_anchor,
    longitude = excluded.longitude,
    latitude = excluded.latitude,
    is_visible = excluded.is_visible,
    display_order = excluded.display_order;
