import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260830000000_a1_curriculum_foundation.sql"),
  "utf8",
);

describe("A1 curriculum migration contract", () => {
  it("models a versioned A1 release with exactly six ordered weeks and 42 ordered days", () => {
    expect(migration).toContain("cefr_level = 'A1'");
    expect(migration).toContain("week_number between 1 and 6");
    expect(migration).toContain("day_number between 1 and 42");
    expect(migration).toContain("day_of_week between 1 and 7");
    expect(migration).toContain("day_number = ((week_number - 1) * 7) + day_of_week");
    expect(migration).toContain("unique (release_id, week_number)");
    expect(migration).toContain("unique (release_id, day_number)");
    expect(migration).toContain("unique (release_id, week_id, day_of_week)");
  });

  it("keeps release, week, day, and provenance relationships explicit", () => {
    expect(migration).toContain("create table public.curriculum_provenance_sources");
    expect(migration).toContain("create table public.curriculum_releases");
    expect(migration).toContain("create table public.curriculum_weeks");
    expect(migration).toContain("create table public.curriculum_days");
    expect(migration).toContain("references public.curriculum_weeks(id, release_id, week_number)");
    expect(migration).toContain("provenance_source_id uuid not null references public.curriculum_provenance_sources");
  });

  it("supports all structured day content slots without requiring invented content", () => {
    for (const kind of [
      "main_lesson",
      "grammar",
      "vocabulary",
      "pronunciation",
      "listening",
      "speaking",
      "reading",
      "writing",
      "sentence_builder",
      "retrieval_review",
      "practical_task",
      "communication_repair",
      "realistic_interaction",
      "mastery_check",
      "daily_german_core",
    ]) {
      expect(migration).toContain(`'${kind}'`);
    }

    expect(migration).toContain("objective text not null");
    expect(migration).toContain("content_schema_version smallint not null default 1");
    expect(migration).toContain("content jsonb not null default '{}'::jsonb");
    expect(migration).toContain("is_required boolean not null default false");
  });

  it("requires versioned practice and mastery definitions with safe default RLS", () => {
    expect(migration).toContain("create table public.curriculum_exercises");
    expect(migration).toContain("create table public.curriculum_mastery_checks");
    expect(migration).toContain("definition_schema_version smallint not null default 1");
    expect(migration).toContain("alter table public.curriculum_days enable row level security");
    expect(migration).toContain("revoke all on table public.curriculum_days from anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.curriculum_days to service_role");
  });
});
