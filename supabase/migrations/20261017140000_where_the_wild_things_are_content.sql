-- Add the initial topo content for the unpublished sector Where the Wild Things Are.
-- Boulder 4 has three image views and Boulder 5 has two. Heights intentionally
-- remain empty until they are measured and added by an administrator.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',  'Boulder 1', null::text, 'where_wild_01.jpg'),
    ('02',  'Boulder 2', null::text, 'where_wild_02.jpg'),
    ('03',  'Boulder 3', null::text, 'where_wild_03.jpg'),
    ('04a', 'Boulder 4', null::text, 'where_wild_04a.jpg'),
    ('04b', 'Boulder 4', null::text, 'where_wild_04b.jpg'),
    ('04c', 'Boulder 4', null::text, 'where_wild_04c.jpg'),
    ('05a', 'Boulder 5', null::text, 'where_wild_05a.jpg'),
    ('05b', 'Boulder 5', null::text, 'where_wild_05b.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'where_the_wild_things_are', nummer, name, hoehe, bild
from block_data
where not exists (
  select 1
  from public.blocks as existing
  where existing.sektor = 'where_the_wild_things_are'
    and lower(btrim(existing.nummer)) = lower(block_data.nummer)
);

with block_data (nummer, name, bild) as (
  values
    ('01',  'Boulder 1', 'where_wild_01.jpg'),
    ('02',  'Boulder 2', 'where_wild_02.jpg'),
    ('03',  'Boulder 3', 'where_wild_03.jpg'),
    ('04a', 'Boulder 4', 'where_wild_04a.jpg'),
    ('04b', 'Boulder 4', 'where_wild_04b.jpg'),
    ('04c', 'Boulder 4', 'where_wild_04c.jpg'),
    ('05a', 'Boulder 5', 'where_wild_05a.jpg'),
    ('05b', 'Boulder 5', 'where_wild_05b.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    bild = block_data.bild
from block_data
where blocks.sektor = 'where_the_wild_things_are'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01',  'A', 'Paw Control',         '5b', 'SD, tricky balancing problem'),
    ('01',  'B', 'Tree Stand',          '4a', null),
    ('02',  'A', 'Catch it if you can', '6b', 'SD, one-mover'),
    ('03',  'A', 'N.N.',                '6b', 'up the slopy edge'),
    ('03',  'B', 'Grave of the Gecko',  '6b', 'SD, up the crimps and to the right'),
    ('04a', 'A', 'Baby Boar',           '5b', 'SD'),
    ('04b', 'B', 'Wild Boar',           '7a', 'SD, do not use the big feature (X) - not solid!'),
    ('04c', 'A', 'Viewpoint',           '3a', 'SD'),
    ('04c', 'B', 'Project',             '-',  'open project'),
    ('05a', 'A', 'Why not?',            '3a', null),
    ('05b', 'A', 'BBQ',                 '5b', 'SD'),
    ('05b', 'B', 'Project',             '-',  'open project'),
    ('05b', 'C', 'Project',             '-',  'open project')
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
  on blocks.sektor = 'where_the_wild_things_are'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
