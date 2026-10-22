-- Keep the public placeholder for established, unnamed routes consistent.
-- Open projects are intentionally excluded and retain their project naming.
update public.routes
set name = 'N.N.'
where lower(btrim(coalesce(grad, ''))) not in ('', '-', 'project', 'projekt', 'n/a')
  and regexp_replace(lower(btrim(coalesce(name, ''))), '[^a-z0-9]+', '', 'g') in (
    'nn',
    'unnamed',
    'unnamedroute'
  );
