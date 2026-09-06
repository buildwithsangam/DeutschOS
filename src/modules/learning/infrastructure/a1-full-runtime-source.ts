import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseFullA1Curriculum } from "@/modules/learning/domain/a1-full-runtime";

export function getA1FullCurriculum() {
  const source = readFileSync(
    resolve(process.cwd(), "docs/curriculum/a1-final-42-day-curriculum.md"),
    "utf8",
  );

  return parseFullA1Curriculum(source);
}
