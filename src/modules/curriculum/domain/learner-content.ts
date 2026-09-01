import type { A1Day } from "./a1-days-1-14";
import { sectionForDay } from "./a1-days-1-14";

/** Removes source citations/notation and substitutes only plain-language equivalents. */
export function learnerText(markdown: string) {
  return markdown
    .replace(/\r/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$?\\rightarrow\$?/g, "→")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\$[^$]*\$/g, "")
    .replace(/\*+/g, "")
    .replace(/`/g, "")
    .replace(/\[(?:Unit|Day|Days|Lesson|a1-master|Long|Newton|Vaughan|\d)[^\]]*\]/gi, "")
    .replace(/\bINTRODUCE & UNDERSTAND:\s*/g, "")
    .replace(/\bINTRODUCE:\s*/g, "")
    .replace(/\bUNDERSTAND:\s*/g, "")
    .replace(/\bRECOGNIZE:\s*/g, "")
    .replace(/\bRETRIEVE:\s*/g, "")
    .replace(/\bCONTROLLED USE:\s*/g, "")
    .replace(/\bCONTEXTUAL USE:\s*/g, "")
    .replace(/\bREAL-LIFE USE:\s*/g, "")
    .replace(/\bREVISIT:\s*/g, "")
    .replace(/voiceless palatal fricative/gi, "light ich sound")
    .replace(/voiced labiodental fricative/gi, "v sound")
    .replace(/alveolar sibilant/gi, "buzzing s sound")
    .replace(/alveolar affricate/gi, "ts sound")
    .replace(/terminal devoicing/gi, "a crisp final consonant")
    .replace(/postpositional presence markers/gi, "words for present or absent")
    .replace(/copula/gi, "form of sein")
    .replace(/phonological distinction/gi, "sound difference")
    .replace(/phoneme identification/gi, "sound recognition")
    .replace(/acoustic status identification/gi, "listening recognition")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function learnerExcerpt(markdown: string, length = 138) {
  const text = learnerText(markdown);
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

function firstUsefulLine(markdown: string) {
  return markdown
    .split("\n")
    .map(learnerText)
    .find((line) => line.length > 8 && !/^Focus:/i.test(line));
}

/** Selects source-derived reusable notes; it does not formulate new curriculum rules. */
export function notebookGuidance(day: A1Day) {
  const grammar = sectionForDay(day, "grammar");
  const core = sectionForDay(day, "daily_german_core");
  const notes = [
    grammar ? firstUsefulLine(grammar.markdown) : undefined,
    day.sentenceBuilder.answer,
    core ? firstUsefulLine(core.markdown) : undefined,
  ].filter((note): note is string => Boolean(note));
  return [...new Set(notes)].slice(0, 3);
}
