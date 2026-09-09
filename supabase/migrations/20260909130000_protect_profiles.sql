-- Deploy the matching website and username_login Edge Function first.
-- This removes the old anonymous username-to-email lookup afterwards.

drop policy if exists "allow search by username" on public.profiles;
