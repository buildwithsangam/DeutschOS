#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const sourceDocument = "docs/curriculum/a1-final-42-day-curriculum.md";
const sourcePath = resolve(process.cwd(), sourceDocument);
const shouldApply = process.argv.includes("--apply");
const expectedDays = Array.from({ length: 14 }, (_, index) => index + 1);

const sectionKinds = [
  "main_lesson",
  "vocabulary",
  "grammar",
  "daily_german_core",
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
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`A1 Days 1–14 import validation failed: ${message}`);
  }
}

function trimMarkdown(lines) {
  return lines.join("\n").trim();
}

function extractDayHeadings(lines) {
  const headings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^#{2,4}\s+DAY\s+(\d+)\s*:\s*(.+)$/i);

    if (match) {
      headings.push({
        dayNumber: Number(match[1]),
        title: match[2].trim(),
        lineIndex: index,
      });
    }
  }

  return headings;
}

function extractQaOverrides(text) {
  const qaStart = text.indexOf("# FINAL QA OVERRIDES — MUST TAKE PRECEDENCE OVER EARLIER WEEKLY DRAFT WORDING");
  const qaEnd = text.indexOf("# WEEK 1 — DAYS 1–7", qaStart);

  assert(qaStart >= 0 && qaEnd > qaStart, "the final QA override block is missing");

  const block = text.slice(qaStart, qaEnd).trim();
  const extractSubsection = (heading, nextHeading) => {
    const start = block.indexOf(heading);
    const end = nextHeading ? block.indexOf(nextHeading, start) : block.length;

    assert(start >= 0 && end > start, `${heading} QA override subsection is missing`);
    return block.slice(start, end).trim();
  };

  return {
    week1: extractSubsection("## Week 1", "## Week 2"),
    week2: extractSubsection("## Week 2", "## Week 3"),
    global: extractSubsection("## Global / all weeks"),
  };
}

