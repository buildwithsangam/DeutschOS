begin;

create table if not exists public.learner_review_states (
  learner_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id text not null,
  day_number integer not null check (day_number > 0),
  skill text,
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  interval_days numeric(8,3) not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,3) not null default 2.3 check (ease_factor >= 1.3 and ease_factor <= 2.8),
  due_at timestamptz not null,
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, exercise_id)
);

create index if not exists learner_review_states_due_idx
  on public.learner_review_states (learner_id, due_at asc);

create index if not exists learner_review_states_day_idx
  on public.learner_review_states (learner_id, day_number, due_at asc);

alter table public.learner_review_states enable row level security;

drop policy if exists "learner_review_states_select_own" on public.learner_review_states;
drop policy if exists "learner_review_states_insert_own" on public.learner_review_states;
drop policy if exists "learner_review_states_update_own" on public.learner_review_states;

create policy "learner_review_states_select_own"
  on public.learner_review_states
  for select
  to authenticated
  using (auth.uid() = learner_id);

create policy "learner_review_states_insert_own"
  on public.learner_review_states
  for insert
  to authenticated
  with check (auth.uid() = learner_id);

create policy "learner_review_states_update_own"
  on public.learner_review_states
  for update
  to authenticated
  using (auth.uid() = learner_id)
  with check (auth.uid() = learner_id);

revoke all on table public.learner_review_states from anon;
grant select, insert, update on table public.learner_review_states to authenticated;
grant select, insert, update, delete on table public.learner_review_states to service_role;

create or replace function public.set_learner_review_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learner_review_states_updated_at on public.learner_review_states;

create trigger learner_review_states_updated_at
before update on public.learner_review_states
for each row
execute function public.set_learner_review_states_updated_at();

commit;
