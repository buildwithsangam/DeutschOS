-- RLS tests for P0.1 identity foundation tables.
-- These assertions document and verify the row-level security policies
-- on profiles and consent_records. Run against the Supabase project
-- after applying 20260901000000_identity_foundation.sql.

-- These are SQL-level assertions intended for a Supabase database test
-- runner (supabase test). They are not executed by vitest.

begin;

-- profiles: authenticated user can only see their own row
-- (This test requires a test framework with authenticated role switching.
--  Documented here as the expected behavior.)

-- Verify RLS is enabled
do $$
begin
  assert exists (
    select 1 from pg_tables
    where tablename = 'profiles' and rowsecurity = true
  ), 'profiles should have RLS enabled';
end $$;

-- Verify consent_records RLS is enabled
do $$
begin
  assert exists (
    select 1 from pg_tables
    where tablename = 'consent_records' and rowsecurity = true
  ), 'consent_records should have RLS enabled';
end $$;

-- Verify anon role has no privileges on profiles
do $$
begin
  assert not exists (
    select 1 from information_schema.table_privileges
    where table_name = 'profiles'
    and grantee = 'anon'
  ), 'anon should have no privileges on profiles';
end $$;

-- Verify anon role has no privileges on consent_records
do $$
begin
  assert not exists (
    select 1 from information_schema.table_privileges
    where table_name = 'consent_records'
    and grantee = 'anon'
  ), 'anon should have no privileges on consent_records';
end $$;

-- Verify authenticated role has SELECT, INSERT, UPDATE on profiles
do $$
begin
  assert exists (
    select 1 from information_schema.table_privileges
    where table_name = 'profiles'
    and grantee = 'authenticated'
    and privilege_type = 'SELECT'
  ), 'authenticated should have SELECT on profiles';

  assert exists (
    select 1 from information_schema.table_privileges
    where table_name = 'profiles'
    and grantee = 'authenticated'
    and privilege_type = 'INSERT'
  ), 'authenticated should have INSERT on profiles';

  assert exists (
    select 1 from information_schema.table_privileges
    where table_name = 'profiles'
    and grantee = 'authenticated'
    and privilege_type = 'UPDATE'
  ), 'authenticated should have UPDATE on profiles';
end $$;

-- Verify authenticated role has only SELECT on consent_records (no INSERT/UPDATE/DELETE)
do $$
begin
  assert exists (
    select 1 from information_schema.table_privileges
    where table_name = 'consent_records'
    and grantee = 'authenticated'
    and privilege_type = 'SELECT'
  ), 'authenticated should have SELECT on consent_records';

  assert not exists (
    select 1 from information_schema.table_privileges
    where table_name = 'consent_records'
    and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ), 'authenticated should NOT have INSERT/UPDATE/DELETE on consent_records';
end $$;

-- Verify profiles has a SELECT policy using auth.uid()
do $$
begin
  assert exists (
    select 1 from pg_policies
    where tablename = 'profiles'
    and policyname = 'profiles_select_own'
    and cmd = 'SELECT'
    and qual = 'auth.uid() = id'
  ), 'profiles_select_own policy should use auth.uid() = id';
end $$;

-- Verify consent_records has a SELECT policy using auth.uid()
do $$
begin
  assert exists (
    select 1 from pg_policies
    where tablename = 'consent_records'
    and policyname = 'consent_records_select_own'
    and cmd = 'SELECT'
    and qual = 'auth.uid() = learner_id'
  ), 'consent_records_select_own policy should use auth.uid() = learner_id';
end $$;

rollback;
