-- Initial Monte Lu Bagnu content transcribed from the printed La Cerra topo.
-- The seventeen entries represent the illustrated topo views in Jumble and Bloc Meadow.
-- More distant sub-sectors are not inserted because the guide provides no block images
-- or reliable route-to-block assignment for them.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('J-01',    'Jumble - Boulder 1',             '3-5 m', 'monte_lu_bagnu_j01.jpg'),
    ('J-02',    'Jumble - Boulder 2',             '3-5 m', 'monte_lu_bagnu_j02.jpg'),
    ('J-03',    'Jumble - Boulder 3',             '3-5 m', 'monte_lu_bagnu_j03.jpg'),
    ('J-04a',   'Jumble - Boulder 4A',            '3-5 m', 'monte_lu_bagnu_j04a.jpg'),
    ('J-04b',   'Jumble - Boulder 4B',            '3-5 m', 'monte_lu_bagnu_j04b.jpg'),
    ('J-05',    'Jumble - Boulder 5',             '3-5 m', 'monte_lu_bagnu_j05.jpg'),
    ('J-06',    'Jumble - Boulder 6',             '3-5 m', 'monte_lu_bagnu_j06.jpg'),
    ('J-07',    'Jumble - Boulder 7',             '3-5 m', 'monte_lu_bagnu_j07.jpg'),
    ('BM-01-02','Bloc Meadow - Boulders 1 & 2',   '3-5 m', 'monte_lu_bagnu_bm01_02.jpg'),
    ('BM-03',   'Bloc Meadow - Boulder 3',        '3-5 m', 'monte_lu_bagnu_bm03.jpg'),
    ('BM-04',   'Bloc Meadow - Boulder 4',        '3-5 m', 'monte_lu_bagnu_bm04.jpg'),
    ('BM-05',   'Bloc Meadow - Boulder 5',        '3-5 m', 'monte_lu_bagnu_bm05.jpg'),
    ('BM-06',   'Bloc Meadow - Kidsblock',        '3-5 m', 'monte_lu_bagnu_bm06.jpg'),
    ('BM-07',   'Bloc Meadow - Boulder 7',        '3-5 m', 'monte_lu_bagnu_bm07.jpg'),
    ('BM-08',   'Bloc Meadow - Boulder 8',        '3-5 m', 'monte_lu_bagnu_bm08.jpg'),
    ('BM-09',   'Bloc Meadow - Boulder 9',        '3-5 m', 'monte_lu_bagnu_bm09.jpg'),
    ('BM-10',   'Bloc Meadow - Boulder 10',       '3-5 m', 'monte_lu_bagnu_bm10.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'monte_lu_bagnu', nummer, name, hoehe, bild
from block_data
on conflict do nothing;

with block_data (nummer, name, hoehe, bild) as (
  values
    ('J-01',    'Jumble - Boulder 1',             '3-5 m', 'monte_lu_bagnu_j01.jpg'),
    ('J-02',    'Jumble - Boulder 2',             '3-5 m', 'monte_lu_bagnu_j02.jpg'),
    ('J-03',    'Jumble - Boulder 3',             '3-5 m', 'monte_lu_bagnu_j03.jpg'),
    ('J-04a',   'Jumble - Boulder 4A',            '3-5 m', 'monte_lu_bagnu_j04a.jpg'),
    ('J-04b',   'Jumble - Boulder 4B',            '3-5 m', 'monte_lu_bagnu_j04b.jpg'),
    ('J-05',    'Jumble - Boulder 5',             '3-5 m', 'monte_lu_bagnu_j05.jpg'),
    ('J-06',    'Jumble - Boulder 6',             '3-5 m', 'monte_lu_bagnu_j06.jpg'),
    ('J-07',    'Jumble - Boulder 7',             '3-5 m', 'monte_lu_bagnu_j07.jpg'),
    ('BM-01-02','Bloc Meadow - Boulders 1 & 2',   '3-5 m', 'monte_lu_bagnu_bm01_02.jpg'),
    ('BM-03',   'Bloc Meadow - Boulder 3',        '3-5 m', 'monte_lu_bagnu_bm03.jpg'),
    ('BM-04',   'Bloc Meadow - Boulder 4',        '3-5 m', 'monte_lu_bagnu_bm04.jpg'),
    ('BM-05',   'Bloc Meadow - Boulder 5',        '3-5 m', 'monte_lu_bagnu_bm05.jpg'),
    ('BM-06',   'Bloc Meadow - Kidsblock',        '3-5 m', 'monte_lu_bagnu_bm06.jpg'),
    ('BM-07',   'Bloc Meadow - Boulder 7',        '3-5 m', 'monte_lu_bagnu_bm07.jpg'),
    ('BM-08',   'Bloc Meadow - Boulder 8',        '3-5 m', 'monte_lu_bagnu_bm08.jpg'),
    ('BM-09',   'Bloc Meadow - Boulder 9',        '3-5 m', 'monte_lu_bagnu_bm09.jpg'),
    ('BM-10',   'Bloc Meadow - Boulder 10',       '3-5 m', 'monte_lu_bagnu_bm10.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    hoehe = block_data.hoehe,
    bild = block_data.bild
from block_data
where blocks.sektor = 'monte_lu_bagnu'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('J-01',     'A', 'Midget',             '5',   'SD, small problem but a little powerful, start on the low break then slap to arete and pull over.'),
    ('J-02',     'A', 'Breakdance',         '5',   'SD, might have to squeeze through the top part.'),
    ('J-02',     'B', 'Lichen Chute',       '6a',  'SD, thin start to nice juggy side pull and top out.'),
    ('J-03',     'A', 'Grease It Up',       '7a',  'SD in the back of the cave, climb along the rail and finish up the slab.'),
    ('J-03',     'B', 'Hairy Slab',         '4',   'Climb the middle of the easy slab to the right of Grease It Up.'),
    ('J-04a',    'A', 'Snail',              '5',   'SD around the right and traverse up and around until reaching the highpoint. Variation: SD in same place but rock over straight up (Fb 4).'),
    ('J-04b',    'B', 'Camel',              '5+',  'SD, same boulder as Snail. From two different angles the boulder looks like the two different animals.'),
    ('J-05',     'A', 'Smack My Sloper',    '7b',  'Start on the juggy rail just under the roof, slap right up to the slopers and top out awkwardly. A sit start is possible.'),
    ('J-06',     'A', 'Sun Shredder',       '6a+', 'SD on the obvious jug, pull round and up through the blocks, finish at the very top.'),
    ('J-07',     'A', 'Holy Moly',           '7a',  'Start on big flakes, pull up and move through the two big holes to the top.'),
    ('BM-01-02', 'A', 'Trefoil',             '7a+', 'Start on good holds and pull up into the Adidas trefoil feature, balance your way up to a slopey top out.'),
    ('BM-01-02', 'B', 'Crater',              '6b',  'Start with left hand on the right side of the left crater, pull up and throw to lip then traverse left and top out.'),
    ('BM-03',    'A', 'Malte',               '5b',  'FA: tmms-Team'),
    ('BM-03',    'B', 'Andi (trav.)',        '5c+', 'FA: tmms-Team'),
    ('BM-03',    'C', 'Nadja',               '4a',  'FA: tmms-Team'),
    ('BM-03',    'D', 'Kamil',               '4b',  'FA: tmms-Team'),
    ('BM-04',    'A', 'Qui',                 '3b',  'FA: tmms-Team'),
    ('BM-04',    'B', 'Quo',                 '5c',  'SD, FA: tmms-Team'),
    ('BM-04',    'C', 'Qua',                 '4b',  'FA: tmms-Team'),
    ('BM-05',    'A', 'Blocks in the hood',  '5c+', 'FA: tmms-Team'),
    ('BM-05',    'B', 'Pancake rock',        '5b',  'FA: tmms-Team'),
    ('BM-06',    'A', 'Tick',                '3a',  'FA: tmms-Team'),
    ('BM-06',    'B', 'Trick',               '3a',  'FA: tmms-Team'),
    ('BM-06',    'C', 'Track',               '3b',  'FA: tmms-Team'),
    ('BM-07',    'A', 'Treasure Cove',       '6b+', 'SD on slopey ledge, pull up and right then make a long move left and top out up the slab.'),
    ('BM-07',    'B', 'Guacamander',         '7a',  'SD as for Treasure Cove but climb out right using underclings and the left arete. Top out rocking over the end of the nose feature and climbing the end slab to the top.'),
    ('BM-08',    'A', 'Saharan Sky',         '7a',  'Start on small edges, balance up and make a lunge to the top. There are a few more good looking harder problems to do on this bloc.'),
    ('BM-09',    'A', 'Bread Addiction',     '6b',  'Jump start into the obvious hole feature and move out right to the top.'),
    ('BM-10',    'A', 'Windswept',           '6c+', 'Start standing midway in the roof, pull on and up to the lip before traversing right and up the slabby top out.'),
    ('BM-10',    'B', 'Windblown',           '6b',  'SD matched on obvious good edge, slap over the lip and join the top of Windswept.')
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
  on blocks.sektor = 'monte_lu_bagnu'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
