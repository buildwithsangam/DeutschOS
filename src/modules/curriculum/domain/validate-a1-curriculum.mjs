const REQUIRED_KEYS = [
  "objective", "lessonContent", "dailyCore", "pronunciation", "minimumTheory",
  "listening", "speaking", "reading", "writing", "sentenceBuilding", "retrieval",
  "practicalTask", "repair", "nativeInteraction", "mastery",
];

const EXPLICIT_LEVEL_RE = /(?:^|\b)(?:A2|B1|B2)\s*(?:lesson|curriculum|module|unit|day|week|grammar|vocabulary|content)\b/i;
const DEFERRED_RE = /\b(?:deferred|later|future|next level|not part of A1|after A1)\b/i;

function error(code, message, context = {}) {
  return { code, message, ...context };
}

export function validateA1Curriculum(curriculum) {
  const errors = [];
  const warnings = [];
  const days = curriculum?.days ?? [];
  const weeks = curriculum?.weeks ?? [];
  const phases = curriculum?.phases ?? [];

  if (curriculum?.level !== "A1") errors.push(error("LEVEL", "Curriculum level must be A1."));
  if (days.length !== 42) errors.push(error("DAY_COUNT", `Expected 42 days; found ${days.length}.`));
  if (weeks.length !== 6) errors.push(error("WEEK_COUNT", `Expected 6 weeks; found ${weeks.length}.`));
  if (phases.length !== 3) errors.push(error("PHASE_COUNT", `Expected 3 phases; found ${phases.length}.`));

  const ids = new Set();
  for (const day of days) {
    if (ids.has(day.id)) errors.push(error("DUPLICATE_ID", `Duplicate day ID ${day.id}.`));
    ids.add(day.id);
    if (day.number < 1 || day.number > 42) errors.push(error("DAY_RANGE", `Day ${day.number} is outside 1–42.`));
    if (day.weekNumber !== Math.ceil(day.number / 7)) errors.push(error("WEEK_MAPPING", `Day ${day.number} maps to week ${day.weekNumber}.`, { day: day.number }));
    if (day.phaseNumber !== Math.ceil(day.weekNumber / 2)) errors.push(error("PHASE_MAPPING", `Day ${day.number} maps to phase ${day.phaseNumber}.`, { day: day.number }));
    const keys = new Set(day.sections.map((section) => section.canonicalKey).filter(Boolean));
    for (const key of REQUIRED_KEYS) {
      if (!keys.has(key)) errors.push(error("REQUIRED_SECTION", `Day ${day.number} is missing ${key}.`, { day: day.number, key }));
    }
    for (const reference of day.dailyCoreReferences) {
      if (reference > day.number) errors.push(error("FUTURE_CORE", `Day ${day.number} references future Day ${reference} in Daily German Core.`, { day: day.number, reference }));
    }
    for (const section of day.sections) {
      if (!section.rawMarkdown.trim()) errors.push(error("EMPTY_SECTION", `Day ${day.number}, section ${section.number} is empty.`));
      if (EXPLICIT_LEVEL_RE.test(`${section.heading}\n${section.rawMarkdown}`) && !DEFERRED_RE.test(section.rawMarkdown)) {
        errors.push(error("OUT_OF_SCOPE", `Day ${day.number}, section ${section.number} contains explicit non-A1 lesson content.`));
      }
      if (section.source?.documentPath !== "docs/curriculum/a1-final-42-day-curriculum.md") {
        errors.push(error("PROVENANCE", `Day ${day.number}, section ${section.number} is not sourced from the canonical document.`));
      }
    }
  }

  const dayNumbers = days.map((day) => day.number);
  if (dayNumbers.some((number, index) => number !== index + 1)) errors.push(error("CHRONOLOGY", "Days must be exactly 1–42 in order."));
  for (const week of weeks) {
    const expected = Array.from({ length: 7 }, (_, i) => (week.number - 1) * 7 + i + 1);
    const actual = week.days.map((day) => day.number);
    if (actual.join(",") !== expected.join(",")) errors.push(error("WEEK_DAYS", `Week ${week.number} does not contain exactly its seven days.`));
  }
  for (const phase of phases) {
    const expectedWeeks = [phase.number * 2 - 1, phase.number * 2];
    if (phase.weekNumbers.join(",") !== expectedWeeks.join(",")) errors.push(error("PHASE_WEEKS", `Phase ${phase.number} must contain weeks ${expectedWeeks.join(" and ")}.`));
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertValidA1Curriculum(curriculum) {
  const result = validateA1Curriculum(curriculum);
  if (!result.valid) throw new Error(result.errors.map((item) => `[${item.code}] ${item.message}`).join("\n"));
  return result;
}