function extractNumberedSections(dayLines) {
  const headings = [];

  for (let index = 1; index < dayLines.length; index += 1) {
    const match = dayLines[index].match(/^#{3,4}\s+\d+\.\s+(.+)$/);

    if (match) {
      headings.push({ heading: match[1].trim(), lineIndex: index });
    }
  }

  return headings.map((current, index) => ({
    heading: current.heading,
    markdown: trimMarkdown(dayLines.slice(current.lineIndex + 1, headings[index + 1]?.lineIndex)),
  }));
}

function findSection(sections, pattern, dayNumber) {
  const section = sections.find(({ heading }) => pattern.test(heading));
  assert(section?.markdown, `Day ${dayNumber} is missing ${pattern} content`);
  return section;
}

function validateDailyCoreChronology(dayNumber, dailyCoreMarkdown) {
  const references = [...dailyCoreMarkdown.matchAll(/\[Day\s+(\d+)\s+core\]/gi)].map((match) => Number(match[1]));
  const futureReference = references.find((reference) => reference > dayNumber);

  assert(
    futureReference === undefined,
    `Day ${dayNumber} Daily German Core references future Day ${futureReference}`,
  );
}

function sectionContent({ day, sourceSection, qaOverrideMarkdown, fullDayMarkdown, isVocabularyProxy = false }) {
  return {
    source_document: sourceDocument,
    source_day: day.dayNumber,
    source_heading: sourceSection.heading,
    source_markdown: sourceSection.markdown,
    ...(isVocabularyProxy
      ? {
          source_note:
            "Vocabulary is retained exactly inside the approved main-lesson source because this day has no separate vocabulary heading.",
        }
      : {}),
    ...(fullDayMarkdown ? { full_day_source_markdown: fullDayMarkdown } : {}),
    final_qa_override_precedence: true,
    final_qa_overrides_markdown: qaOverrideMarkdown,
  };
}

function createImportPlan() {
  const source = readFileSync(sourcePath, "utf8");
  const lines = source.split(/\r?\n/);
  const allHeadings = extractDayHeadings(lines);
  const foundDayNumbers = allHeadings.map(({ dayNumber }) => dayNumber);

  assert(allHeadings.length === 42, `expected 42 source days, found ${allHeadings.length}`);
  assert(
    foundDayNumbers.every((dayNumber, index) => dayNumber === index + 1),
    "source days are not strictly ordered from 1 through 42",
  );
  assert(source.includes("a0-a1-15-day-curriculum.md` is NOT authoritative"), "source does not exclude the superseded 15-day curriculum");

  const qa = extractQaOverrides(source);
  const days = allHeadings.slice(0, 14).map((heading, index) => {
    const dayLines = lines.slice(heading.lineIndex, allHeadings[index + 1]?.lineIndex);
    const fullDayMarkdown = trimMarkdown(dayLines);
    assert(!/\b(A2|B1|B2)\b/i.test(fullDayMarkdown), `Day ${heading.dayNumber} introduces out-of-scope A2/B1/B2 content`);
    const sections = extractNumberedSections(dayLines);
    const objective = findSection(sections, /objective/i, heading.dayNumber);
    const mainLesson = findSection(sections, /main curriculum|main language/i, heading.dayNumber);
    const dailyCore = findSection(sections, /daily german core/i, heading.dayNumber);
    const pronunciation = findSection(sections, /pronunciation/i, heading.dayNumber);
    const grammar = findSection(sections, /minimum (theory|explanation)|minimum explanation/i, heading.dayNumber);
    const listening = findSection(sections, /^listening/i, heading.dayNumber);
    const speaking = findSection(sections, /^speaking/i, heading.dayNumber);
    const reading = findSection(sections, /^reading/i, heading.dayNumber);
    const writing = findSection(sections, /^writing/i, heading.dayNumber);
    const sentenceBuilder = findSection(sections, /sentence-building/i, heading.dayNumber);
    const retrieval = findSection(sections, /^retrieval/i, heading.dayNumber);
    const practicalTask = findSection(sections, /practical germany task/i, heading.dayNumber);
    const communicationRepair = findSection(sections, /communication[- ]repair/i, heading.dayNumber);
    const realisticInteraction = findSection(sections, /native-response|realistic native/i, heading.dayNumber);
    const masteryCheck = findSection(sections, /mastery check/i, heading.dayNumber);
    const qaOverrideMarkdown = [heading.dayNumber <= 7 ? qa.week1 : qa.week2, qa.global].join("\n\n");

    validateDailyCoreChronology(heading.dayNumber, dailyCore.markdown);

    const record = {
      dayNumber: heading.dayNumber,
      weekNumber: Math.ceil(heading.dayNumber / 7),
      dayOfWeek: ((heading.dayNumber - 1) % 7) + 1,
      stableKey: `a1-final-v2-day-${String(heading.dayNumber).padStart(2, "0")}`,
      title: heading.title,
      objective: objective.markdown,
      fullDayMarkdown,
      qaOverrideMarkdown,
      sections: [
        ["main_lesson", mainLesson, true, true],
        ["vocabulary", mainLesson, true, false],
        ["grammar", grammar, true, false],
        ["daily_german_core", dailyCore, true, false],
        ["pronunciation", pronunciation, true, false],
        ["listening", listening, true, false],
        ["speaking", speaking, true, false],
        ["reading", reading, true, false],
        ["writing", writing, true, false],
        ["sentence_builder", sentenceBuilder, true, false],
        ["retrieval_review", retrieval, true, false],
        ["practical_task", practicalTask, true, false],
        ["communication_repair", communicationRepair, true, false],
        ["realistic_interaction", realisticInteraction, true, false],
      ].map(([kind, sourceSection, isRequired, includesFullDay]) => ({
        kind,
        title: sourceSection.heading,
        isRequired,
        content: sectionContent({
          day: recordPlaceholder(heading.dayNumber),
          sourceSection,
          qaOverrideMarkdown,
          fullDayMarkdown: includesFullDay ? fullDayMarkdown : undefined,
          isVocabularyProxy: kind === "vocabulary",
        }),
      })),
      exercise: {
        stableKey: `a1-final-v2-day-${String(heading.dayNumber).padStart(2, "0")}-sentence-builder`,
        title: sentenceBuilder.heading,
        instruction: sentenceBuilder.markdown,
        definition: sectionContent({
          day: recordPlaceholder(heading.dayNumber),
          sourceSection: sentenceBuilder,
          qaOverrideMarkdown,
        }),
      },
      masteryCheck: {
        stableKey: `a1-final-v2-day-${String(heading.dayNumber).padStart(2, "0")}-mastery-check`,
        title: masteryCheck.heading,
        definition: sectionContent({
          day: recordPlaceholder(heading.dayNumber),
          sourceSection: masteryCheck,
          qaOverrideMarkdown,
        }),
      },
    };

    return record;
  });

  assert(days.map(({ dayNumber }) => dayNumber).join(",") === expectedDays.join(","), "import plan is not exactly Days 1–14");
  assert(days.every(({ sections }) => sections.length === sectionKinds.length), "one or more days has incomplete structured sections");

  return {
    sourceHash: createHash("sha256").update(source).digest("hex"),
    days,
    counts: {
      provenanceSources: 1,
      releases: 1,
      weeks: 2,
      days: days.length,
      sections: days.reduce((total, day) => total + day.sections.length, 0),
      exercises: days.length,
      masteryChecks: days.length,
    },
  };
}

function recordPlaceholder(dayNumber) {
  return { dayNumber };
}

async function upsertOne(client, table, row, onConflict) {
  const { data, error } = await client.from(table).upsert(row, { onConflict }).select().single();

  if (error) {
    throw new Error(`${table} import failed: ${error.message}`);
  }

  return data;
}

async function applyPlan(plan) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url, "NEXT_PUBLIC_SUPABASE_URL is required for --apply");
  assert(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required for --apply");

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date().toISOString();
  const provenance = await upsertOne(
    client,
    "curriculum_provenance_sources",
    {
      stable_key: "a1-final-42-day-curriculum-v2-source",
      provenance_type: "original_deutschos",
      title: "A1 FINAL 6-WEEK / 42-DAY MASTER CURRICULUM",
      rights_basis:
        "Original DeutschOS-authored canonical curriculum source; named Goethe references are reference-only and do not import proprietary examination assets.",
      reviewed_at: now,
    },
    "stable_key",
  );
  const release = await upsertOne(
    client,
    "curriculum_releases",
    {
      stable_key: "a1-final-42-day-curriculum-v2",
      title: "A1 FINAL 6-WEEK / 42-DAY MASTER CURRICULUM",
      release_version: "v2",
      cefr_level: "A1",
      publication_status: "draft",
      is_active: false,
      provenance_source_id: provenance.id,
      updated_at: now,
    },
    "stable_key,release_version",
  );

  const weeks = new Map();
  for (const weekNumber of [1, 2]) {
    const week = await upsertOne(
      client,
      "curriculum_weeks",
      {
        release_id: release.id,
        week_number: weekNumber,
        stable_key: `a1-final-v2-week-${weekNumber}`,
        title: `A1 Week ${weekNumber}`,
        publication_status: "draft",
        updated_at: now,
      },
      "release_id,week_number",
    );
    weeks.set(weekNumber, week);
  }

  for (const day of plan.days) {
    const week = weeks.get(day.weekNumber);
    const importedDay = await upsertOne(
      client,
      "curriculum_days",
      {
        release_id: release.id,
        week_id: week.id,
        week_number: day.weekNumber,
        day_number: day.dayNumber,
        day_of_week: day.dayOfWeek,
        stable_key: day.stableKey,
        title: day.title,
        objective: day.objective,
        content_version: "v2",
        publication_status: "draft",
        provenance_source_id: provenance.id,
        updated_at: now,
      },
      "release_id,day_number",
    );

    for (const [index, section] of day.sections.entries()) {
      await upsertOne(
        client,
        "curriculum_day_sections",
        {
          day_id: importedDay.id,
          section_kind: section.kind,
          position: index + 1,
          title: section.title,
          content_schema_version: 1,
          content: section.content,
          is_required: section.isRequired,
          publication_status: "draft",
          provenance_source_id: provenance.id,
          updated_at: now,
        },
        "day_id,section_kind",
      );
    }

    await upsertOne(
      client,
      "curriculum_exercises",
      {
        day_id: importedDay.id,
        stable_key: day.exercise.stableKey,
        title: day.exercise.title,
        instruction: day.exercise.instruction,
        primary_skill: "writing",
        supported_skills: ["writing", "speaking"],
        definition_schema_version: 1,
        definition: day.exercise.definition,
        publication_status: "draft",
        provenance_source_id: provenance.id,
        updated_at: now,
      },
      "stable_key",
    );

    await upsertOne(
      client,
      "curriculum_mastery_checks",
      {
        day_id: importedDay.id,
        stable_key: day.masteryCheck.stableKey,
        title: day.masteryCheck.title,
        definition_schema_version: 1,
        definition: day.masteryCheck.definition,
        publication_status: "draft",
        provenance_source_id: provenance.id,
        updated_at: now,
      },
      "stable_key",
    );
  }
}

try {
  const plan = createImportPlan();

  if (shouldApply) {
    await applyPlan(plan);
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? "applied" : "dry-run",
        sourceDocument,
        sourceHash: plan.sourceHash,
        importedDays: plan.days.map(({ dayNumber }) => dayNumber),
        importedWeeks: [1, 2],
        day15OrLaterImported: false,
        counts: plan.counts,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
