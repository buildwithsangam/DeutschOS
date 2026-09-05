#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const SOURCE = "docs/curriculum/a1-final-42-day-curriculum.md";
const DUPLICATE = "docs/curriculum/a1-final-42-day-curriculum copy.md";
const shouldApply = process.argv.includes("--apply");

if (shouldApply) {
  throw new Error("P0.2 importer is dry-run only. Database writes are intentionally unavailable until the published read/import contract is approved.");
}

const { parseCurriculum } = await import("../src/modules/curriculum/domain/curriculum-parser.mjs");
const { validateA1Curriculum } = await import("../src/modules/curriculum/domain/validate-a1-curriculum.mjs");
const { enrichA1Curriculum } = await import("../src/modules/curriculum/domain/enrich-a1-curriculum.mjs");

const sourcePath = resolve(process.cwd(), SOURCE);
const sourceText = readFileSync(sourcePath, "utf8");
const duplicatePath = resolve(process.cwd(), DUPLICATE);

const curriculum = parseCurriculum(sourceText, { documentPath: SOURCE });
const validation = validateA1Curriculum(curriculum);
if (!validation.valid) {
  console.error(JSON.stringify(validation, null, 2));
  process.exitCode = 1;
  throw new Error("A1 curriculum validation failed.");
}
const bundle = enrichA1Curriculum(curriculum);
const sourceHash = createHash("sha256").update(sourceText).digest("hex");
const duplicatePresent = (() => {
  try {
    const duplicate = readFileSync(duplicatePath, "utf8");
    return duplicate === sourceText;
  } catch {
    return false;
  }
})();

const counts = Object.fromEntries([
  ["curriculum", bundle.curriculum ? 1 : 0],
  ["phases", bundle.phases.length],
  ["weeks", bundle.weeks.length],
  ["days", bundle.days.length],
  ["daySections", bundle.daySections.length],
  ["vocabulary", bundle.vocabulary.length],
  ["grammar", bundle.grammar.length],
  ["pronunciation", bundle.pronunciation.length],
  ["dialogues", bundle.dialogues.length],
  ["practicalMissions", bundle.practicalMissions.length],
  ["exercises", bundle.exercises.length],
  ["masteryChecks", bundle.masteryChecks.length],
  ["exerciseTargets", bundle.exerciseTargets.length],
  ["unknownSections", bundle.unknownSections.length],
]);

console.log(JSON.stringify({
  mode: "dry-run",
  sourceDocument: SOURCE,
  sourceHash,
  duplicateSourcePresent: duplicatePresent,
  weeks: 6,
  days: 42,
  phases: 3,
  validation: "PASS",
  databaseWrites: 0,
  sourceModified: false,
  counts,
}, null, 2));
