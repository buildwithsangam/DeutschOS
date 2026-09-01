import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { germanAlphabetFoundation, highValueSpellingPatterns } from "@/modules/curriculum/domain/german-pronunciation-foundation";
import { learnerText, notebookGuidance } from "@/modules/curriculum/domain/learner-content";
import { dailyCoreItems, lessonFlow, sentenceBuilderStages, todayTargets } from "@/modules/curriculum/domain/learning-presentation";
import { parseA1DaysOneToFourteen } from "@/modules/curriculum/domain/parse-a1-days-1-14";

const canonicalSource = readFileSync(resolve(process.cwd(), "docs/curriculum/a1-final-42-day-curriculum.md"), "utf8");
const curriculum = parseA1DaysOneToFourteen(canonicalSource);

describe("A1 learning presentation", () => {
  it("derives Day 1 dashboard targets and separate Core from the canonical source", () => {
    const dayOne = curriculum.days[0];
    expect(todayTargets(dayOne).map((target) => target.label)).toEqual([
      "Learn",
      "Pronunciation",
      "Build",
      "Speak",
      "Practical task",
    ]);
    expect(dailyCoreItems(dayOne).map((item) => item.german)).toEqual(["Guten Tag", "Ja / Nein", "Danke"]);
    expect(lessonFlow.map((flow) => flow.label)).toEqual([
      "Learn", "Pronunciation", "Listen", "Practice", "Speak", "Real-life mission", "Communication repair", "Review", "Mastery check",
    ]);
    expect(sentenceBuilderStages(dayOne)).toContain("Words");
    expect(notebookGuidance(dayOne)).toEqual(expect.arrayContaining([dayOne.sentenceBuilder.answer]));
  });

  it("provides the Day 5-required alphabet and high-value spelling foundation without an audio claim", () => {
    expect(germanAlphabetFoundation).toHaveLength(30);
    expect(germanAlphabetFoundation.map((entry) => entry.letter)).toEqual(expect.arrayContaining(["A", "Z", "Ä", "Ö", "Ü", "ß"]));
    expect(highValueSpellingPatterns.map(([pattern]) => pattern)).toEqual(expect.arrayContaining(["ch", "sch", "sp / st", "ei", "ie", "eu / äu", "au", "er", "qu", "z", "w / v / j"]));
  });

  it("cleans source-only notation while retaining the approved learner meaning", () => {
    const rendered = learnerText("**Focus:** The voiceless palatal fricative [Unit 1] is shown as \\(ich\\) and $$x = y$$.");
    expect(rendered).toContain("light ich sound");
    expect(rendered).not.toMatch(/Unit|\\\\|\$\$/);
  });
});
