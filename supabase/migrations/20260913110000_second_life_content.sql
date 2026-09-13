-- Initial 2nd Life content transcribed from the printed La Cerra topo.
-- The seven entries below represent the seven topo image views of five physical boulders.
-- The migration is repeatable and does not modify blocks or routes in other sectors.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01a-02a', 'Boulder 1A & Boulder 2A', '4.5 m', 'second_life_1a_2a.jpg'),
    ('01b',     'Boulder 1B',              '3 m',   'second_life_1b.jpg'),
    ('02b',     'Boulder 2B',              '4.5 m', 'second_life_2b.jpg'),
    ('03',      'Boulder 3',               '3 m',   'second_life_3.jpg'),
    ('04a',     'Boulder 4A',              '3.5 m', 'second_life_4a.jpg'),
    ('04b',     'Boulder 4B',              '4 m',   'second_life_4b.jpg'),
    ('05',      'Boulder 5',               '2.5 m', 'second_life_5.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'second_life', nummer, name, hoehe, bild
from block_data
on conflict do nothing;

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01a-02a', 'Boulder 1A & Boulder 2A', '4.5 m', 'second_life_1a_2a.jpg'),
    ('01b',     'Boulder 1B',              '3 m',   'second_life_1b.jpg'),
    ('02b',     'Boulder 2B',              '4.5 m', 'second_life_2b.jpg'),
    ('03',      'Boulder 3',               '3 m',   'second_life_3.jpg'),
    ('04a',     'Boulder 4A',              '3.5 m', 'second_life_4a.jpg'),
    ('04b',     'Boulder 4B',              '4 m',   'second_life_4b.jpg'),
    ('05',      'Boulder 5',               '2.5 m', 'second_life_5.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    hoehe = block_data.hoehe,
    bild = block_data.bild
from block_data
where blocks.sektor = 'second_life'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01a-02a', 'A', 'Simple Life',                    '4a',  'start from inside the cave, FA: Flo'),
    ('01a-02a', 'B', 'Patchwork Baby',                 '6b+', 'SD, start on first jug, topout, for more information have a closer look at ''boulder 2'' on the next page, FA: Flo'),
    ('01b',     'A', 'Vanessa machts besser',          '4c',  'FA: Vanessa'),
    ('01b',     'B', 'Don''t move tomorrow',           '6b',  'FA: Flo'),
    ('01b',     'C', 'Project',                        '-',   'open project'),
    ('02b',     'A', '2nd Patchwork Baby (trav.)',     '6c',  'SD, start with undercling and toehooks, top out like B, FA: Flo'),
    ('03',      'A', 'Easy Peasy',                     '5b',  'FA: Elisa'),
    ('03',      'B', 'Project',                        '-',   'open project'),
    ('03',      'C', 'A stich in time saves nine',     '6a',  'FA: Elisa'),
    ('03',      'D', 'NN',                             '5b',  'FA: Vanessa'),
    ('03',      'E', 'NN',                             '5b',  'FA: Vanessa'),
    ('04a',     'A', 'Mother in law',                  '5a',  'SD, FA: Elisa'),
    ('04a',     'B', 'Brother of a different Father', '7a',  'SD on crimp & undercling, FA: Flo'),
    ('04a',     'C', 'Barefoot Wedding',               '6c',  'SD, FA: Flo'),
    ('04a',     'D', 'No more pressure',               '7a',  'SD, FA: Flo'),
    ('04b',     'A', 'Project',                        '-',   'open project'),
    ('04b',     'B', 'Happy Wife happy Life',          '6c',  'SD, top out like C, FA: Flo'),
    ('04b',     'C', 'Vulcano',                        '6b+', 'SD, top out like B, FA: Elisa'),
    ('05',      'A', 'The Frog',                       '6c',  'morpho, FA: Valentin')
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
  on blocks.sektor = 'second_life'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
