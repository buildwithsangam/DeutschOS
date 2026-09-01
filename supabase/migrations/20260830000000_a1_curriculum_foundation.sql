-- A1 curriculum data foundation.
--
-- This migration deliberately defines the canonical-content structure only.
-- It does not import the finalized 42-day curriculum, create learner state, or
-- implement planning, review, attempts, or assessment behavior.

begin;

create extension if not exists pgcrypto;

create type public.curriculum_publication_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.curriculum_provenance_type as enum (
  'original_deutschos',
  'official_reference',
  'licensed',
  'rights_cleared'
);

create type public.curriculum_section_kind as enum (
  'main_lesson',
  'grammar',
  'vocabulary',
  'pronunciation',
  'listening',
  'speaking',
  'reading',
  'writing',
  'sentence_builder',
  'retrieval_review',
  'practical_task',
  'communication_repair',
  'realistic_interaction',
  'mastery_check',
  'daily_german_core'
);

create type public.curriculum_skill as enum (
  'listening',
  'speaking',
  'reading',
  'writing',
  'pronunciation'
);

create table public.curriculum_provenance_sources (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  provenance_type public.curriculum_provenance_type not null,
  title text not null check (btrim(title) <> ''),
  source_url text,
  rights_basis text not null check (btrim(rights_basis) <> ''),
  attribution_text text,
  effective_on date,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (source_url is null or btrim(source_url) <> '')
);

create table public.curriculum_releases (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  title text not null check (btrim(title) <> ''),
  release_version text not null check (btrim(release_version) <> ''),
  cefr_level text not null default 'A1' check (cefr_level = 'A1'),
  publication_status public.curriculum_publication_status not null default 'draft',
  is_active boolean not null default false,
  provenance_source_id uuid not null references public.curriculum_provenance_sources(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stable_key, release_version),
  check (not is_active or publication_status = 'published'),
  check (publication_status <> 'published' or published_at is not null)
);

create unique index curriculum_releases_one_active_a1_release
  on public.curriculum_releases (cefr_level)
  where is_active;

create table public.curriculum_weeks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.curriculum_releases(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 6),
  stable_key text not null unique,
  title text not null check (btrim(title) <> ''),
  publication_status public.curriculum_publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (release_id, week_number),
  unique (id, release_id, week_number)
);

create table public.curriculum_days (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null,
  week_id uuid not null,
  week_number smallint not null check (week_number between 1 and 6),
  day_number smallint not null check (day_number between 1 and 42),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  stable_key text not null unique,
  title text not null check (btrim(title) <> ''),
  objective text not null check (btrim(objective) <> ''),
  content_version text not null check (btrim(content_version) <> ''),
  publication_status public.curriculum_publication_status not null default 'draft',
  provenance_source_id uuid references public.curriculum_provenance_sources(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (release_id) references public.curriculum_releases(id) on delete cascade,
  foreign key (week_id, release_id, week_number)
    references public.curriculum_weeks(id, release_id, week_number) on delete cascade,
  unique (release_id, day_number),
  unique (release_id, week_id, day_of_week),
  check (day_number = ((week_number - 1) * 7) + day_of_week),
  check (publication_status <> 'published' or published_at is not null)
);

create index curriculum_days_release_week_order_idx
  on public.curriculum_days (release_id, week_number, day_of_week);

create table public.curriculum_day_sections (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.curriculum_days(id) on delete cascade,
  section_kind public.curriculum_section_kind not null,
  position smallint not null check (position > 0),
  title text not null check (btrim(title) <> ''),
  content_schema_version smallint not null default 1 check (content_schema_version > 0),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  is_required boolean not null default false,
  publication_status public.curriculum_publication_status not null default 'draft',
  provenance_source_id uuid references public.curriculum_provenance_sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_id, section_kind),
  unique (day_id, position)
);

create table public.curriculum_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.curriculum_days(id) on delete cascade,
  stable_key text not null unique,
  title text not null check (btrim(title) <> ''),
  instruction text not null check (btrim(instruction) <> ''),
  primary_skill public.curriculum_skill not null,
  supported_skills public.curriculum_skill[] not null default '{}'::public.curriculum_skill[],
  definition_schema_version smallint not null default 1 check (definition_schema_version > 0),
  definition jsonb not null default '{}'::jsonb check (jsonb_typeof(definition) = 'object'),
  publication_status public.curriculum_publication_status not null default 'draft',
  provenance_source_id uuid references public.curriculum_provenance_sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_position(supported_skills, primary_skill) is not null)
);

create index curriculum_exercises_day_idx on public.curriculum_exercises (day_id);

create table public.curriculum_mastery_checks (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.curriculum_days(id) on delete cascade,
  stable_key text not null unique,
  title text not null check (btrim(title) <> ''),
  definition_schema_version smallint not null default 1 check (definition_schema_version > 0),
  definition jsonb not null default '{}'::jsonb check (jsonb_typeof(definition) = 'object'),
  publication_status public.curriculum_publication_status not null default 'draft',
  provenance_source_id uuid references public.curriculum_provenance_sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_id, stable_key)
);

comment on table public.curriculum_releases is
  'Versioned canonical A1 release metadata. The later 42-day import is authoritative content, not UI data.';
comment on table public.curriculum_days is
  'Stable, ordered day identity for the six-week/42-day A1 release. Objective is relational; lesson components are versioned sections.';
comment on table public.curriculum_day_sections is
  'Structured content slots for main lesson, grammar, vocabulary, all required skills, practical interaction, mastery check, and Daily German Core.';
comment on table public.curriculum_exercises is
  'Versioned authored practice definitions. Learner attempts and assessment evidence are deliberately not part of this migration.';

-- Canonical content is served through server-side application use cases. RLS
-- is enabled from creation and no browser policy is granted yet, which makes
-- direct anon/authenticated access deny by default. A later authenticated
-- curriculum-read use case may add narrow policy/grant changes with tests.
alter table public.curriculum_provenance_sources enable row level security;
alter table public.curriculum_releases enable row level security;
alter table public.curriculum_weeks enable row level security;
alter table public.curriculum_days enable row level security;
alter table public.curriculum_day_sections enable row level security;
alter table public.curriculum_exercises enable row level security;
alter table public.curriculum_mastery_checks enable row level security;

revoke all on table public.curriculum_provenance_sources from anon, authenticated;
revoke all on table public.curriculum_releases from anon, authenticated;
revoke all on table public.curriculum_weeks from anon, authenticated;
revoke all on table public.curriculum_days from anon, authenticated;
revoke all on table public.curriculum_day_sections from anon, authenticated;
revoke all on table public.curriculum_exercises from anon, authenticated;
revoke all on table public.curriculum_mastery_checks from anon, authenticated;

grant select, insert, update, delete on table public.curriculum_provenance_sources to service_role;
grant select, insert, update, delete on table public.curriculum_releases to service_role;
grant select, insert, update, delete on table public.curriculum_weeks to service_role;
grant select, insert, update, delete on table public.curriculum_days to service_role;
grant select, insert, update, delete on table public.curriculum_day_sections to service_role;
grant select, insert, update, delete on table public.curriculum_exercises to service_role;
grant select, insert, update, delete on table public.curriculum_mastery_checks to service_role;

commit;
