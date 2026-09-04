import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CANONICAL_A1_PATH = "docs/curriculum/a1-final-42-day-curriculum.md";
export const DUPLICATE_A1_PATH = "docs/curriculum/a1-final-42-day-curriculum copy.md";
export const CANONICAL_DOCUMENT_ROLE = "canonical-a1-curriculum";

const DAY_HEADING_RE = /^#{2,4}\s+DAY\s+(\d+)\s*:\s*(.+)$/i;
const SECTION_HEADING_RE = /^#{3,6}\s+(\d+)\.\s+(.+)$/;
const QA_HEADING = "# FINAL QA OVERRIDES — MUST TAKE PRECEDENCE OVER EARLIER WEEKLY DRAFT WORDING";
const QA_END_HEADING = "# WEEK 1 — DAYS 1–7";

function assert(condition, message) {
  if (!condition) throw new Error(`Curriculum parser error: ${message}`);
}

function isDuplicatePath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  return normalized === DUPLICATE_A1_PATH || normalized.endsWith("/a1-final-42-day-curriculum copy.md");
}

function assertCanonicalPath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  if (isDuplicatePath(normalized)) {
    throw new Error(`Duplicate curriculum source is not authoritative: ${filePath}`);
  }
  if (normalized !== CANONICAL_A1_PATH && !normalized.endsWith(`/${CANONICAL_A1_PATH}`)) {
    throw new Error(`Only the canonical A1 curriculum may be loaded: ${CANONICAL_A1_PATH}`);
  }
}

function sourceRef({ documentPath, weekNumber, dayNumber, sectionNumber, startLine, endLine }) {
  return {
    documentPath,
    documentRole: CANONICAL_DOCUMENT_ROLE,
    ...(weekNumber == null ? {} : { weekNumber }),
    ...(dayNumber == null ? {} : { dayNumber }),
    ...(sectionNumber == null ? {} : { sectionNumber }),
    ...(startLine == null ? {} : { startLine }),
    ...(endLine == null ? {} : { endLine }),
  };
}

