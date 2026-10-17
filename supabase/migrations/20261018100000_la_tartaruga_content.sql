-- Add the initial topo content for the unpublished sector La Tartaruga.
-- Boulders 5, 7 and 10 have two image views. Heights intentionally remain
-- empty until they are measured and added by an administrator.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',  'Boulder 1',  null::text, 'la_tartaruga_01.jpg'),
    ('02',  'Boulder 2',  null::text, 'la_tartaruga_02.jpg'),
    ('03',  'Boulder 3',  null::text, 'la_tartaruga_03.jpg'),
    ('04',  'Boulder 4',  null::text, 'la_tartaruga_04.jpg'),
    ('05a', 'Boulder 5',  null::text, 'la_tartaruga_05a.jpg'),
    ('05b', 'Boulder 5',  null::text, 'la_tartaruga_05b.jpg'),
    ('06',  'Boulder 6',  null::text, 'la_tartaruga_06.jpg'),
    ('07a', 'Boulder 7',  null::text, 'la_tartaruga_07a.jpg'),
    ('07b', 'Boulder 7',  null::text, 'la_tartaruga_07b.jpg'),
    ('08',  'Boulder 8',  null::text, 'la_tartaruga_08.jpg'),
    ('09',  'Boulder 9',  null::text, 'la_tartaruga_09.jpg'),
    ('10a', 'Boulder 10', null::text, 'la_tartaruga_10a.jpg'),
    ('10b', 'Boulder 10', null::text, 'la_tartaruga_10b.jpg'),
    ('11',  'Boulder 11', null::text, 'la_tartaruga_11.jpg'),
    ('12',  'Boulder 12', null::text, 'la_tartaruga_12.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'la_tartaruga', nummer, name, hoehe, bild
from block_data
where not exists (
  select 1
  from public.blocks as existing
  where existing.sektor = 'la_tartaruga'
    and lower(btrim(existing.nummer)) = lower(block_data.nummer)
);

with block_data (nummer, name, bild) as (
  values
    ('01',  'Boulder 1',  'la_tartaruga_01.jpg'),
    ('02',  'Boulder 2',  'la_tartaruga_02.jpg'),
    ('03',  'Boulder 3',  'la_tartaruga_03.jpg'),
    ('04',  'Boulder 4',  'la_tartaruga_04.jpg'),
    ('05a', 'Boulder 5',  'la_tartaruga_05a.jpg'),
    ('05b', 'Boulder 5',  'la_tartaruga_05b.jpg'),
    ('06',  'Boulder 6',  'la_tartaruga_06.jpg'),
    ('07a', 'Boulder 7',  'la_tartaruga_07a.jpg'),
    ('07b', 'Boulder 7',  'la_tartaruga_07b.jpg'),
    ('08',  'Boulder 8',  'la_tartaruga_08.jpg'),
    ('09',  'Boulder 9',  'la_tartaruga_09.jpg'),
    ('10a', 'Boulder 10', 'la_tartaruga_10a.jpg'),
    ('10b', 'Boulder 10', 'la_tartaruga_10b.jpg'),
    ('11',  'Boulder 11', 'la_tartaruga_11.jpg'),
    ('12',  'Boulder 12', 'la_tartaruga_12.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    bild = block_data.bild
from block_data
where blocks.sektor = 'la_tartaruga'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01',  'A', 'Nusskrone',               '5a',  'SD, start sitting on the big rock'),
    ('02',  'A', 'Scorpio',                  '6a',  'SD'),
    ('02',  'B', 'Project',                  '-',   'open project'),
    ('02',  'C', 'Bumblebee',                '5b',  'SD'),
    ('03',  'A', 'Paco',                     '4c',  null),
    ('03',  'B', 'Mica',                     '5a',  null),
    ('03',  'C', 'Pinta',                    '4b',  null),
    ('03',  'D', 'Mirta',                    '3b',  null),
    ('04',  'A', 'N.N.',                     '7a',  'SD, use the slopy edge to go around the corner and top out'),
    ('05a', 'A', 'Brot & Spiele',            '5c',  null),
    ('05b', 'B', 'Gladiator (left)',         '6c',  'top out to the left'),
    ('05b', 'C', 'Gladiator (right)',        '6c',  'top out to the right'),
    ('06',  'A', 'Kung Fu Panda',            '5b',  'SD, start inside as far as you can go. Some nice little roof climbing on big jugs'),
    ('07a', 'A', 'Highballer',               '4c',  'SD'),
    ('07b', 'B', 'Liegestuhl',               '3a',  'SD'),
    ('07b', 'C', 'Weihnachtsbäckerei',       '4c',  'SD'),
    ('08',  'A', 'Chalky Hands',             '5c',  'SD'),
    ('09',  'A', 'Plattenverschiebung',      '6b+', 'same way down'),
    ('10a', 'A', 'Garlic Dream',             '7a+', 'SD, starting holds are indicated'),
    ('10b', 'B', 'King Luy',                 '5c',  'SD, FA: Diane'),
    ('11',  'A', 'Knoblauchpresse',          '6a',  'SD'),
    ('12',  'A', 'Toetuga',                  '6a+', 'SD'),
    ('12',  'B', 'Project',                  '-',   'open project')
)
insert into public.routes (block_id, buchstabe, name, grad, beschreibung, video_url)
select blocks.id,
       route_data.buchstabe,
       route_data.name,
       route_data.grad,
       route_data.beschreibung,
       null
from route_data
join public.blocks as blocks
  on blocks.sektor = 'la_tartaruga'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
