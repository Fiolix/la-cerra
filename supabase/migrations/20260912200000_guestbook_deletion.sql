-- Permanent guestbook deletion for administrators and moderators.

create or replace function public.delete_guestbook_entry(target_entry_id bigint)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if not public.can_moderate_guestbook() then
    raise exception 'moderator_required' using errcode = '42501';
  end if;

  select 1 + count(*)::integer into deleted_count
  from public.guestbook_entries
  where parent_id = target_entry_id;

  delete from public.guestbook_entries
  where id = target_entry_id;

  if not found then
    raise exception 'entry_not_found' using errcode = 'P0002';
  end if;

  return deleted_count;
end;
$$;

revoke all on function public.delete_guestbook_entry(bigint) from public, anon, authenticated;
grant execute on function public.delete_guestbook_entry(bigint) to authenticated;

comment on function public.delete_guestbook_entry(bigint) is
  'Permanently deletes one guestbook entry. Replies are deleted with their parent through the foreign key cascade.';