function canonicalSectionKey(heading) {
  const value = heading.toLowerCase().trim();
  const mappings = [
    [/^day objective\b/, "objective"],
    [/^main (curriculum|language) lesson content\b/, "lessonContent"],
    [/^daily german core items?\b/, "dailyCore"],
    [/^pronunciation practice\b/, "pronunciation"],
    [/^minimum (theory|explanation)\b/, "minimumTheory"],
    [/^listening\b/, "listening"],
    [/^speaking\b/, "speaking"],
    [/^reading\b/, "reading"],
    [/^writing\b/, "writing"],
    [/^sentence[- ]building\b/, "sentenceBuilding"],
    [/^retrieval\b/, "retrieval"],
    [/^practical germany task\b/, "practicalTask"],
    [/^communication[- ]repair\b/, "repair"],
    [/^(native[- ]response|realistic interaction|realistic native)\b/, "nativeInteraction"],
    [/^(interest|exposure)\b/, "interestExposure"],
    [/^mastery check\b/, "mastery"],
  ];
  return mappings.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function parseSections(lines, dayStartIndex, dayEndIndex, documentPath, dayNumber, weekNumber) {
  const sectionHeaders = [];
  for (let index = dayStartIndex + 1; index < dayEndIndex; index += 1) {
    const match = lines[index].match(SECTION_HEADING_RE);
    if (match) {
      sectionHeaders.push({ number: Number(match[1]), heading: match[2].trim(), lineIndex: index });
    }
  }

  return sectionHeaders.map((header, index) => {
    const next = sectionHeaders[index + 1];
    const endExclusive = next?.lineIndex ?? dayEndIndex;
    const rawMarkdown = lines.slice(header.lineIndex + 1, endExclusive).join("\n").trim();
    return {
      id: `a1.d${String(dayNumber).padStart(2, "0")}.s${String(header.number).padStart(2, "0")}`,
      number: header.number,
      canonicalKey: canonicalSectionKey(header.heading),
      heading: header.heading,
      rawMarkdown,
      source: sourceRef({
        documentPath,
        weekNumber,
        dayNumber,
        sectionNumber: header.number,
        startLine: header.lineIndex + 1,
        endLine: Math.max(header.lineIndex + 1, endExclusive),
      }),
    };
  });
}

function findQaSections(sourceText) {
  const start = sourceText.indexOf(QA_HEADING);
  const end = sourceText.indexOf(QA_END_HEADING, start);
  assert(start >= 0 && end > start, "FINAL QA OVERRIDES block is missing or malformed");
  const block = sourceText.slice(start, end);
  const matches = [...block.matchAll(/^##\s+(.+)$/gm)];
  const result = { raw: block.trim(), weeks: new Map(), global: "" };
  for (let i = 0; i < matches.length; i += 1) {
    const title = matches[i][1].trim();
    const startOffset = matches[i].index;
    const endOffset = matches[i + 1]?.index ?? block.length;
    const content = block.slice(startOffset, endOffset).trim();
    if (/^Week\s+[1-6]$/i.test(title)) {
      result.weeks.set(Number(title.match(/\d+/)?.[0]), content);
    } else if (/^Global \/ all weeks$/i.test(title)) {
      result.global = content;
    }
  }
  return result;
}

function parseDayHeadings(lines) {
  return lines.flatMap((line, index) => {
    const match = line.match(DAY_HEADING_RE);
    return match ? [{ dayNumber: Number(match[1]), title: match[2].trim(), lineIndex: index }] : [];
  });
}

function parseDailyCoreReferences(markdown) {
  return [...markdown.matchAll(/\[Day\s+(\d+)\s+core\]/gi)].map((match) => Number(match[1]));
}

export function parseCurriculum(sourceText, options = {}) {
  assert(typeof sourceText === "string" && sourceText.length > 0, "source text must be non-empty");
  const documentPath = options.documentPath ?? CANONICAL_A1_PATH;
  assertCanonicalPath(documentPath);

  const lines = sourceText.replaceAll("\r", "").split("\n");
  const headings = parseDayHeadings(lines);
  assert(headings.length === 42, `expected exactly 42 DAY headings, found ${headings.length}`);
  assert(headings.every((entry, index) => entry.dayNumber === index + 1), "DAY headings must be exactly 1–42 in order");

  const qa = findQaSections(sourceText);
  const days = headings.map((heading, index) => {
    const next = headings[index + 1];
    const endExclusive = next?.lineIndex ?? lines.length;
    const weekNumber = Math.ceil(heading.dayNumber / 7);
    const phaseNumber = Math.ceil(weekNumber / 2);
    const sections = parseSections(lines, heading.lineIndex, endExclusive, documentPath, heading.dayNumber, weekNumber);
    const dayRaw = lines.slice(heading.lineIndex, endExclusive).join("\n").trim();
    const objective = sections.find((section) => section.canonicalKey === "objective");
    const core = sections.find((section) => section.canonicalKey === "dailyCore");
    const qaWeek = qa.weeks.get(weekNumber) ?? "";
    const qaOverride = [qaWeek, qa.global].filter(Boolean).join("\n\n");

    return {
      id: `a1.d${String(heading.dayNumber).padStart(2, "0")}`,
      number: heading.dayNumber,
      title: heading.title,
      weekNumber,
      phaseNumber,
      sections,
      qaOverride,
      source: sourceRef({
        documentPath,
        weekNumber,
        dayNumber: heading.dayNumber,
        startLine: heading.lineIndex + 1,
        endLine: endExclusive,
      }),
      objectiveMarkdown: objective?.rawMarkdown ?? "",
      dailyCoreReferences: parseDailyCoreReferences(core?.rawMarkdown ?? ""),
      rawMarkdown: dayRaw,
    };
  });

  const weeks = Array.from({ length: 6 }, (_, index) => {
    const number = index + 1;
    const weekDays = days.filter((day) => day.weekNumber === number);
    const firstDay = weekDays[0];
    const lastDay = weekDays.at(-1);
    return {
      id: `a1.w0${number}`,
      number,
      title: `Week ${number}`,
      phaseNumber: Math.ceil(number / 2),
      days: weekDays,
      source: sourceRef({
        documentPath,
        weekNumber: number,
        startLine: firstDay?.source.startLine,
        endLine: lastDay?.source.endLine,
      }),
    };
  });

  const phases = Array.from({ length: 3 }, (_, index) => {
    const number = index + 1;
    const phaseWeeks = weeks.filter((week) => week.phaseNumber === number);
    return {
      id: `a1.p0${number}`,
      number,
      title: `Phase ${number}`,
      weekNumbers: phaseWeeks.map((week) => week.number),
      source: sourceRef({
        documentPath,
        startLine: phaseWeeks[0]?.source.startLine,
        endLine: phaseWeeks.at(-1)?.source.endLine,
      }),
    };
  });

  return {
    id: "a1",
    level: "A1",
    title: "A1 FINAL 6-WEEK / 42-DAY MASTER CURRICULUM",
    source: sourceRef({ documentPath, startLine: 1, endLine: lines.length }),
    phases,
    weeks,
    days,
    finalQaOverrides: qa.raw,
    sourceText,
  };
}

export function loadCurriculum(filePath = CANONICAL_A1_PATH) {
  assertCanonicalPath(filePath);
  const resolved = resolve(process.cwd(), filePath);
  const sourceText = readFileSync(resolved, "utf8");
  return parseCurriculum(sourceText, { documentPath: CANONICAL_A1_PATH });
}

export function getSection(day, canonicalKey) {
  return day.sections.find((section) => section.canonicalKey === canonicalKey);
}

export function isCanonicalSourcePath(filePath) {
  try {
    assertCanonicalPath(filePath);
    return true;
  } catch {
    return false;
  }
}
