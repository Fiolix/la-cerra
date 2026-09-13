-- Initial Monte Pulchiana content transcribed from the printed La Cerra topo.
-- The eleven entries below represent the eleven visible topo image views.
-- The migration is repeatable and does not modify blocks or routes in other sectors.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',    'Boulder 1',                    '3.5 m', 'monte_pulchiana_01.jpg'),
    ('02',    'Boulder 2',                    '3.5 m', 'monte_pulchiana_02.jpg'),
    ('03',    'Boulder 3',                    '4 m',   'monte_pulchiana_03.jpg'),
    ('04-05', 'Sasso Calibani & Boulder 5',  '5.5 m', 'monte_pulchiana_04_05.jpg'),
    ('06',    'Blocco James',                 '6.5 m', 'monte_pulchiana_06.jpg'),
    ('07a',   'Grottino fessurato A',         '3 m',   'monte_pulchiana_07a.jpg'),
    ('07b',   'Grottino fessurato B',         '3 m',   'monte_pulchiana_07b.jpg'),
    ('08',    '3 Grappini',                   '6 m',   'monte_pulchiana_08.jpg'),
    ('09',    'Boulder 9',                    '4 m',   'monte_pulchiana_09.jpg'),
    ('10a',   'Boulder 10A',                  '3.5 m', 'monte_pulchiana_10a.jpg'),
    ('10b',   'Boulder 10B',                  '3.5 m', 'monte_pulchiana_10b.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'monte_pulchiana', nummer, name, hoehe, bild
from block_data
on conflict do nothing;

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',    'Boulder 1',                    '3.5 m', 'monte_pulchiana_01.jpg'),
    ('02',    'Boulder 2',                    '3.5 m', 'monte_pulchiana_02.jpg'),
    ('03',    'Boulder 3',                    '4 m',   'monte_pulchiana_03.jpg'),
    ('04-05', 'Sasso Calibani & Boulder 5',  '5.5 m', 'monte_pulchiana_04_05.jpg'),
    ('06',    'Blocco James',                 '6.5 m', 'monte_pulchiana_06.jpg'),
    ('07a',   'Grottino fessurato A',         '3 m',   'monte_pulchiana_07a.jpg'),
    ('07b',   'Grottino fessurato B',         '3 m',   'monte_pulchiana_07b.jpg'),
    ('08',    '3 Grappini',                   '6 m',   'monte_pulchiana_08.jpg'),
    ('09',    'Boulder 9',                    '4 m',   'monte_pulchiana_09.jpg'),
    ('10a',   'Boulder 10A',                  '3.5 m', 'monte_pulchiana_10a.jpg'),
    ('10b',   'Boulder 10B',                  '3.5 m', 'monte_pulchiana_10b.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    hoehe = block_data.hoehe,
    bild = block_data.bild
from block_data
where blocks.sektor = 'monte_pulchiana'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01',    'A', 'NN',              '7a',  'with left edge, FA: La Sportiva-Team'),
    ('01',    'B', 'Capsizing',       '6b',  'FA: La Sportiva-Team'),
    ('01',    'C', 'Hyknusa',         '4b',  'FA: tmms-Team'),
    ('01',    'D', 'Moby Dick Line',  '5c',  'FA: tmms-Team'),
    ('01',    'E', 'NN',              '6a',  'without topout nice & easier, FA: tmms-Team'),
    ('01',    'F', 'NN',              '6a+', 'without topout nice & easier, FA: tmms-Team'),
    ('02',    'A', 'NN',              '6c+', 'SD, FA: La Sportiva-Team'),
    ('02',    'B', 'NN',              '6a+', 'FA: La Sportiva-Team'),
    ('03',    'A', 'NN',              '3b',  'SD, nice overhang on holes, FA: La Sportiva-Team'),
    ('04-05', 'A', 'NN',              '7b+', 'FA: La Sportiva-Team'),
    ('04-05', 'B', 'Calibani''s line','7b+', 'FA: Mauro Calibani'),
    ('04-05', 'C', 'Leap of Nalle',   '7c+', 'two hand jump, FA: Nalle Hukkataival'),
    ('04-05', 'D', 'Track',           '5c',  'slab, FA: La Sportiva-Team'),
    ('06',    'A', 'Blocco James',    '6c',  '45° blackboard with positive holds and big launches, FA: La Sportiva-Team'),
    ('07a',   'A', 'NN',              '5c',  'FA: La Sportiva-Team'),
    ('07b',   'B', 'NN',              '6b',  'FA: La Sportiva-Team'),
    ('07b',   'C', 'NN',              '6a+', 'FA: La Sportiva-Team'),
    ('08',    'A', '3 Grappini',      '8a',  'highball, the hardest block in Pulchiana climbed only by Nalle, FA: Nalle Hukkataival'),
    ('09',    'A', 'NN',              '6b+', 'use right edge, FA: La Sportiva-Team'),
    ('09',    'B', 'NN',              '6a+', 'slab, FA: La Sportiva-Team'),
    ('10a',   'A', 'NN',              '7a+', 'north side of the boulder, FA: La Sportiva-Team'),
    ('10b',   'B', 'NN',              '7a+', 'left edge, FA: La Sportiva-Team'),
    ('10b',   'C', 'NN',              '7a+', 'FA: La Sportiva-Team'),
    ('10b',   'D', 'NN',              '6a',  'right edge, FA: La Sportiva-Team')
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
  on blocks.sektor = 'monte_pulchiana'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
