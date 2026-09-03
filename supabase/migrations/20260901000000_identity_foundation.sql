/*
# Identity & Authentication Foundation (P0.1)

## Purpose
Establishes the learner identity layer: profiles and consent_records.
Additive only — no changes to existing curriculum tables, policies, or grants.

## New Tables
### profiles
- id (UUID, PK, FK → auth.users ON DELETE CASCADE)
- display_name (text, nullable)
- timezone (text, NOT NULL, default 'Europe/Berlin')
- target_exam_track_id (UUID, nullable — no FK yet, exam tables don't exist)
- consent_version (text, nullable)
- consented_at (timestamptz, nullable)
- created_at, updated_at (timestamptz, NOT NULL, default now())

### consent_records
- id (UUID, PK)
- learner_id (UUID, NOT NULL, FK → profiles ON DELETE CASCADE)
- feature (text, NOT NULL, CHECK in allowed set)
- action (text, NOT NULL, CHECK in 'grant','withdraw')
- consent_version (text, nullable)
- recorded_at (timestamptz, NOT NULL, default now())

## Security
- profiles RLS: SELECT/INSERT/UPDATE for authenticated (own row only via auth.uid()=id). DELETE service_role only.
- consent_records RLS: SELECT for authenticated (own rows). INSERT/UPDATE/DELETE service_role only.
- anon role has no access to either table.

## Important Notes
1. No changes to existing curriculum tables, policies, or grants.
2. target_exam_track_id has no FK — added when exam foundation creates exam_tracks.
3. Profile creation happens in the auth callback via the user's session client (INSERT policy allows auth.uid()=id only).
4. Service-role credentials never reach the browser.
*/

begin;

create extension if not exists pgcrypto;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Berlin',
  target_exam_track_id uuid,
  consent_version text,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

-- consent_records
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (
    feature in ('ai_explanation', 'ai_feedback', 'audio_recording',
                'audio_transcription', 'journal_feedback')
  ),
  action text not null check (action in ('grant', 'withdraw')),
  consent_version text,
  recorded_at timestamptz not null default now()
);

create index if not exists consent_records_learner_idx
  on public.consent_records (learner_id, feature);

alter table public.consent_records enable row level security;

drop policy if exists "consent_records_select_own" on public.consent_records;

create policy "consent_records_select_own"
  on public.consent_records for select
  to authenticated
  using (auth.uid() = learner_id);

revoke all on table public.consent_records from anon, authenticated;
grant select on table public.consent_records to authenticated;
grant select, insert, update, delete on table public.consent_records to service_role;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

commit;
