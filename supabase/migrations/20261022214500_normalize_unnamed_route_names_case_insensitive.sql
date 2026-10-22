-- Correct the normalization order so uppercase placeholder variants are matched.
update public.routes
set name = 'N.N.'
where lower(btrim(coalesce(grad, ''))) not in ('', '-', 'project', 'projekt', 'n/a')
  and regexp_replace(lower(btrim(coalesce(name, ''))), '[^a-z0-9]+', '', 'g') in (
    'nn',
    'unnamed',
    'unnamedroute'
  );
