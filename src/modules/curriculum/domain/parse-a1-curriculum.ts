import { loadCurriculum, parseCurriculum } from "./curriculum-parser.mjs";
import type { ParsedCurriculum } from "./curriculum-parser.d.mts";

export type { ParsedCurriculum } from "./curriculum-parser.d.mts";

export function parseA1FullCurriculum(source?: string): ParsedCurriculum {
  return source === undefined
    ? loadCurriculum()
    : parseCurriculum(source, { documentPath: "docs/curriculum/a1-final-42-day-curriculum.md" });
}

export function loadA1FullCurriculum(): ParsedCurriculum {
  return loadCurriculum();
}

export { loadCurriculum, parseCurriculum };
