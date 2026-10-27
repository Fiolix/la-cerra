-- GPS markers supplied for the five physical boulders in Sushi-Free.
-- Lettered topo/photo views share the marker of their physical boulder.

insert into public.boulder_locations
  (sector_slug, boulder_number, label, block_anchor, longitude, latitude, is_visible, display_order)
values
  ('sushi-free', '1', 'Valentin''s Day', 'block-01a', 9.122467, 40.988861, true, 10),
  ('sushi-free', '2', 'Semmelbrösel',    'block-02a', 9.121874, 40.988115, true, 20),
  ('sushi-free', '3', 'Spaghetto',       'block-03a', 9.121949, 40.988084, true, 30),
  ('sushi-free', '4', 'Tiramisu',        'block-4',   9.121944, 40.988113, true, 40),
  ('sushi-free', '5', 'Buon Appetito',   'block-05a', 9.121915, 40.988128, true, 50)
on conflict (sector_slug, boulder_number) do update
set label = excluded.label,
    block_anchor = excluded.block_anchor,
    longitude = excluded.longitude,
    latitude = excluded.latitude,
    is_visible = excluded.is_visible,
    display_order = excluded.display_order;
