import { enrichA1Curriculum as enrich } from "./enrich-a1-curriculum.mjs";
import type { ParsedCurriculum } from "./curriculum-parser.d.mts";

export function enrichA1Curriculum(curriculum: ParsedCurriculum) {
  return enrich(curriculum);
}
