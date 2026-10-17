-- Add Boulder 6 and the two topo views of Boulder 7 from the October 2026 supplement.
-- Heights intentionally remain empty until they are measured and added by an administrator.
-- Routes C and D are stored once under view 07a. The website also displays them
-- below view 07b through a presentation-only alias, so personal lists are not duplicated.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('06',  'Boulder 6', null::text, 'bermuda_triangle_6.jpg'),
    ('07a', 'Boulder 7', null::text, 'bermuda_triangle_7a.jpg'),
    ('07b', 'Boulder 7', null::text, 'bermuda_triangle_7b.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'bermuda_triangle', nummer, name, hoehe, bild
from block_data
where not exists (
  select 1
  from public.blocks as existing
  where existing.sektor = 'bermuda_triangle'
    and lower(btrim(existing.nummer)) = lower(block_data.nummer)
);

with block_data (nummer, name, bild) as (
  values
    ('06',  'Boulder 6', 'bermuda_triangle_6.jpg'),
    ('07a', 'Boulder 7', 'bermuda_triangle_7a.jpg'),
    ('07b', 'Boulder 7', 'bermuda_triangle_7b.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    bild = block_data.bild
from block_data
where blocks.sektor = 'bermuda_triangle'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('06',  'A', 'Shield of La Cerra', '6a',  'SD'),
    ('07a', 'A', 'N.N.',               '6b',  'dynamic move from sloper'),
    ('07a', 'B', 'N.N.',               '4c',  'up the crack'),
    ('07a', 'C', 'N.N.',               '6a+', 'SD, tricky sit start'),
    ('07a', 'D', 'N.N.',               '6a',  'SD, top out to the right'),
    ('07b', 'E', 'Lower is possible',  '6c',  'SD, start as low as possible')
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
