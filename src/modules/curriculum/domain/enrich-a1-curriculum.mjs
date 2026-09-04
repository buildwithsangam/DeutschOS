function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function sourceEntity(id, source, rawMarkdown) {
  return { id, source, rawMarkdown };
}

function extractVocabulary(day) {
  const result = [];
  for (const match of day.rawMarkdown.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    const value = match[1].trim();
    if (!/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/i.test(value)) continue;
    result.push({
      id: `a1.vocab.d${String(day.number).padStart(2, "0")}.${slug(value)}`,
      term: value,
      source: day.source,
      rawMarkdown: value,
    });
  }
  return [...new Map(result.map((item) => [item.id, item])).values()];
}

function extractExercises(day) {
  const section = day.sections.find((item) => item.canonicalKey === "sentenceBuilding");
  if (!section) return [];
  return [{
    id: `a1.exercise.d${String(day.number).padStart(2, "0")}.sentence-building`,
    dayId: day.id,
    type: null,
    title: section.heading,
    prompt: section.rawMarkdown,
    source: section.source,
  }];
}

function extractMastery(day) {
  const section = day.sections.find((item) => item.canonicalKey === "mastery");
  return section ? [{ id: `a1.mastery.d${String(day.number).padStart(2, "0")}`, dayId: day.id, title: section.heading, definition: section.rawMarkdown, source: section.source }] : [];
}

function extractDialogue(day) {
  const sections = day.sections.filter((section) => section.canonicalKey === "nativeInteraction" || /dialogue/i.test(section.heading) || /(?:^|\n)\s*[AB]:\s+/m.test(section.rawMarkdown));
  return sections.map((section, index) => ({
    id: `a1.dialogue.d${String(day.number).padStart(2, "0")}.${index + 1}`,
    dayId: day.id,
    title: section.heading,
    rawMarkdown: section.rawMarkdown,
    source: section.source,
  }));
}

function extractOnePerDay(day, key, prefix, field) {
  const section = day.sections.find((item) => item.canonicalKey === key);
  return section ? [{ id: `a1.${prefix}.d${String(day.number).padStart(2, "0")}`, dayId: day.id, [field]: section.rawMarkdown, source: section.source }] : [];
}

export function enrichA1Curriculum(curriculum) {
  const vocabulary = curriculum.days.flatMap(extractVocabulary);
  const grammar = curriculum.days.flatMap((day) => extractOnePerDay(day, "minimumTheory", "grammar", "definition"));
  const pronunciation = curriculum.days.flatMap((day) => extractOnePerDay(day, "pronunciation", "pronunciation", "definition"));
  const dialogues = curriculum.days.flatMap(extractDialogue);
  const practicalMissions = curriculum.days.flatMap((day) => extractOnePerDay(day, "practicalTask", "mission", "definition"));
  const exercises = curriculum.days.flatMap(extractExercises);
  const masteryChecks = curriculum.days.flatMap(extractMastery);
  const unknownSections = curriculum.days.flatMap((day) => day.sections.filter((section) => section.canonicalKey === null).map((section) => ({ id: section.id, dayId: day.id, heading: section.heading, rawMarkdown: section.rawMarkdown, source: section.source })));
  const exerciseTargets = exercises.map((exercise) => ({ id: `${exercise.id}.target`, exerciseId: exercise.id, dayId: exercise.dayId, source: exercise.source }));

  return {
    curriculum: { id: curriculum.id, level: curriculum.level, title: curriculum.title, source: curriculum.source },
    phases: curriculum.phases,
    weeks: curriculum.weeks,
    days: curriculum.days,
    daySections: curriculum.days.flatMap((day) => day.sections),
    vocabulary,
    grammar,
    pronunciation,
    dialogues,
    practicalMissions,
    exercises,
    masteryChecks,
    exerciseTargets,
    unknownSections,
  };
}
