alter table public.sector_settings
  add column if not exists description text;

comment on column public.sector_settings.description is
  'Optional plain-text sector description managed in the admin area. NULL keeps the description bundled with the website.';

grant update (label, description, is_visible) on table public.sector_settings to authenticated;

