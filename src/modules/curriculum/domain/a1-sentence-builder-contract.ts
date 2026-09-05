export const legacySentenceBuilderAnswers: Record<number, string> = {
  1: "Guten Tag. Ich bin Anna.",
  2: "Ich bin Herr Wagner.",
  3: "Sind Sie Herr Schmidt?",
  4: "Guten Tag. Ich bin John. Ich komme aus England.",
  5: "Buchstabieren Sie das, bitte!",
  6: "Das Handy ist hier.",
  7: "Guten Tag. Ich bin John.",
  8: "Der Bahnhof ist dort.",
  9: "Haben Sie das Handy?",
  10: "Ich möchte Brot und Kaffee, bitte.",
  11: "Das Büro ist nicht geöffnet.",
  12: "Wann ist der Termin?",
  13: "Ich fahre mit dem Zug.",
  14: "Guten Tag. Ich bin John.",
};

export function normalizeForVerification(markdown: string): string {
  return markdown
    .replace(/\r/g, "")
    .replace(/\*+/g, "")
    .replace(/`/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyLegacyAnswer(
  dayNumber: number,
  sourceMarkdown: string,
): boolean {
  const answer = legacySentenceBuilderAnswers[dayNumber];
  if (!answer) return false;
  const normalizedSource = normalizeForVerification(sourceMarkdown);
  const normalizedAnswer = normalizeForVerification(answer);
  return normalizedSource.includes(normalizedAnswer);
}
