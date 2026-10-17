-- Add the initial topo content for the unpublished sector Piru Ruju.
-- Boulder 5 has two image views. Heights intentionally remain empty until
-- they are measured and added by an administrator.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01',  'Boulder 1', null::text, 'piru_ruju_01.jpg'),
    ('02',  'Boulder 2', null::text, 'piru_ruju_02.jpg'),
    ('03',  'Boulder 3', null::text, 'piru_ruju_03.jpg'),
    ('04',  'Boulder 4', null::text, 'piru_ruju_04.jpg'),
    ('05a', 'Boulder 5', null::text, 'piru_ruju_05a.jpg'),
    ('05b', 'Boulder 5', null::text, 'piru_ruju_05b.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'piru_ruju', nummer, name, hoehe, bild
from block_data
where not exists (
  select 1
  from public.blocks as existing
  where existing.sektor = 'piru_ruju'
    and lower(btrim(existing.nummer)) = lower(block_data.nummer)
);

with block_data (nummer, name, bild) as (
  values
    ('01',  'Boulder 1', 'piru_ruju_01.jpg'),
    ('02',  'Boulder 2', 'piru_ruju_02.jpg'),
    ('03',  'Boulder 3', 'piru_ruju_03.jpg'),
    ('04',  'Boulder 4', 'piru_ruju_04.jpg'),
    ('05a', 'Boulder 5', 'piru_ruju_05a.jpg'),
    ('05b', 'Boulder 5', 'piru_ruju_05b.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    bild = block_data.bild
from block_data
where blocks.sektor = 'piru_ruju'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01',  'A', 'N.N.',             '6a', 'SD, nice little roof'),
    ('02',  'A', 'N.N.',             '4c', 'SD'),
    ('03',  'A', 'N.N.',             '6b', 'SD, one move'),
    ('04',  'A', 'N.N.',             '2c', 'SD'),
    ('04',  'B', 'N.N.',             '5b', 'SD, traverse around the block'),
    ('05a', 'A', 'N.N.',             '5a', 'SD'),
    ('05a', 'B', 'Gilty Pleasure',   '5c', 'SD'),
    ('05b', 'C', 'Cat on the Table', '5b', 'SD'),
    ('05b', 'D', 'N.N.',             '5b', 'SD')
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
  on blocks.sektor = 'piru_ruju'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
