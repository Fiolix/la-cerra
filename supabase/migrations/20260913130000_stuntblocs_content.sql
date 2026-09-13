-- Initial Stuntblocs content transcribed from the printed La Cerra topo.
-- The twenty entries below represent the twenty visible topo image views of nineteen physical boulders.
-- The migration is repeatable and does not modify blocks or routes in other sectors.

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01a',   'Welcome Bloc A',                 '4.5 m',       'stuntblocs_01a.jpg'),
    ('01b',   'Welcome Bloc B',                 '4.5 m',       'stuntblocs_01b.jpg'),
    ('02',    'Boulder 2',                      '3.5 m',       'stuntblocs_02.jpg'),
    ('03a',   'Boulder 3A',                     '6 m',         'stuntblocs_03a.jpg'),
    ('03b',   'Boulder 3B',                     '6 m',         'stuntblocs_03b.jpg'),
    ('04',    'Boulder 4',                      '3 m',         'stuntblocs_04.jpg'),
    ('05',    'Boulder 5',                      '4 m',         'stuntblocs_05.jpg'),
    ('06',    'Boulder 6',                      '5 m',         'stuntblocs_06.jpg'),
    ('07',    'Boulder 7',                      '4.5 m',       'stuntblocs_07.jpg'),
    ('08',    'Boulder 8',                      '3 m',         'stuntblocs_08.jpg'),
    ('09',    'Dragon Ball',                    '3 m',         'stuntblocs_09.jpg'),
    ('10',    'Marketplace',                    '7 m',         'stuntblocs_10.jpg'),
    ('11',    'Boulder 11',                     '2.5 m',       'stuntblocs_11.jpg'),
    ('12-13', 'Boulder 12 & Boulder 13',        '2 m & 2.5 m', 'stuntblocs_12_13.jpg'),
    ('14',    'Boulder 14',                     '3 m',         'stuntblocs_14.jpg'),
    ('15',    'Miras Bloc',                     '3 m',         'stuntblocs_15.jpg'),
    ('16a',   'Boulder 16A',                    '4 m',         'stuntblocs_16a.jpg'),
    ('16b',   'Boulder 16B',                    '4 m',         'stuntblocs_16b.jpg'),
    ('17',    'Boulder 17',                     '2.5 m',       'stuntblocs_17.jpg'),
    ('18-19', 'The Crack & Boulder 19',         '6 m & 3 m',   'stuntblocs_18_19.jpg')
)
insert into public.blocks (sektor, nummer, name, hoehe, bild)
select 'stuntblocs', nummer, name, hoehe, bild
from block_data
on conflict do nothing;

with block_data (nummer, name, hoehe, bild) as (
  values
    ('01a',   'Welcome Bloc A',                 '4.5 m',       'stuntblocs_01a.jpg'),
    ('01b',   'Welcome Bloc B',                 '4.5 m',       'stuntblocs_01b.jpg'),
    ('02',    'Boulder 2',                      '3.5 m',       'stuntblocs_02.jpg'),
    ('03a',   'Boulder 3A',                     '6 m',         'stuntblocs_03a.jpg'),
    ('03b',   'Boulder 3B',                     '6 m',         'stuntblocs_03b.jpg'),
    ('04',    'Boulder 4',                      '3 m',         'stuntblocs_04.jpg'),
    ('05',    'Boulder 5',                      '4 m',         'stuntblocs_05.jpg'),
    ('06',    'Boulder 6',                      '5 m',         'stuntblocs_06.jpg'),
    ('07',    'Boulder 7',                      '4.5 m',       'stuntblocs_07.jpg'),
    ('08',    'Boulder 8',                      '3 m',         'stuntblocs_08.jpg'),
    ('09',    'Dragon Ball',                    '3 m',         'stuntblocs_09.jpg'),
    ('10',    'Marketplace',                    '7 m',         'stuntblocs_10.jpg'),
    ('11',    'Boulder 11',                     '2.5 m',       'stuntblocs_11.jpg'),
    ('12-13', 'Boulder 12 & Boulder 13',        '2 m & 2.5 m', 'stuntblocs_12_13.jpg'),
    ('14',    'Boulder 14',                     '3 m',         'stuntblocs_14.jpg'),
    ('15',    'Miras Bloc',                     '3 m',         'stuntblocs_15.jpg'),
    ('16a',   'Boulder 16A',                    '4 m',         'stuntblocs_16a.jpg'),
    ('16b',   'Boulder 16B',                    '4 m',         'stuntblocs_16b.jpg'),
    ('17',    'Boulder 17',                     '2.5 m',       'stuntblocs_17.jpg'),
    ('18-19', 'The Crack & Boulder 19',         '6 m & 3 m',   'stuntblocs_18_19.jpg')
)
update public.blocks as blocks
set name = block_data.name,
    hoehe = block_data.hoehe,
    bild = block_data.bild
from block_data
where blocks.sektor = 'stuntblocs'
  and lower(btrim(blocks.nummer)) = lower(block_data.nummer);

