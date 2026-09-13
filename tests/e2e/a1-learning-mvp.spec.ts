import { expect, test } from "@playwright/test";

test("local A1 Day 1 learning flow unlocks Day 2 only after lesson and practice", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(
    page.getByRole("button", { name: "Start / Continue" }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /Formal Greetings, Self-Identity, and the First Person Singular/,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /optional Pre-A1 foundation/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: "42-day Map" }).click();

  const dayOne = page.getByRole("button", { name: /^Day 1\b/ });
  const dayTwo = page.getByRole("button", { name: /^Day 2\b/ });

  await expect(dayOne).toBeEnabled();
  await expect(dayTwo).toBeDisabled();

  await dayOne.click();

  await expect(
    page.getByRole("button", { name: "Complete lesson" }),
  ).toBeEnabled();

  await expect(
    page.getByRole("heading", {
      name: /focused study plan from the approved Day 1 content/i,
    }),
  ).toBeVisible();

  for (const target of [
    "Learn",
    "Pronunciation",
    "Build",
    "Speak",
    "Practical task",
  ]) {
    await expect(page.getByText(target, { exact: true }).first()).toBeVisible();
  }

  await expect(
    page.getByText("Daily German Core", { exact: true }).first(),
  ).toBeVisible();

  await expect(page.getByText("Audio not available yet")).toBeVisible();

  await page.getByLabel("Internal learning status").selectOption("strong_evidence");

  await page.getByRole("button", { name: "Complete lesson" }).click();

  await page.getByRole("button", { name: "42-day Map" }).click();
  await expect(dayTwo).toBeDisabled();

  await dayOne.click();

  const availableTokens = page.locator(
    '[aria-label="Available sentence tokens"]',
  );

  await availableTokens
    .getByRole("button", { name: "Anna", exact: true })
    .click();
  await page.getByRole("button", { name: "Check sentence" }).click();

  await expect(page.getByText("Structural hint:")).toBeVisible();

  await page.getByRole("button", { name: "Retry" }).click();

  await expect(page.getByText("Stronger hint:")).toBeVisible();

  await availableTokens
    .getByRole("button", { name: "Anna", exact: true })
    .click();

  await page.getByRole("button", { name: "Check sentence" }).click();

  await expect(page.getByText("Canonical answer:")).toBeVisible();

  await expect(
    page.getByText(
      "Now build that exact sentence once yourself.",
    ),
  ).toBeVisible();

  for (const token of [
    "Guten",
    "Tag",
    ".",
    "Ich",
    "bin",
    "Anna",
    ".",
  ]) {
    await availableTokens
      .getByRole("button", { name: token, exact: true })
      .first()
      .click();
  }

  await page.getByRole("button", { name: "Check reconstruction" }).click();

  await expect(page.getByText("Correct.", { exact: true })).toBeVisible();

  // Sentence-builder completion is evidence inside Practice.
  // The day unlock rule requires the explicit Practice target too.
  await page.getByRole("button", { name: "Complete practice" }).click();

  await page.getByRole("button", { name: "42-day Map" }).click();
  await expect(dayTwo).toBeEnabled();

  await page.reload();

  await page.getByRole("button", { name: "42-day Map" }).click();
  await expect(dayTwo).toBeEnabled();

  await dayOne.click();

  // Review candidates are attempt-backed; mark the completed day after
  // recording one recent local learner attempt.
  await page.evaluate(() => {
    const key = "deutschos.local-a1-days-1-14-progress.v1";
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error("Expected local learning progress");

    const progress = JSON.parse(raw);
    progress.attempts = [
      ...(progress.attempts ?? []),
      {
        id: "e2e-review-attempt-day-1",
        dayNumber: 1,
        exerciseId: "e2e-review-exercise-day-1",
        correct: true,
        result: "correct",
        skill: "grammar",
        at: new Date().toISOString(),
      },
    ];

    window.localStorage.setItem(key, JSON.stringify(progress));
  });

  await page.reload();

  await page.getByRole("button", { name: "42-day Map" }).click();
  await page.getByRole("button", { name: /^Day 1\b/ }).click();

  await page.getByRole("button", { name: "Mark Needs Review" }).click();

  await expect(page.getByRole("button", { name: /Review what’s shaky \(1\)/ })).toBeVisible();
  await page.getByRole("button", { name: /Review what’s shaky \(1\)/ }).click();

  await expect(
    page.getByText("Return to a marked learning day"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open day" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: /^Formal Greetings/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Role-Play" }).click();

  await expect(page.getByLabel("Copyable tutor prompt")).toHaveValue(
    /Handoff: Role-Play/,
  );

  await expect(
    page.getByText(
      "Only Days 1–14 are available in this learning milestone. Day 15 and later are not exposed.",
    ),
  ).toBeVisible();
});

test("the optional Pre-A1 bridge does not gate A1", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.getByRole("link", { name: /optional Pre-A1 foundation/i }).click();

  await expect(
    page.getByRole("heading", { name: "Pre-A1 → A1 Bridge" }),
  ).toBeVisible();

  await expect(page.getByText("This is not a second A1 course.")).toBeVisible();
  await expect(page.getByText("Session 15")).toBeVisible();

  await page.getByRole("link", { name: "Start A1 Day 1 directly" }).click();

  await page.getByRole("button", { name: "42-day Map" }).click();

  await expect(page.getByRole("button", { name: /^Day 1\b/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /^Day 2\b/ })).toBeDisabled();
});

test("Day 5 exposes the alphabet reference and the experience stays usable on a small screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");

  await page.evaluate(() => {
    const complete = {
      lessonCompleted: true,
      practiceCompleted: true,
      sentenceBuilderCompleted: true,
      completedPracticeTaskIds: [],
      needsReview: false,
      masteryStatus: "developing",
    };

    window.localStorage.setItem(
      "deutschos.local-a1-days-1-14-progress.v1",
      JSON.stringify({
        version: 1,
        currentDay: 5,
        days: {
          1: complete,
          2: complete,
          3: complete,
          4: complete,
          5: {
            lessonCompleted: false,
            practiceCompleted: false,
            sentenceBuilderCompleted: false,
            completedPracticeTaskIds: [],
            needsReview: false,
            masteryStatus: "not_assessed",
          },
        },
        attempts: [],
      }),
    );
  });

  await page.reload();

  await page.getByRole("button", { name: "42-day Map" }).click();

  const dayFive = page.getByRole("button", { name: /^Day 5\b/ });
  await expect(dayFive).toBeEnabled();
  await dayFive.click();

  await expect(
    page.getByRole("heading", { level: 2, name: /Parting Protocols/ }),
  ).toBeVisible();

  await page.getByText("Pronunciation Foundation", { exact: true }).click();

  await expect(
    page.getByText(/German alphabet and high-value spelling patterns/),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Audio not available yet. These are learner-facing spelling references, not simulated recordings.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Pronunciation Practice" }).click();

  await expect(page.getByLabel("Copyable tutor prompt")).toHaveValue(
    /Handoff: Pronunciation Practice/,
  );
});
