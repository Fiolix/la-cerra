-- Register planned sectors without publishing them. Existing visibility choices are preserved.
insert into public.sector_settings (slug, label, is_visible, display_order)
values
  ('where_the_wild_things_are', 'Where the Wild Things Are', false, 110),
  ('la_tartaruga', 'La Tartaruga', false, 120),
  ('piru_ruju', 'Piru Ruju', false, 130),
  ('boulderplanet', 'Boulderplanet', false, 140)
on conflict (slug) do update
set label = excluded.label,
    display_order = excluded.display_order;