with route_data (block_number, buchstabe, name, grad, beschreibung) as (
  values
    ('01a',   'A', 'Sharkfin',              '5b',   'SD, FA: Steffen'),
    ('01a',   'B', 'Stingray',              '5b',   'SD, FA: Steffen'),
    ('01a',   'C', 'Humpback Whale',        '5c',   'SD, FA: Steffen'),
    ('01b',   'D', 'Nur zum Spaß!',         '5c',   'SD, no topout, FA: Martin'),
    ('01b',   'E', 'Sunny side up!',        '4c',   'SD, no topout, FA: Martin'),
    ('01b',   'F', 'Ugly finish',           '6a',   'SD, no topout, FA: Martin'),
    ('02',    'A', 'NN',                    '4b',   'slab, FA: Stuntwerk-Team'),
    ('02',    'B', 'Alter Falter',          '4c',   'slab, FA: Stuntwerk-Team'),
    ('03a',   'A', 'NN (trav.)',            '6b',   'FA: Stuntwerk-Team'),
    ('03a',   'B', 'Left diretissima',      '5c',   'FA: Stuntwerk-Team'),
    ('03a',   'C', 'Project',               '-',    'open project'),
    ('03a',   'D', 'Central diretissima',   '6b/c', 'FA: Stuntwerk-Team'),
    ('03b',   'E', 'NN',                    '6a',   'alternative start for A, FA: Stuntwerk-Team'),
    ('03b',   'F', 'My Signature Move',     '7a+',  'FA: Stuntwerk-Team'),
    ('03b',   'G', 'Highball Jonsi',        '6a+',  'FA: Stuntwerk-Team'),
    ('04',    'A', 'NN',                    '3a',   'left edge, FA: Stuntwerk-Team'),
    ('04',    'B', 'NN',                    '4c',   'center, FA: Stuntwerk-Team'),
    ('04',    'C', 'NN',                    '4c',   'right edge, FA: Stuntwerk-Team'),
    ('04',    'D', 'NN',                    '5b',   'right mantle, FA: Stuntwerk-Team'),
    ('05',    'A', 'NN',                    '6b',   'left dicet, FA: Stuntwerk-Team'),
    ('05',    'B', 'NaDu',                  '6b',   'left edge, FA: Stuntwerk-Team'),
    ('05',    'C', 'NaSie',                 '7b',   'right edge, FA: Stuntwerk-Team'),
    ('06',    'A', 'NN',                    '3a',   'FA: tmms-Team'),
    ('06',    'B', 'NN',                    '4a',   'left edge, FA: Stuntwerk-Team'),
    ('06',    'C', 'Travestie (trav.)',     '4a',   'from boulder 6 to boulder 7 & top out, FA: Stuntwerk-Team'),
    ('06',    'D', 'NN',                    '4b',   'center, FA: Stuntwerk-Team'),
    ('06',    'E', 'NN',                    '4a',   'right edge, FA: Stuntwerk-Team'),
    ('07',    'F', 'NN',                    '4b',   'left edge, FA: Stuntwerk-Team'),
    ('07',    'G', 'NN',                    '4a',   'FA: tmms-Team'),
    ('07',    'H', 'NN',                    '4a',   'right edge, FA: Stuntwerk-Team'),
    ('08',    'A', 'NN (trav.)',            '5b',   'FA: Stuntwerk-Team'),
    ('08',    'B', 'NN',                    '4a',   'FA: tmms-Team'),
    ('08',    'C', 'Hopp & Topp',           '4b',   'right edge, FA: Stuntwerk-Team'),
    ('09',    'A', 'Dragon Ball',           '6c+',  'FA: Stuntwerk-Team'),
    ('10',    'A', 'Balancieren',           '6c+',  'FA: Stuntwerk-Team'),
    ('10',    'B', 'Ballern',               '7a',   'SD, FA: Stuntwerk-Team'),
    ('10',    'C', 'Project',               '-',    'open project'),
    ('10',    'D', 'Chillout',              '6c',   'SD, no topout, FA: Stuntwerk-Team'),
    ('10',    'E', 'Gethigh',               '7a+',  'SD, no topout, FA: Stuntwerk-Team'),
    ('11',    'A', 'Tribal Art (trav.)',    '5a',   'SD, from right to left, FA: tmms-Team'),
    ('12-13', 'A', 'Quarzdike',             '6a',   'SD via quartz line, FA: tmms-Team'),
    ('12-13', 'B', 'Project',               '-',    'open project'),
    ('12-13', 'C', 'Project',               '-',    'open project'),
    ('14',    'A', 'Dirty old town',        '5b',   'SD, slab, FA: tmms-Team'),
    ('14',    'B', 'Edge or Ledge',         '4a',   'slab, FA: tmms-Team'),
    ('14',    'C', 'Slippery when wet',     '4b',   'slab, FA: tmms-Team'),
    ('14',    'D', 'Greetings from Bleau',  '5b',   'slab, FA: tmms-Team'),
    ('15',    'A', 'Black Hole',            '4c',   'FA: Mira'),
    ('16a',   'A', 'Project',               '-',    'open project'),
    ('16b',   'B', 'Hueco',                 '6b',   'SD, scary sloper topout, FA: tmms-Team'),
    ('16b',   'C', 'Project',               '-',    'open project'),
    ('17',    'A', 'Wackel Platte',         '5a',   'slab, FA: Stuntwerk-Team'),
    ('18-19', 'A', 'Crackstreet Boiz',      '6a',   'highball, FA: Stuntwerk-Team'),
    ('18-19', 'B', 'Kindergeburtstag',      '6b',   'left edge, FA: Stuntwerk-Team'),
    ('18-19', 'C', 'STUNTCREW''s finest',   '6b+',  'FA: Stuntwerk-Team')
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
  on blocks.sektor = 'stuntblocs'
 and lower(btrim(blocks.nummer)) = lower(route_data.block_number)
where not exists (
  select 1
  from public.routes as existing
  where existing.block_id = blocks.id
    and lower(btrim(existing.buchstabe)) = lower(route_data.buchstabe)
    and existing.archived_at is null
);
