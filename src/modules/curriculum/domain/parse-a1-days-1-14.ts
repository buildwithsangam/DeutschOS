import type { A1Curriculum, A1Day, A1LearningScope, A1LessonSection, A1SectionKind } from "./a1-days-1-14";

const sourceDocument = "docs/curriculum/a1-final-42-day-curriculum.md";

type SourceSection = { heading: string; markdown: string };

function required(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Canonical A1 curriculum could not be read: ${message}`);
  }
}

function cleanMarkdown(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\$?\\rightarrow\$?/g, "→")
    .replace(/\*+/g, "")
    .replace(/`/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\\\([^)]*\\\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionFrom(sections: SourceSection[], pattern: RegExp, dayNumber: number) {
  const section = sections.find(({ heading }) => pattern.test(heading));
  required(section?.markdown, `Day ${dayNumber} is missing ${pattern.source}`);
  return section;
}

function numberedSections(lines: string[]) {
  const headings: Array<{ heading: string; index: number }> = [];

  for (let index = 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^#{3,4}\s+\d+\.\s+(.+)$/);
    if (match) headings.push({ heading: match[1].trim(), index });
  }

  return headings.map((entry, index) => ({
    heading: entry.heading,
    markdown: lines.slice(entry.index + 1, headings[index + 1]?.index).join("\n").trim(),
  }));
}

function finalQaOverrides(source: string) {
  const qaStart = source.indexOf("# FINAL QA OVERRIDES — MUST TAKE PRECEDENCE OVER EARLIER WEEKLY DRAFT WORDING");
  const qaEnd = source.indexOf("# WEEK 1 — DAYS 1–7", qaStart);
  required(qaStart >= 0 && qaEnd > qaStart, "the FINAL QA OVERRIDES block is missing");
  const qa = source.slice(qaStart, qaEnd);

  const extract = (heading: string, nextHeading?: string) => {
    const start = qa.indexOf(heading);
    const end = nextHeading ? qa.indexOf(nextHeading, start) : qa.length;
    required(start >= 0 && end > start, `${heading} override is missing`);
    return qa.slice(start, end).trim();
  };

  const weekHeadings = [1, 2, 3, 4, 5].map((week) => `## Week ${week}`);
  const weeks = new Map(
    weekHeadings.map((heading, index) => [index + 1, extract(heading, weekHeadings[index + 1] ?? "## Global / all weeks")]),
  );
  return { weeks, global: extract("## Global / all weeks") };
}

function sentenceBuilder(markdown: string, dayNumber: number) {
  const cleanedLines = markdown.split("\n").map(cleanMarkdown).filter(Boolean);
  const answerLine = cleanedLines.find((line) => line.includes("→") && /[A-Za-zÄÖÜäöüß]/.test(line.split("→")[1] ?? ""));
  const exampleLine = cleanedLines.find((line) => {
    const candidate = line.replace(/^[-–]\s*/, "").trim();
    return /[.!?]["”']?$/.test(candidate) && !/^(Task|Input Blocks|Execution|Substitution Drill|Expansion):/i.test(candidate);
  });
  const answer = (answerLine?.split("→")[1] ?? exampleLine)?.trim().replace(/\s+$/, "");
  required(answer && answer.length > 1, `Day ${dayNumber} has no canonical sentence-builder answer`);
  const tokens = answer.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*|[.,?!:;]/gu) ?? [];
  required(tokens.length > 1, `Day ${dayNumber} sentence-builder answer has too few tokens`);
  return { prompt: markdown, answer: tokens.join(" ").replace(/\s+([.,?!:;])/g, "$1"), tokens };
}

function toLessonSections(sections: SourceSection[], dayNumber: number): A1LessonSection[] {
  const main = sectionFrom(sections, /main curriculum|main language/i, dayNumber);
  const mappings: Array<[A1SectionKind, SourceSection, boolean?]> = [
    ["main_lesson", main],
    ["vocabulary", main, true],
    ["grammar", sectionFrom(sections, /minimum (theory|explanation)|minimum explanation/i, dayNumber)],
    ["daily_german_core", sectionFrom(sections, /daily german core/i, dayNumber)],
    ["pronunciation", sectionFrom(sections, /pronunciation/i, dayNumber)],
    ["listening", sectionFrom(sections, /^listening/i, dayNumber)],
    ["speaking", sectionFrom(sections, /^speaking/i, dayNumber)],
    ["reading", sectionFrom(sections, /^reading/i, dayNumber)],
    ["writing", sectionFrom(sections, /^writing/i, dayNumber)],
    ["sentence_builder", sectionFrom(sections, /sentence-building/i, dayNumber)],
    ["retrieval_review", sectionFrom(sections, /^retrieval/i, dayNumber)],
    ["practical_task", sectionFrom(sections, /practical germany task/i, dayNumber)],
    ["communication_repair", sectionFrom(sections, /communication[- ]repair/i, dayNumber)],
    ["realistic_interaction", sectionFrom(sections, /native-response|realistic native/i, dayNumber)],
    ["mastery_check", sectionFrom(sections, /mastery check/i, dayNumber)],
  ];

  return mappings.map(([kind, section, isVocabularyProxy]) => ({
    kind,
    title: isVocabularyProxy ? "Vocabulary & patterns in today’s lesson" : section.heading,
    markdown: section.markdown,
    isVocabularyProxy,
  }));
}

export function parseA1Curriculum(source: string, learningScope: A1LearningScope): A1Curriculum {
  required(source.includes("a0-a1-15-day-curriculum.md` is NOT authoritative"), "the superseded curriculum exclusion is missing");
  const lines = source.split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^#{2,4}\s+DAY\s+(\d+)\s*:\s*(.+)$/i);
    return match ? [{ dayNumber: Number(match[1]), title: match[2].trim(), index }] : [];
  });
  required(headings.length === 42, `expected 42 days, found ${headings.length}`);
  required(headings.every((heading, index) => heading.dayNumber === index + 1), "days are not ordered 1–42");
  required(learningScope.firstDay >= 1 && learningScope.lastDay >= learningScope.firstDay, "learning scope is invalid");
  required(learningScope.lastDay <= headings.length, "learning scope exceeds the canonical curriculum");
  required(learningScope.canonicalTotalDays === headings.length, "learning scope does not match canonical day count");
  const qa = finalQaOverrides(source);

  const days: A1Day[] = headings
    .filter((heading) => heading.dayNumber >= learningScope.firstDay && heading.dayNumber <= learningScope.lastDay)
    .map((heading) => {
    const nextHeading = headings[heading.dayNumber];
    const dayLines = lines.slice(heading.index, nextHeading?.index);
    const fullDay = dayLines.join("\n");
    required(!/\b(A2|B1|B2)\b/i.test(fullDay), `Day ${heading.dayNumber} contains out-of-scope content`);
    const sourceSections = numberedSections(dayLines);
    const objective = sectionFrom(sourceSections, /objective/i, heading.dayNumber);
    const core = sectionFrom(sourceSections, /daily german core/i, heading.dayNumber);
    const futureCore = [...core.markdown.matchAll(/\[Day\s+(\d+)\s+core\]/gi)].map((match) => Number(match[1])).find((number) => number > heading.dayNumber);
    required(futureCore === undefined, `Day ${heading.dayNumber} Daily German Core references future Day ${futureCore}`);
    const builder = sectionFrom(sourceSections, /sentence-building/i, heading.dayNumber);

    return {
      dayNumber: heading.dayNumber,
      weekNumber: Math.ceil(heading.dayNumber / 7),
      title: heading.title,
      objective: objective.markdown,
      sections: toLessonSections(sourceSections, heading.dayNumber),
      sentenceBuilder: sentenceBuilder(builder.markdown, heading.dayNumber),
      finalQaOverrides: [
        "# FINAL QA OVERRIDES — MUST TAKE PRECEDENCE OVER EARLIER WEEKLY DRAFT WORDING",
        qa.weeks.get(Math.ceil(heading.dayNumber / 7)) ?? "",
        qa.global,
      ].join("\n\n"),
      finalQaNotices: (qa.weeks.get(Math.ceil(heading.dayNumber / 7)) ?? "")
        .split("\n")
        .filter((line) => line.includes(`Day ${heading.dayNumber}`)),
    };
  });

  required(days.length === learningScope.lastDay - learningScope.firstDay + 1, "loaded day count does not match learning scope");
  return { sourceDocument, learningScope, days };
}

/** Current MVP wrapper. Future content remains unavailable until explicitly imported/approved. */
export function parseA1DaysOneToFourteen(source: string): A1Curriculum {
  return parseA1Curriculum(source, { firstDay: 1, lastDay: 14, canonicalTotalDays: 42 });
}
