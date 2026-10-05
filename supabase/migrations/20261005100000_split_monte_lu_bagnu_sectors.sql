-- Split the two illustrated Monte Lu Bagnu areas into independent sectors.
-- Route rows keep their existing block_id, preserving all user ticks.

insert into public.sector_settings (slug, label, is_visible, display_order)
values
  ('jumble', 'Jumble', true, 70),
  ('bloc_meadow', 'Bloc Meadow', true, 80),
  ('monte_lu_bagnu', 'Monte Lu Bagnu', true, 90),
  ('monte_pulchiana', 'Monte Pulchiana', true, 100)
on conflict (slug) do update
set label = excluded.label,
    display_order = excluded.display_order;

update public.blocks
set sektor = 'jumble',
    nummer = regexp_replace(nummer, '^J-', '', 'i'),
    name = regexp_replace(name, '^Jumble - ', '', 'i'),
    bild = case lower(bild)
      when 'monte_lu_bagnu_j01.jpg' then 'jumble_01.jpg'
      when 'monte_lu_bagnu_j02.jpg' then 'jumble_02.jpg'
      when 'monte_lu_bagnu_j03.jpg' then 'jumble_03.jpg'
      when 'monte_lu_bagnu_j04a.jpg' then 'jumble_04a.jpg'
      when 'monte_lu_bagnu_j04b.jpg' then 'jumble_04b.jpg'
      when 'monte_lu_bagnu_j05.jpg' then 'jumble_05.jpg'
      when 'monte_lu_bagnu_j06.jpg' then 'jumble_06.jpg'
      when 'monte_lu_bagnu_j07.jpg' then 'jumble_07.jpg'
      else bild
    end
where sektor = 'monte_lu_bagnu'
  and nummer ~* '^J-';

update public.blocks
set sektor = 'bloc_meadow',
    nummer = regexp_replace(nummer, '^BM-', '', 'i'),
    name = regexp_replace(name, '^Bloc Meadow - ', '', 'i'),
    bild = case lower(bild)
      when 'monte_lu_bagnu_bm01_02.jpg' then 'bloc_meadow_01_02.jpg'
      when 'monte_lu_bagnu_bm03.jpg' then 'bloc_meadow_03.jpg'
      when 'monte_lu_bagnu_bm04.jpg' then 'bloc_meadow_04.jpg'
      when 'monte_lu_bagnu_bm05.jpg' then 'bloc_meadow_05.jpg'
      when 'monte_lu_bagnu_bm06.jpg' then 'bloc_meadow_06.jpg'
      when 'monte_lu_bagnu_bm07.jpg' then 'bloc_meadow_07.jpg'
      when 'monte_lu_bagnu_bm08.jpg' then 'bloc_meadow_08.jpg'
      when 'monte_lu_bagnu_bm09.jpg' then 'bloc_meadow_09.jpg'
      when 'monte_lu_bagnu_bm10.jpg' then 'bloc_meadow_10.jpg'
      else bild
    end
where sektor = 'monte_lu_bagnu'
  and nummer ~* '^BM-';

-- Make repeat execution safe after the rows have already been moved.
update public.blocks set bild = regexp_replace(bild, '^monte_lu_bagnu_j', 'jumble_', 'i')
where sektor = 'jumble' and bild ~* '^monte_lu_bagnu_j';

update public.blocks set bild = regexp_replace(bild, '^monte_lu_bagnu_bm', 'bloc_meadow_', 'i')
where sektor = 'bloc_meadow' and bild ~* '^monte_lu_bagnu_bm';
