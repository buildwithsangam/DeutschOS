begin;

create table if not exists public.learner_error_memory (
  learner_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id text not null,
  day_number integer not null check (day_number > 0),
  category text not null,
  skill text,
  occurrences integer not null default 0 check (occurrences >= 0),
  recent_occurrences integer not null default 0 check (recent_occurrences >= 0),
  resolved_streak integer not null default 0 check (resolved_streak >= 0),
  last_occurred_at timestamptz not null,
  last_resolved_at timestamptz,
  influence numeric(6,2) not null default 0 check (influence >= 0 and influence <= 100),
  updated_at timestamptz not null default now(),
  primary key (learner_id, exercise_id)
);

create index if not exists learner_error_memory_influence_idx
  on public.learner_error_memory (learner_id, influence desc, last_occurred_at desc);

create index if not exists learner_error_memory_skill_idx
  on public.learner_error_memory (learner_id, skill, influence desc);

alter table public.learner_error_memory enable row level security;

drop policy if exists "learner_error_memory_select_own" on public.learner_error_memory;
drop policy if exists "learner_error_memory_insert_own" on public.learner_error_memory;
drop policy if exists "learner_error_memory_update_own" on public.learner_error_memory;

create policy "learner_error_memory_select_own"
  on public.learner_error_memory
  for select
  to authenticated
  using (auth.uid() = learner_id);

create policy "learner_error_memory_insert_own"
  on public.learner_error_memory
  for insert
  to authenticated
  with check (auth.uid() = learner_id);

create policy "learner_error_memory_update_own"
  on public.learner_error_memory
  for update
  to authenticated
  using (auth.uid() = learner_id)
  with check (auth.uid() = learner_id);

revoke all on table public.learner_error_memory from anon;
grant select, insert, update on table public.learner_error_memory to authenticated;
grant select, insert, update, delete on table public.learner_error_memory to service_role;

create or replace function public.set_learner_error_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learner_error_memory_updated_at on public.learner_error_memory;

create trigger learner_error_memory_updated_at
before update on public.learner_error_memory
for each row
execute function public.set_learner_error_memory_updated_at();

commit;
