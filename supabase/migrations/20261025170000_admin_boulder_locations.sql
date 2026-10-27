-- Allow administrators to manage physical boulder GPS markers from the block editor.

grant insert, update, delete on table public.boulder_locations to authenticated;

drop policy if exists "Admins can insert boulder locations" on public.boulder_locations;
drop policy if exists "Admins can update boulder locations" on public.boulder_locations;
drop policy if exists "Admins can delete boulder locations" on public.boulder_locations;

create policy "Admins can insert boulder locations"
on public.boulder_locations
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update boulder locations"
on public.boulder_locations
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete boulder locations"
on public.boulder_locations
for delete
to authenticated
using ((select public.is_admin()));
