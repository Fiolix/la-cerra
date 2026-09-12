-- Initial Bermuda Triangle content transcribed from the printed La Cerra topo.
-- The migration is repeatable and does not modify blocks or routes in other sectors.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',  'Boulder 1',   '5 m',   'bermuda_triangle_1.jpg'),
    ('02a', 'Boulder 2',   '4 m',   'bermuda_triangle_2a.jpg'),
    ('02b', 'Boulder 2',   '4 m',   'bermuda_triangle_2b.jpg'),
    ('02c', 'Boulder 2',   '4 m',   'bermuda_triangle_2c.jpg'),
    ('03',  'Boulder 3',   '3.5 m', 'bermuda_triangle_3.jpg'),
    ('04a', 'Boulder 4',   '3.5 m', 'bermuda_triangle_4a.jpg'),
    ('04b', 'Boulder 4',   '3.5 m', 'bermuda_triangle_4b.jpg'),
    ('05',  'Streetblock', '3.5 m', 'bermuda_triangle_5.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'bermuda_triangle', nummer, name, hoehe, bild
from block_data
on conflict do nothing;

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',  'Boulder 1',   '5 m',   'bermuda_triangle_1.jpg'),
    ('02a', 'Boulder 2',   '4 m',   'bermuda_triangle_2a.jpg'),
    ('02b', 'Boulder 2',   '4 m',   'bermuda_triangle_2b.jpg'),
    ('02c', 'Boulder 2',   '4 m',   'bermuda_triangle_2c.jpg'),
    ('03',  'Boulder 3',   '3.5 m', 'bermuda_triangle_3.jpg'),
    ('04a', 'Boulder 4',   '3.5 m', 'bermuda_triangle_4a.jpg'),
    ('04b', 'Boulder 4',   '3.5 m', 'bermuda_triangle_4b.jpg'),
    ('05',  'Streetblock', '3.5 m', 'bermuda_triangle_5.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    hoehe = block_data.hoehe,
    bild = block_data.bild
from block_data
where blocks.sektor = 'bermuda_triangle'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01',  'A', 'NN',                '5c', 'easiest downclimb, FA: Anne & Jan'),
    ('01',  'B', 'NN',                '6a', 'FA: Anne & Jan'),
    ('02a', 'A', 'Project',           '-',  null),
    ('02a', 'B', 'Project',           '-',  null),
    ('02a', 'C', 'Project',           '-',  null),
    ('02a', 'D', 'Project',           '-',  null),
    ('02b', 'E', 'NN',                '6a+', 'slab, marked with blue arrow, FA: NN'),
    ('02c', 'F', 'Scary Mov(i)e',     '6a', 'marked with blue arrow, start at the crack, move to the ''horn'' in the slab, FA: Martin'),
    ('02c', 'G', 'NN',                '5b', 'marked with blue arrow, through the crack, FA: NN, grading: Martin'),
    ('03',  'A', 'Leska (trav.)',     '5a', 'from left to the jug and top out, FA: Martin'),
    ('03',  'B', 'Anurag',            '5c', 'reachy start, FA: Martin'),
    ('04a', 'A', 'NN',                '6b', 'SD using small block (blue dot), marked with blue arrow, FA: NN'),
    ('04a', 'B', 'NN',                '5b', 'marked with blue arrow, FA: NN'),
    ('04a', 'C', 'NN',                '6a', 'SD, marked with blue arrow, FA: NN'),
    ('04b', 'D', 'NN',                '?',  'SD, marked with blue arrow, FA: NN'),
    ('05',  'A', 'Drive Thru',        '5a', 'FA: Martin'),
    ('05',  'B', 'Drive by Shooting', '5c', 'FA: Martin'),
    ('05',  'C', 'Project',           '-',  null)
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
  on blocks.sektor = 'bermuda_triangle'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
