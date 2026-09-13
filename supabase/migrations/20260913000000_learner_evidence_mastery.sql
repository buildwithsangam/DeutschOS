begin;

create table if not exists public.learner_attempts (
  id uuid primary key,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  exercise_id text not null,
  correct boolean not null,
  result text,
  skill text,
  response text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists learner_attempts_learner_time_idx
  on public.learner_attempts (learner_id, occurred_at desc);

create index if not exists learner_attempts_learner_skill_idx
  on public.learner_attempts (learner_id, skill);

alter table public.learner_attempts enable row level security;

drop policy if exists "learner_attempts_select_own" on public.learner_attempts;
drop policy if exists "learner_attempts_insert_own" on public.learner_attempts;

create policy "learner_attempts_select_own"
  on public.learner_attempts
  for select
  to authenticated
  using (auth.uid() = learner_id);

create policy "learner_attempts_insert_own"
  on public.learner_attempts
  for insert
  to authenticated
  with check (auth.uid() = learner_id);

revoke all on table public.learner_attempts from anon;
grant select, insert on table public.learner_attempts to authenticated;
grant select, insert, update, delete on table public.learner_attempts to service_role;

create table if not exists public.learner_mastery_snapshots (
  learner_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null,
  scope_key text not null,
  mastery_status text not null check (
    mastery_status in (
      'not_assessed',
      'needs_practice',
      'developing',
      'strong_evidence',
      'ready_for_review'
    )
  ),
  attempts integer not null default 0,
  correct_attempts integer not null default 0,
  accuracy numeric(6,5),
  evidence_level text not null check (
    evidence_level in ('none', 'emerging', 'sufficient')
  ),
  last_evidenced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, scope, scope_key)
);

alter table public.learner_mastery_snapshots enable row level security;

drop policy if exists "learner_mastery_select_own" on public.learner_mastery_snapshots;

create policy "learner_mastery_select_own"
  on public.learner_mastery_snapshots
  for select
  to authenticated
  using (auth.uid() = learner_id);

revoke all on table public.learner_mastery_snapshots from anon;
grant select on table public.learner_mastery_snapshots to authenticated;
grant select, insert, update, delete on table public.learner_mastery_snapshots to service_role;

create or replace function public.set_learner_mastery_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learner_mastery_updated_at on public.learner_mastery_snapshots;

create trigger learner_mastery_updated_at
before update on public.learner_mastery_snapshots
for each row
execute function public.set_learner_mastery_updated_at();

commit;
