import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseA1DaysOneToFourteen } from "@/modules/curriculum/domain/parse-a1-days-1-14";

export function getA1DaysOneToFourteen() {
  const source = readFileSync(resolve(process.cwd(), "docs/curriculum/a1-final-42-day-curriculum.md"), "utf8");
  return parseA1DaysOneToFourteen(source);
}
