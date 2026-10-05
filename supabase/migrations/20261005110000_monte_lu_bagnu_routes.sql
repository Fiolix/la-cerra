-- Add the six Monte Lu Bagnu boulder groups and their routes.
-- Image filenames are reserved now; the frontend hides missing files until
-- matching topo images are added to the repository.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01', 'Backside',           'various', 'monte_lu_bagnu_01_backside.jpg'),
    ('02', 'Lower Plateau',      'various', 'monte_lu_bagnu_02_lower_plateau.jpg'),
    ('03', 'Cunningham''s Cave', 'various', 'monte_lu_bagnu_03_cunninghams_cave.jpg'),
    ('04', 'Upper Plateau',      'various', 'monte_lu_bagnu_04_upper_plateau.jpg'),
    ('05', 'Peninsula',          'various', 'monte_lu_bagnu_05_peninsula.jpg'),
    ('06', 'Table Top',          'various', 'monte_lu_bagnu_06_table_top.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'monte_lu_bagnu', nummer, name, hoehe, bild
from block_data
on conflict do nothing;

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01', 'Backside',           'various', 'monte_lu_bagnu_01_backside.jpg'),
    ('02', 'Lower Plateau',      'various', 'monte_lu_bagnu_02_lower_plateau.jpg'),
    ('03', 'Cunningham''s Cave', 'various', 'monte_lu_bagnu_03_cunninghams_cave.jpg'),
    ('04', 'Upper Plateau',      'various', 'monte_lu_bagnu_04_upper_plateau.jpg'),
    ('05', 'Peninsula',          'various', 'monte_lu_bagnu_05_peninsula.jpg'),
    ('06', 'Table Top',          'various', 'monte_lu_bagnu_06_table_top.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    hoehe = block_data.hoehe,
    bild = block_data.bild
from block_data
where blocks.sektor = 'monte_lu_bagnu'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, video_url) as (
  values
    ('01', 'A', 'Lobster Monster',        '7b',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1483s'),
    ('01', 'B', 'Wingspan',               '7a',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1599s'),
    ('01', 'C', 'Puckered Up',            '7a',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1665s'),
    ('01', 'D', 'Headless Chicken Head',  '6c',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1731s'),
    ('01', 'E', 'Whale Rider',            '6b',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1802s'),
    ('02', 'A', 'Heart Racer',            '7c+', 'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=996s'),
    ('02', 'B', 'Brilliant Idiot',        '7a',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1039s'),
    ('02', 'C', 'Mould Mayhem',           '6c',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1099s'),
    ('02', 'D', 'Narcissus',              '7a',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1141s'),
    ('02', 'E', 'Born Slippy',            '7b',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1459s'),
    ('03', 'A', 'Pissing in the Wind',    '7b+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1138s'),
    ('03', 'B', 'Turfu',                  '7a',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1222s'),
    ('03', 'C', 'Live Long and Prosper',  '7b+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1306s'),
    ('03', 'D', 'Stuck',                  '7a',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1394s'),
    ('03', 'E', 'Runaway',                '7a+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1424s'),
    ('03', 'F', 'Tidal Wave Traverse',    '6b',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1465s'),
    ('03', 'G', 'Wired',                  '7a+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1491s'),
    ('03', 'H', '12 Boar',                '7c+', 'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=357s'),
    ('04', 'A', 'Skeleton of Fish',       '7c',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=491s'),
    ('04', 'B', 'Sythe Warrior',          '7a',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=509s'),
    ('04', 'C', 'Runway',                 '7a+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=584s'),
    ('04', 'D', 'Brittle Dynasty',        '7b',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=726s'),
    ('04', 'E', 'Rock Cockerel',          '6c+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=826s'),
    ('04', 'F', 'sNOW Good',              '6c',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1853s'),
    ('04', 'G', 'Ichnusa',                '6b+', 'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1860s'),
    ('04', 'H', 'Rock Hopper',            '6c+', 'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1891s'),
    ('04', 'I', 'Jelly Fish',             '5a',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1927s'),
    ('04', 'J', 'Poolside',               '4a',  'https://www.youtube.com/watch?v=e7FuOiG3N5o&t=1938s'),
    ('05', 'A', 'High as a Giraffes Ass', '7b',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=264s'),
    ('06', 'A', 'Crystal Tips',           '7a+', 'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1755s'),
    ('06', 'B', 'The Bluff',              '7b',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1853s'),
    ('06', 'C', 'Future Reminitions',     '6a',  'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1890s'),
    ('06', 'D', 'Sundance',               '3',   'https://www.youtube.com/watch?v=DnievB3ZWgU&t=1920s')
)
insert into public.routes (block_id, buchstabe, name, grad, beschreibung, video_url)
select blocks.id,
       route_data.buchstabe,
       route_data.name,
       route_data.grad,
       null,
       route_data.video_url
from route_data
join public.blocks as blocks
  on blocks.sektor = 'monte_lu_bagnu'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
