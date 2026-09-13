"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createGeminiHandoffPrompt, type GeminiTutorMode } from "@/modules/ai/application/create-gemini-handoff";
import {
  DEFAULT_EXAM_TRACK_ID,
  EXAM_TRACK_IDS,
  EXAM_TRACK_METADATA,
  normalizeExamTrackId,
  type ExamTrackId,
} from "@/modules/exam/domain/exam-track";
import type {
  A1Curriculum,
  A1Day,
  A1LessonSection,
  A1SectionKind,
  SentenceBuilderExercise,
} from "@/modules/curriculum/domain/a1-days-1-14";
import { germanAlphabetFoundation, highValueSpellingPatterns } from "@/modules/curriculum/domain/german-pronunciation-foundation";
import { learnerText, notebookGuidance } from "@/modules/curriculum/domain/learner-content";
import {
  dailyCoreItems,
  lessonFlow,
  sectionsForFlow,
  sentenceBuilderStages,
  todayTargets,
} from "@/modules/curriculum/domain/learning-presentation";
import {
  createLocalProgress,
  dayProgress,
  isDayUnlocked,
  localProgressStorageKey,
  readLocalProgress,
  type LocalAttempt,
  type LocalLearningProgress,
  type MasteryStatus,
  isPracticeTaskComplete,
  withAttempt,
  withDayProgress,
  withPracticeTaskCompletion,
} from "@/modules/learning/domain/local-progress";
import { practiceTasksForDay } from "@/modules/learning/domain/practice-tasks";
import { buildReviewQueue, reviewReasonLabel } from "@/modules/learning/domain/review-queue";
import { buildProgressSummary } from "@/modules/learning/domain/progress-summary";
import {
  deriveExercisesForDay,
  type A1Exercise,
} from "@/modules/learning/domain/a1-exercises";

type View = "today" | "day" | "map" | "review" | "vocabulary" | "exam" | "settings";

type CoreVocabularyItem = {
  german: string;
  meaningAndType: string;
  register?: "Formal" | "Informal";
  dayNumber: number;
  weekNumber: number;
};

const tutorModes: GeminiTutorMode[] = [
  "Guide Me",
  "Pronunciation Practice",
  "Sentence Builder",
  "Role-Play",
  "Review & Error Repair",
];

const sectionLabels: Record<A1LessonSection["kind"], string> = {
  main_lesson: "Main lesson",
  vocabulary: "Vocabulary & patterns",
  grammar: "Grammar focus",
  daily_german_core: "Daily German Core",
  pronunciation: "Pronunciation",
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  sentence_builder: "Sentence building",
  retrieval_review: "Retrieval & review",
  practical_task: "Practical Germany task",
  communication_repair: "Communication repair",
  realistic_interaction: "Realistic interaction",
  mastery_check: "Mastery check",
  interest_driven: "Interest-driven German",
  other: "Other",
};

function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n").map(learnerText).filter(Boolean);
  return (
    <div className="source-content">
      {lines.map((line, index) =>
        /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) ? (
          <p className="source-bullet" key={`${line}-${index}`}>
            {line.replace(/^[-*]\s+/, "")}
          </p>
        ) : (
          <p key={`${line}-${index}`}>{line}</p>
        ),
      )}
    </div>
  );
}

function normaliseSentence(value: string) {
  return value
    .trim()
    .replace(/\s+([.,?!:;])/g, "$1")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de-DE");
}

// --------------------------------------------------------------------
// P0.3 Sentence Builder (unchanged)
// --------------------------------------------------------------------

function ActiveSentenceExercise({
  exercise,
  disabled,
  onComplete,
}: {
  exercise: SentenceBuilderExercise;
  disabled: boolean;
  onComplete: () => void;
}) {
  const [available, setAvailable] = useState(() =>
    [...exercise.tokens].reverse(),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [result, setResult] = useState<
    "idle" | "hint" | "strong_hint" | "answer_revealed" | "complete"
  >("idle");

  const builtSentence = selected.join(" ").replace(/\s+([.,?!:;])/g, "$1");

  const reset = () => {
    setAvailable([...exercise.tokens].reverse());
    setSelected([]);
    if (result !== "answer_revealed") {
      setResult(incorrectAttempts === 1 ? "strong_hint" : "idle");
    }
  };
  const beginOrEditAttempt = () => {
    if (result === "answer_revealed" || result === "complete") return;
    setResult(incorrectAttempts === 1 ? "strong_hint" : "idle");
  };
  const check = () => {
    if (normaliseSentence(builtSentence) === normaliseSentence(exercise.answer)) {
      setResult("complete");
      onComplete();
    } else {
      const nextIncorrectAttempts = incorrectAttempts + 1;
      setIncorrectAttempts(nextIncorrectAttempts);
      if (nextIncorrectAttempts >= 2) {
        setResult("answer_revealed");
        setAvailable([...exercise.tokens].reverse());
        setSelected([]);
      } else {
        setResult("hint");
      }
    }
  };

  const firstToken = exercise.tokens[0];
  const finalToken = exercise.tokens.at(-1);

  return (
    <div className="active-exercise">
      <MarkdownContent markdown={exercise.prompt} />
      <div className="token-row" aria-label="Available sentence tokens">
        {available.map((token, index) => (
          <button
            className="token"
            disabled={disabled}
            key={`${token}-${index}`}
            onClick={() => {
              setSelected([...selected, token]);
              setAvailable(
                available.filter((_, itemIndex) => itemIndex !== index),
              );
              beginOrEditAttempt();
            }}
            type="button"
          >
            {token}
          </button>
        ))}
      </div>
      <div className="answer-slot" aria-label="Your sentence">
        {selected.length ? (
          selected.map((token, index) => (
            <button
              className="selected-token"
              disabled={disabled}
              key={`${token}-${index}`}
              onClick={() => {
                setAvailable([...available, token]);
                setSelected(
                  selected.filter((_, itemIndex) => itemIndex !== index),
                );
                beginOrEditAttempt();
              }}
              type="button"
            >
              {token}
            </button>
          ))
        ) : (
          <span>Select tokens in order.</span>
        )}
      </div>
      <div className="button-row">
        <button
          className="button primary"
          disabled={disabled || selected.length === 0 || result === "complete"}
          onClick={check}
          type="button"
        >
          {result === "answer_revealed"
            ? "Check reconstruction"
            : "Check sentence"}
        </button>
        <button
          className="button secondary"
          disabled={disabled}
          onClick={reset}
          type="button"
        >
          Retry
        </button>
      </div>
      {result === "hint" ? (
        <p className="feedback warning">
          <strong>Structural hint:</strong> Start with{" "}
          <strong>{firstToken}</strong>.
        </p>
      ) : null}
      {result === "strong_hint" ? (
        <p className="feedback warning">
          <strong>Stronger hint:</strong> This answer has{" "}
          {exercise.tokens.length} parts and finishes with{" "}
          <strong>{finalToken}</strong>.
        </p>
      ) : null}
      {result === "answer_revealed" ? (
        <div className="answer-reveal">
          <strong>Canonical answer:</strong> <span>{exercise.answer}</span>
          <p>Now build that exact sentence once yourself.</p>
        </div>
      ) : null}
      {result === "complete" ? (
        <p className="feedback success">Correct.</p>
      ) : null}
    </div>
  );
}

function SentenceBuilder({
  day,
  disabled,
  onComplete,
}: {
  day: A1Day;
  disabled: boolean;
  onComplete: () => void;
}) {
  const exercises = day.sentenceBuilders ?? [];
  const activeExercises = exercises.filter((e) => e.type === "active_sentence");
  const readOnlyExercises = exercises.filter(
    (e) => e.type !== "active_sentence",
  );

  const [completedActive, setCompletedActive] = useState<
    Record<string, boolean>
  >({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const allActiveComplete =
    activeExercises.length > 0 &&
    activeExercises.every((exercise) => completedActive[exercise.id]);

  useEffect(() => {
    if (allActiveComplete) {
      onCompleteRef.current();
    }
  }, [allActiveComplete]);

  const handleActiveComplete = (exerciseId: string) => {
    setCompletedActive((current) => ({ ...current, [exerciseId]: true }));
  };

  if (activeExercises.length === 0) {
    return (
      <section
        className="practice-card"
        aria-labelledby="sentence-builder-heading"
      >
        <div className="eyebrow">Interactive practice</div>
        <h3 id="sentence-builder-heading">Sentence Builder</h3>
        <p>This day contains guided or read-only sentence-building material.</p>
        {readOnlyExercises.map((exercise) => (
          <div key={exercise.id} className="read-only-exercise">
            <div className="eyebrow">
              {exercise.type.replace("_", " ")}
            </div>
            <MarkdownContent markdown={exercise.prompt} />
          </div>
        ))}
        <button
          className="button primary"
          disabled={disabled}
          onClick={onComplete}
          type="button"
        >
          Mark sentence-building reviewed
        </button>
      </section>
    );
  }

  return (
    <section
      className="practice-card"
      aria-labelledby="sentence-builder-heading"
    >
      <div className="eyebrow">Interactive practice</div>
      <h3 id="sentence-builder-heading">Sentence Builder</h3>
      <p>Build each target using the tokens provided.</p>
      <div
        className="construction-ladder"
        aria-label="Sentence-building stages"
      >
        {sentenceBuilderStages(day).map((stage) => (
          <span key={stage}>{stage}</span>
        ))}
      </div>
      {activeExercises.map((exercise) => (
        <ActiveSentenceExercise
          key={exercise.id}
          exercise={exercise}
          disabled={disabled || completedActive[exercise.id]}
          onComplete={() => handleActiveComplete(exercise.id)}
        />
      ))}
      {readOnlyExercises.length > 0 ? (
        <div className="read-only-exercises">
          <h4>Additional sentence-building material</h4>
          {readOnlyExercises.map((exercise) => (
            <div key={exercise.id} className="read-only-exercise">
              <div className="eyebrow">
                {exercise.type.replace("_", " ")}
              </div>
              <MarkdownContent markdown={exercise.prompt} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// --------------------------------------------------------------------
// P0.4 Exercise Engine
// --------------------------------------------------------------------

type ExerciseAttemptHandler = (input: {
  exerciseId: string;
  correct: boolean;
  result?: LocalAttempt["result"];
  skill?: LocalAttempt["skill"];
  response?: string;
}) => void;

function ExerciseEngine({
  exercises,
  onAttempt,
}: {
  exercises: A1Exercise[];
  onAttempt: ExerciseAttemptHandler;
}) {
  if (!exercises.length) return null;

  return (
    <section className="exercise-engine">
      <div className="eyebrow">Practice exercises</div>
      <div className="exercise-list">
        {exercises.map((exercise) => (
          <ExerciseItem
            key={exercise.id}
            exercise={exercise}
            onAttempt={onAttempt}
          />
        ))}
      </div>
    </section>
  );
}

function ExerciseItem({
  exercise,
  onAttempt,
}: {
  exercise: A1Exercise;
  onAttempt: ExerciseAttemptHandler;
}) {
  switch (exercise.type) {
    case "flashcard":
      return (
        <FlashcardRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "multipleChoice":
      return (
        <MultipleChoiceRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "wordOrder":
      return (
        <WordOrderRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "fillBlank":
      return (
        <FillBlankRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "matchPairs":
      return (
        <MatchPairsRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "typeAnswer":
      return (
        <TypeAnswerRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "listenSelect":
      return (
        <ListenSelectRenderer
          exercise={exercise}
          onAttempt={onAttempt}
        />
      );
    case "shadow":
      return <ShadowRenderer exercise={exercise} />;
    case "roleplay":
      return <RoleplayRenderer exercise={exercise} />;
    case "writeShort":
      return <WriteShortRenderer exercise={exercise} />;
    case "checklist":
      return <ChecklistRenderer exercise={exercise} />;
    default:
      return null;
  }
}

function FlashcardRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "flashcard" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="flashcard-exercise">
      <button
        className="flashcard"
        onClick={() => setFlipped(!flipped)}
        type="button"
      >
        <span>{flipped ? exercise.data.back : exercise.data.front}</span>
        {exercise.data.register ? (
          <small>{exercise.data.register} register</small>
        ) : null}
      </button>
      <button
        className="button subtle"
        disabled={done}
        onClick={() => {
          setDone(true);
          onAttempt({
            exerciseId: exercise.id,
            correct: true,
            result: "correct",
            response: exercise.data.front,
          });
        }}
        type="button"
      >
        {done ? "Reviewed" : "Mark reviewed"}
      </button>
      <span className="muted">{exercise.source}</span>
    </div>
  );
}

function MultipleChoiceRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "multipleChoice" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");

  const check = () => {
    const correct = selected === exercise.data.correctIndex;
    setResult(correct ? "correct" : "incorrect");
    onAttempt({
      exerciseId: exercise.id,
      correct,
      result: correct ? "correct" : "incorrect",
    });
  };

  return (
    <div className="multiple-choice-exercise">
      <p>{exercise.data.question}</p>
      {exercise.data.options.map((option, index) => (
        <button
          key={`${option}-${index}`}
          className={selected === index ? "selected" : ""}
          disabled={result === "correct"}
          onClick={() => setSelected(index)}
          type="button"
        >
          {option}
        </button>
      ))}
      <button
        className="button primary"
        disabled={selected === null || result === "correct"}
        onClick={check}
        type="button"
      >
        Check
      </button>
      {result === "correct" ? (
        <span className="feedback success">Correct</span>
      ) : null}
      {result === "incorrect" ? (
        <span className="feedback warning">Incorrect</span>
      ) : null}
    </div>
  );
}

function WordOrderRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "wordOrder" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const [available, setAvailable] = useState(() => [...exercise.data.tokens]);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");

  const check = () => {
    const sentence = selected.join(" ").replace(/\s+([.,?!:;])/g, "$1");
    const correct =
      normaliseSentence(sentence) === normaliseSentence(exercise.data.answer);

    setResult(correct ? "correct" : "incorrect");
    onAttempt({
      exerciseId: exercise.id,
      correct,
      result: correct ? "correct" : "incorrect",
      response: sentence,
    });
  };

  const reset = () => {
    setAvailable([...exercise.data.tokens]);
    setSelected([]);
    setResult("idle");
  };

  return (
    <div className="word-order-exercise">
      <p>{exercise.prompt}</p>
      <div className="token-row">
        {available.map((token, index) => (
          <button
            className="token"
            key={`${token}-${index}`}
            onClick={() => {
              setSelected([...selected, token]);
              setAvailable(available.filter((_, i) => i !== index));
            }}
            type="button"
          >
            {token}
          </button>
        ))}
      </div>
      <div className="answer-slot">
        {selected.map((token, index) => (
          <button
            className="selected-token"
            key={`${token}-${index}`}
            onClick={() => {
              setAvailable([...available, token]);
              setSelected(selected.filter((_, i) => i !== index));
            }}
            type="button"
          >
            {token}
          </button>
        ))}
      </div>
      <button className="button primary" onClick={check} type="button">
        Check
      </button>
      <button className="button secondary" onClick={reset} type="button">
        Reset
      </button>
      {result === "correct" ? (
        <span className="feedback success">Correct</span>
      ) : null}
      {result === "incorrect" ? (
        <span className="feedback warning">Incorrect</span>
      ) : null}
    </div>
  );
}

function FillBlankRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "fillBlank" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const check = () => {
    setSubmitted(true);
    onAttempt({
      exerciseId: exercise.id,
      correct: allCorrect,
      result: allCorrect ? "correct" : "incorrect",
      response: JSON.stringify(answers),
    });
  };

  const allCorrect = exercise.data.blanks.every(
    (blank) =>
      normaliseSentence(answers[blank.id] ?? "") ===
      normaliseSentence(blank.answer),
  );

  return (
    <div className="fill-blank-exercise">
      <p>{exercise.data.sentence}</p>
      {exercise.data.blanks.map((blank) => (
        <div key={blank.id} className="fill-blank-input">
          <input
            value={answers[blank.id] ?? ""}
            onChange={(e) =>
              setAnswers({ ...answers, [blank.id]: e.target.value })
            }
            aria-label={`Blank ${blank.id}`}
          />
          {submitted ? (
            <span
              className={
                normaliseSentence(answers[blank.id] ?? "") ===
                normaliseSentence(blank.answer)
                  ? "feedback success"
                  : "feedback warning"
              }
            >
              {normaliseSentence(answers[blank.id] ?? "") ===
              normaliseSentence(blank.answer)
                ? "Correct"
                : `Answer: ${blank.answer}`}
            </span>
          ) : null}
        </div>
      ))}
      <button className="button primary" onClick={check} type="button">
        Check
      </button>
      {submitted && allCorrect ? (
        <p className="feedback success">All blanks correct.</p>
      ) : null}
    </div>
  );
}

function MatchPairsRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "matchPairs" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const leftOptions = exercise.data.pairs.map((pair) => pair.left);
  const rightOptions = useMemo(
    () => exercise.data.pairs.map((pair) => pair.right).reverse(),
    [exercise.data.pairs],
  );

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedLeft, setMatchedLeft] = useState<Set<string>>(new Set());
  const [matchedRight, setMatchedRight] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<"idle" | "correct" | "incorrect">("idle");

  const evaluatePair = (left: string, right: string) => {
    const pair = exercise.data.pairs.find(
      (candidate) => candidate.left === left && candidate.right === right,
    );
    const correct = Boolean(pair);

    if (pair) {
      setMatchedLeft((prev) => {
        const next = new Set(prev);
        next.add(left);
        return next;
      });
      setMatchedRight((prev) => {
        const next = new Set(prev);
        next.add(right);
        return next;
      });
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }

    onAttempt({
      exerciseId: exercise.id,
      correct,
      result: correct ? "correct" : "incorrect",
      response: JSON.stringify({ left, right }),
    });

    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const handleLeftClick = (left: string) => {
    if (matchedLeft.has(left)) return;
    setFeedback("idle");

    if (selectedRight) {
      evaluatePair(left, selectedRight);
      return;
    }

    setSelectedLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (matchedRight.has(right)) return;
    setFeedback("idle");

    if (selectedLeft) {
      evaluatePair(selectedLeft, right);
      return;
    }

    setSelectedRight(right);
  };

  const complete =
    matchedLeft.size === exercise.data.pairs.length &&
    matchedRight.size === exercise.data.pairs.length;

  return (
    <div className="match-pairs-exercise">
      <p>{exercise.prompt}</p>
      <div className="match-columns">
        <div className="match-column">
          {leftOptions.map((left) => (
            <button
              key={left}
              className={
                selectedLeft === left
                  ? "selected"
                  : matchedLeft.has(left)
                    ? "matched"
                    : ""
              }
              disabled={matchedLeft.has(left)}
              onClick={() => handleLeftClick(left)}
              type="button"
            >
              {left}
            </button>
          ))}
        </div>
        <div className="match-column">
          {rightOptions.map((right) => (
            <button
              key={right}
              className={
                selectedRight === right
                  ? "selected"
                  : matchedRight.has(right)
                    ? "matched"
                    : ""
              }
              disabled={matchedRight.has(right)}
              onClick={() => handleRightClick(right)}
              type="button"
            >
              {right}
            </button>
          ))}
        </div>
      </div>
      {feedback === "correct" ? (
        <span className="feedback success">Correct match</span>
      ) : null}
      {feedback === "incorrect" ? (
        <span className="feedback warning">Incorrect match</span>
      ) : null}
      {complete ? (
        <p className="feedback success">All pairs matched.</p>
      ) : null}
    </div>
  );
}

function TypeAnswerRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "typeAnswer" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");

  const check = () => {
    const accepted = [exercise.data.answer, ...(exercise.data.accepted ?? [])];
    const correct = accepted.some(
      (a) => normaliseSentence(a) === normaliseSentence(answer),
    );

    setResult(correct ? "correct" : "incorrect");
    onAttempt({
      exerciseId: exercise.id,
      correct,
      result: correct ? "correct" : "incorrect",
      response: answer,
    });
  };

  return (
    <div className="type-answer-exercise">
      <p>{exercise.prompt}</p>
      <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <button className="button primary" onClick={check} type="button">
        Check
      </button>
      {result === "correct" ? (
        <span className="feedback success">Correct</span>
      ) : null}
      {result === "incorrect" ? (
        <span className="feedback warning">Incorrect</span>
      ) : null}
    </div>
  );
}

function ListenSelectRenderer({
  exercise,
  onAttempt,
}: {
  exercise: Extract<A1Exercise, { type: "listenSelect" }>;
  onAttempt: ExerciseAttemptHandler;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");

  const check = () => {
    const correct = selected === exercise.data.correctIndex;
    setResult(correct ? "correct" : "incorrect");
    onAttempt({
      exerciseId: exercise.id,
      correct,
      result: correct ? "correct" : "incorrect",
    });
  };

  return (
    <div className="listen-select-exercise">
      <p>{exercise.prompt}</p>
      <p className="muted">Audio is not available.</p>
      {exercise.data.options.map((option, index) => (
        <button
          key={`${option}-${index}`}
          className={selected === index ? "selected" : ""}
          disabled={result === "correct"}
          onClick={() => setSelected(index)}
          type="button"
        >
          {option}
        </button>
      ))}
      <button
        className="button primary"
        disabled={selected === null || result === "correct"}
        onClick={check}
        type="button"
      >
        Check
      </button>
      {result === "correct" ? (
        <span className="feedback success">Correct</span>
      ) : null}
      {result === "incorrect" ? (
        <span className="feedback warning">Incorrect</span>
      ) : null}
    </div>
  );
}

function ShadowRenderer({
  exercise,
}: {
  exercise: Extract<A1Exercise, { type: "shadow" }>;
}) {
  const [done, setDone] = useState(false);

  return (
    <div className="shadow-exercise">
      <p>{exercise.prompt}</p>
      <p>{exercise.data.text}</p>
      <button
        className="button primary"
        disabled={done}
        onClick={() => setDone(true)}
        type="button"
      >
        {done ? "Practised" : "Mark practised"}
      </button>
    </div>
  );
}

function RoleplayRenderer({
  exercise,
}: {
  exercise: Extract<A1Exercise, { type: "roleplay" }>;
}) {
  const [done, setDone] = useState(false);

  return (
    <div className="roleplay-exercise">
      <p>{exercise.prompt}</p>
      <p>{exercise.data.scenario}</p>
      {exercise.data.guidance ? (
        <p className="muted">{exercise.data.guidance}</p>
      ) : null}
      <button
        className="button primary"
        disabled={done}
        onClick={() => setDone(true)}
        type="button"
      >
        {done ? "Completed" : "Mark completed"}
      </button>
    </div>
  );
}

function WriteShortRenderer({
  exercise,
}: {
  exercise: Extract<A1Exercise, { type: "writeShort" }>;
}) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="write-short-exercise">
      <p>{exercise.prompt}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <button
        className="button primary"
        disabled={done}
        onClick={() => setDone(true)}
        type="button"
      >
        {done ? "Completed" : "Mark completed"}
      </button>
    </div>
  );
}

function ChecklistRenderer({
  exercise,
}: {
  exercise: Extract<A1Exercise, { type: "checklist" }>;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const total = exercise.data.items.length;
  const allChecked = checkedCount === total;

  return (
    <div className="checklist-exercise">
      <p>{exercise.prompt}</p>
      {exercise.data.items.map((item, index) => (
        <label key={`${item}-${index}`}>
          <input
            type="checkbox"
            checked={checked[item] ?? false}
            onChange={(e) =>
              setChecked({ ...checked, [item]: e.target.checked })
            }
            disabled={done}
          />
          {item}
        </label>
      ))}
      <p>
        {checkedCount}/{total} checked
      </p>
      <button
        className="button primary"
        disabled={!allChecked || done}
        onClick={() => setDone(true)}
        type="button"
      >
        {done ? "Completed" : "Mark complete"}
      </button>
    </div>
  );
}

// --------------------------------------------------------------------
// Existing P0.3 shared components (unchanged)
// --------------------------------------------------------------------

function TutorHandoff({
  curriculum,
  day,
}: {
  curriculum: A1Curriculum;
  day: A1Day;
}) {
  const [mode, setMode] = useState<GeminiTutorMode>("Guide Me");
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(
    () => createGeminiHandoffPrompt({ mode, day, curriculum }),
    [curriculum, day, mode],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="tutor-card" id="tutor">
      <div className="eyebrow">Gemini tutor handoff</div>
      <h3>Take today&apos;s exact context to your tutor</h3>
      <div className="handoff-tabs" aria-label="Tutor handoff type">
        {tutorModes.map((option) => (
          <button
            className={option === mode ? "tab active" : "tab"}
            key={option}
            onClick={() => {
              setMode(option);
              setCopied(false);
            }}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <textarea
        aria-label="Copyable tutor prompt"
        className="tutor-prompt"
        readOnly
        value={prompt}
      />
      <div className="button-row">
        <button className="button primary" onClick={copy} type="button">
          Copy prompt
        </button>
        {copied ? (
          <span className="feedback success">Copied.</span>
        ) : (
          <span className="muted">No automatic AI connection is used.</span>
        )}
      </div>
    </section>
  );
}

function LessonSection({ section }: { section: A1LessonSection }) {
  return (
    <section
      className={`lesson-section ${
        section.kind === "daily_german_core" ? "daily-core" : ""
      }`}
      id={section.id}
    >
      <div className="section-kicker">{sectionLabels[section.kind]}</div>
      <h3>{sectionLabels[section.kind]}</h3>
      {section.kind === "pronunciation" ? (
        <p className="audio-note">
          Audio not available yet. Use the approved learner-facing text
          guidance below; no audio is being simulated.
        </p>
      ) : null}
      <MarkdownContent markdown={section.markdown} />
    </section>
  );
}

function TodayTargets({
  day,
  progress,
}: {
  day: A1Day;
  progress: ReturnType<typeof dayProgress>;
}) {
  const remaining = [
    !progress.lessonCompleted ? "Finish Learn" : null,
    !progress.sentenceBuilderCompleted ? "Complete Sentence Builder" : null,
    !progress.practiceCompleted ? "Confirm today’s practice" : null,
  ].filter(Boolean);

  return (
    <section className="today-targets" aria-labelledby="today-targets-heading">
      <div className="section-kicker">Today&apos;s targets</div>
      <h2 id="today-targets-heading">
        A focused study plan from the approved Day {day.dayNumber} content
      </h2>
      <div className="target-grid">
        {todayTargets(day).map((target) => (
          <article className="target-card" key={target.label}>
            <span>{target.label}</span>
            <p>{target.value}</p>
          </article>
        ))}
      </div>
      <div className="today-status">
        <strong>Today&apos;s state</strong>
        <span>{progress.lessonCompleted ? "Learn complete" : "Learn remains"}</span>
        <span>
          {progress.sentenceBuilderCompleted
            ? "Sentence Builder complete"
            : "Sentence Builder remains"}
        </span>
        <span>
          {progress.practiceCompleted
            ? "Practice complete"
            : "Practice remains"}
        </span>
      </div>
      <p className="remaining">
        <strong>Next:</strong>{" "}
        {remaining.length
          ? remaining.join(" · ")
          : "Everything required for this day is complete. Review or begin the next available day."}
      </p>
    </section>
  );
}

function DailyGermanCore({ day }: { day: A1Day }) {
  const items = dailyCoreItems(day);
  if (!items.length) return null;
  return (
    <section
      className="core-panel"
      id="daily-core"
      aria-labelledby="daily-core-heading"
    >
      <div>
        <div className="section-kicker">Separate reinforcement layer</div>
        <h2 id="daily-core-heading">Daily German Core</h2>
        <p>
          Lightweight current-day language for real contact. It is separate
          from the main lesson, not a second course.
        </p>
      </div>
      <div className="core-items">
        {items.map((item) => (
          <article className="core-item" key={item.german}>
            <strong>{item.german}</strong>
            <p>{item.meaningAndType}</p>
            <div className="core-meta">
              <span>Introduced today</span>
              {item.register ? <span>{item.register} register</span> : null}
              <span>Audio unavailable</span>
            </div>
          </article>
        ))}
      </div>
      <p className="core-context">
        Practical context and approved examples appear in today&apos;s
        Real-life mission. The canonical day does not separately label every
        Core item active or receptive.
      </p>
    </section>
  );
}

function PronunciationFoundation({ day }: { day: A1Day }) {
  if (day.dayNumber < 5) return null;
  return (
    <details className="pronunciation-foundation" id="alphabet-foundation">
      <summary>
        <span>Pronunciation Foundation</span>
        <small>
          German alphabet and high-value spelling patterns · introduced in
          Day 5
        </small>
      </summary>
      <p className="audio-note">
        Audio not available yet. These are learner-facing spelling references,
        not simulated recordings.
      </p>
      <div className="alphabet-grid">
        {germanAlphabetFoundation.map((entry) => (
          <article key={entry.letter}>
            <strong>{entry.letter}</strong>
            <span>{entry.germanName}</span>
            <p>{entry.learnerNote}</p>
            {entry.example ? <small>Example: {entry.example}</small> : null}
          </article>
        ))}
      </div>
      <div className="pattern-grid">
        {highValueSpellingPatterns.map(([pattern, note]) => (
          <article key={pattern}>
            <strong>{pattern}</strong>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <p className="pronunciation-path">
        Use the progression already established in the curriculum: letter/sound
        → syllable → word → phrase → sentence → short connected speech.
      </p>
    </details>
  );
}

function LearningFlow({ day }: { day: A1Day }) {
  return (
    <nav className="learning-flow" aria-label="Today’s learning flow">
      <span>Today&apos;s flow</span>
      <a href="#today-targets">Targets</a>
      <a href="#learn">Learn</a>
      <a href="#pronunciation">Pronunciation</a>
      <a href="#listen">Listen</a>
      <a href="#practice">Practice</a>
      <a href="#sentence-builder-heading">Build</a>
      <a href="#speak">Speak</a>
      <a href="#mission">Mission</a>
      <a href="#repair">Repair</a>
      <a href="#review">Review</a>
      <a href="#interest">Interest</a>
      <a href="#additional">Additional</a>
      <a href="#tutor">Tutor</a>
      <a href="#mastery">Mastery</a>
      {day.dayNumber >= 5 ? <a href="#alphabet-foundation">Alphabet</a> : null}
    </nav>
  );
}

function FlowGroup({
  day,
  id,
  label,
  kinds,
}: {
  day: A1Day;
  id: string;
  label: string;
  kinds: A1SectionKind[];
}) {
  const sections = sectionsForFlow(day, kinds);
  if (!sections.length) return null;
  return (
    <section className={`flow-group flow-${id}`} id={id}>
      <div className="flow-heading">
        <span>{label}</span>
        <div />
      </div>
      {id === "learn" ? (
        <p className="flow-intro">
          Vocabulary and reusable patterns are kept in the approved Main lesson
          rather than duplicated into a second word list.
        </p>
      ) : null}
      {sections.map((section) => (
        <LessonSection key={section.id} section={section} />
      ))}
      {id === "pronunciation" ? <PronunciationFoundation day={day} /> : null}
    </section>
  );
}

function GuidedPracticeTasks({
  day,
  disabled,
  isComplete,
  onComplete,
}: {
  day: A1Day;
  disabled: boolean;
  isComplete: (taskId: string) => boolean;
  onComplete: (taskId: string) => void;
}) {
  const tasks = practiceTasksForDay(day).filter(
    (task) => task.kind !== "sentence_builder",
  );
  if (!tasks.length) return null;
  return (
    <section className="guided-practice">
      <div className="eyebrow">Guided practice</div>
      <h3>Retrieval and practical use</h3>
      <p>
        These canonical prompts ask for active recall or a practical response.
        Mark completion only after you have done the task; no unsupported
        automatic score is claimed.
      </p>
      {tasks.map((task) => (
        <article className="guided-task" key={task.id}>
          <span className="task-type">
            {task.kind === "retrieval" ? "Quick recall" : "Practical response"}
          </span>
          <strong>{task.title}</strong>
          <MarkdownContent markdown={task.instruction} />
          <button
            className="button secondary"
            disabled={disabled || isComplete(task.id)}
            onClick={() => onComplete(task.id)}
            type="button"
          >
            {isComplete(task.id) ? task.completionLabel : `Mark: ${task.completionLabel}`}
          </button>
        </article>
      ))}
    </section>
  );
}

export function A1LearningMvp({
  curriculum,
}: {
  curriculum: A1Curriculum;
}) {
  const [progress, setProgress] = useState<LocalLearningProgress>(
    createLocalProgress,
  );
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("today");
  const [speechRate, setSpeechRate] = useState(1);
  const [examTrack, setExamTrack] = useState<ExamTrackId>(
    DEFAULT_EXAM_TRACK_ID,
  );
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);

  useEffect(() => {
    const savedProgress = readLocalProgress(
      window.localStorage.getItem(localProgressStorageKey),
    );
    const savedRate = window.localStorage.getItem("deutschos.speech-rate");
    const savedTrack = window.localStorage.getItem("deutschos.exam-track");
    const normalizedTrack =
      normalizeExamTrackId(savedTrack) ?? DEFAULT_EXAM_TRACK_ID;
    const timer = window.setTimeout(() => {
      setProgress(savedProgress);
      if (savedRate) setSpeechRate(parseFloat(savedRate));
      setExamTrack(normalizedTrack);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(
        localProgressStorageKey,
        JSON.stringify(progress),
      );
      window.localStorage.setItem("deutschos.speech-rate", String(speechRate));
      window.localStorage.setItem("deutschos.exam-track", examTrack);
    }
  }, [hydrated, progress, speechRate, examTrack]);

  const activeDay =
    curriculum.days.find((day) => day.dayNumber === progress.currentDay) ??
    curriculum.days[0];
  const activeProgress = dayProgress(progress, activeDay.dayNumber);
  const activeNotebookNotes = notebookGuidance(activeDay);
  const followingDay = curriculum.days.find(
    (day) => day.dayNumber === activeDay.dayNumber + 1,
  );
  const courseWeeks = [
    ...new Set(curriculum.days.map((day) => day.weekNumber)),
  ];
  const reviewQueue = buildReviewQueue(progress).slice(0, 10);
  const progressSummary = buildProgressSummary(curriculum, progress);

  const vocabularyItems: CoreVocabularyItem[] = curriculum.days.flatMap(
    (day) =>
      dailyCoreItems(day).map((item) => ({
        ...item,
        dayNumber: day.dayNumber,
        weekNumber: day.weekNumber,
      })),
  );

  const dayExercises = useMemo(
    () => deriveExercisesForDay(activeDay),
    [activeDay],
  );

  const updateDay = (
    dayNumber: number,
    update: Parameters<typeof withDayProgress>[2],
  ) => setProgress((current) => withDayProgress(current, dayNumber, update));
  const completePracticeTask = (dayNumber: number, taskId: string) =>
    setProgress((current) =>
      withPracticeTaskCompletion(current, dayNumber, taskId),
    );
  const chooseDay = (dayNumber: number) => {
    if (!isDayUnlocked(progress, dayNumber)) return;
    setFocusedExerciseId(null);
    setProgress((current) => ({ ...current, currentDay: dayNumber }));
    setView("day");
  };

  const chooseReviewExercise = (dayNumber: number, exerciseId: string) => {
    if (!isDayUnlocked(progress, dayNumber)) return;
    setFocusedExerciseId(exerciseId);
    setProgress((current) => ({ ...current, currentDay: dayNumber }));
    setView("day");
  };

  const recordAttempt: ExerciseAttemptHandler = ({
    exerciseId,
    correct,
    result,
    skill,
    response,
  }) => {
    const attempt: LocalAttempt = {
      id: crypto.randomUUID(),
      dayNumber: activeDay.dayNumber,
      exerciseId,
      correct,
      result,
      skill,
      response,
      at: new Date().toISOString(),
    };

    setProgress((current) => withAttempt(current, attempt));
  };

  const handleResetProgress = () => {
    if (confirm("Reset all local learning progress? This cannot be undone.")) {
      const fresh = createLocalProgress();
      setProgress(fresh);
    }
  };

  const renderTopNav = () => (
    <nav className="top-level-nav" aria-label="Primary sections">
      <button
        className={view === "today" ? "active" : ""}
        onClick={() => setView("today")}
      >
        Today
      </button>
      <button
        className={view === "map" ? "active" : ""}
        onClick={() => setView("map")}
      >
        42-day Map
      </button>
      <button
        className={view === "review" ? "active" : ""}
        onClick={() => setView("review")}
      >
        Review
      </button>
      <button
        className={view === "vocabulary" ? "active" : ""}
        onClick={() => setView("vocabulary")}
      >
        Vocabulary
      </button>
      <button
        className={view === "exam" ? "active" : ""}
        onClick={() => setView("exam")}
      >
        Exam
      </button>
      <button
        className={view === "settings" ? "active" : ""}
        onClick={() => setView("settings")}
      >
        Settings
      </button>
    </nav>
  );

  const renderToday = () => {
    const totalTargets = 3;
    const completedTargets = [
      activeProgress.lessonCompleted,
      activeProgress.sentenceBuilderCompleted,
      activeProgress.practiceCompleted,
    ].filter(Boolean).length;
    return (
      <section className="today-dashboard">
        <div className="hero-card">
          <div className="eyebrow">Today · Week {activeDay.weekNumber}</div>
          <h1>
            Day {activeDay.dayNumber}: {activeDay.title}
          </h1>
          <p>{learnerText(activeDay.objective)}</p>
          <div className="button-row">
            <button className="button primary" onClick={() => setView("day")}>
              {completedTargets === totalTargets ? "Review day" : "Start / Continue"}
            </button>
            {reviewQueue.length > 0 && (
              <button className="button secondary" onClick={() => setView("review")}>
                Review what’s shaky ({reviewQueue.length})
              </button>
            )}
          </div>
        </div>
        <div className="progress-panel">
          <h3>Overall A1 progress</h3>
          <progress value={progressSummary.completedDays} max={progressSummary.totalDays}></progress>
          <p>
            {progressSummary.completedDays}/{progressSummary.totalDays} days complete
          </p>
          <h4>Today’s completion</h4>
          <div className="today-progress-bar">
            <span
              style={{
                width: `${(completedTargets / totalTargets) * 100}%`,
              }}
            />
          </div>
          <p>
            {completedTargets}/{totalTargets} targets
          </p>
        </div>
        <div className="dashboard-aside">
          <strong>
            {reviewQueue.length
              ? `${reviewQueue.length} item${
                  reviewQueue.length === 1 ? "" : "s"
                } ready for review`
              : "No review items right now"}
          </strong>
          <p>
            Review is learner-controlled in this local milestone. No SRS claim
            is made.
          </p>
          <a className="bridge-link" href="/pre-a1">
            New to German? Try the optional Pre-A1 foundation
          </a>
        </div>
      </section>
    );
  };

  const renderMap = () => (
    <section className="week-navigation" aria-label="A1 course days">
      {courseWeeks.map((weekNumber) => (
        <div className="week" key={weekNumber}>
          <div className="eyebrow">Week {weekNumber}</div>
          <div className="day-buttons">
            {curriculum.days
              .filter((day) => day.weekNumber === weekNumber)
              .map((day) => {
                const unlocked = isDayUnlocked(progress, day.dayNumber);
                const item = dayProgress(progress, day.dayNumber);
                return (
                  <button
                    aria-current={
                      activeDay.dayNumber === day.dayNumber ? "page" : undefined
                    }
                    className={`day-button ${
                      activeDay.dayNumber === day.dayNumber ? "current" : ""
                    } ${
                      item.lessonCompleted && item.practiceCompleted
                        ? "complete"
                        : ""
                    }`}
                    disabled={!hydrated || !unlocked}
                    key={day.dayNumber}
                    onClick={() => chooseDay(day.dayNumber)}
                    type="button"
                  >
                    <span>Day {day.dayNumber}</span>
                    <small>
                      {unlocked
                        ? item.lessonCompleted && item.practiceCompleted
                          ? "Complete"
                          : "Available"
                        : "Locked"}
                    </small>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
      <p className="muted">
        Only Days {curriculum.learningScope.firstDay}–
        {curriculum.learningScope.lastDay} are available in this learning
        milestone. Day {curriculum.learningScope.lastDay + 1} and later are
        not exposed.
      </p>
    </section>
  );

  const renderReview = () => (
    <section className="review-panel">
      <div className="eyebrow">Retrieval queue</div>
      <h2>Review what needs another pass</h2>
      {reviewQueue.length ? (
        reviewQueue.map((candidate) => {
          const day = curriculum.days.find(
            (item) => item.dayNumber === candidate.dayNumber,
          );

          return (
            <article
              className="review-item"
              key={`${candidate.exerciseId}-${candidate.lastAttemptAt}`}
            >
              <div>
                <strong>Day {candidate.dayNumber}</strong>
                <span>{day?.title ?? "Learning day"}</span>
                <small>
                  {candidate.exerciseId} · {reviewReasonLabel(candidate.reason)}
                </small>
              </div>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() =>
                    chooseReviewExercise(candidate.dayNumber, candidate.exerciseId)
                  }
                >
                  Review exercise
                </button>
                <button
                  className="button subtle"
                  onClick={() => chooseDay(candidate.dayNumber)}
                >
                  Open day
                </button>
                {candidate.reason === "needs_review" ? (
                  <button
                    className="button subtle"
                    onClick={() =>
                      updateDay(candidate.dayNumber, { needsReview: false })
                    }
                  >
                    Clear flag
                  </button>
                ) : null}
              </div>
            </article>
          );
        })
      ) : (
        <p>
          Nothing needs review right now. New mistakes and recent practice will
          appear here automatically.
        </p>
      )}
    </section>
  );

  const renderDayRunner = () => (
    <article className="lesson" key={activeDay.dayNumber}>
      <div className="lesson-heading">
        <div>
          <div className="eyebrow">
            Week {activeDay.weekNumber} · Day {activeDay.dayNumber}
          </div>
          <h2>{activeDay.title}</h2>
        </div>
        <div className="lesson-state">
          <label>
            Internal learning status
            <select
              aria-label="Internal learning status"
              disabled={!hydrated}
              onChange={(event) =>
                updateDay(activeDay.dayNumber, {
                  masteryStatus: event.target.value as MasteryStatus,
                })
              }
              value={activeProgress.masteryStatus}
            >
              <option value="not_assessed">Not assessed</option>
              <option value="needs_practice">Needs practice</option>
              <option value="developing">Developing</option>
              <option value="strong_evidence">Strong evidence</option>
              <option value="ready_for_review">Ready for review</option>
            </select>
          </label>
        </div>
      </div>
      <TodayTargets day={activeDay} progress={activeProgress} />
      {activeDay.finalQaNotices.length ? (
        <aside className="qa-notice">
          <strong>Approved final QA correction</strong>
          {activeDay.finalQaNotices.map((notice) => (
            <p key={notice}>{learnerText(notice)}</p>
          ))}
        </aside>
      ) : null}
      <DailyGermanCore day={activeDay} />
      {focusedExerciseId ? (
        <div className="review-focus-card">
          <div>
            <div className="eyebrow">Review focus</div>
            <p>
              Revisit the flagged exercise before returning to the full day.
            </p>
          </div>
          <button
            className="button subtle"
            onClick={() => setFocusedExerciseId(null)}
            type="button"
          >
            Show all day practice
          </button>
        </div>
      ) : null}
      <ExerciseEngine
        exercises={
          focusedExerciseId
            ? dayExercises.filter((exercise) => exercise.id === focusedExerciseId)
            : dayExercises
        }
        onAttempt={recordAttempt}
      />
      <LearningFlow day={activeDay} />
      {lessonFlow
        .filter((flow) => flow.id !== "mastery")
        .map((flow) => (
          <div key={flow.id}>
            <FlowGroup
              day={activeDay}
              id={flow.id}
              kinds={flow.kinds}
              label={flow.label}
            />
            {flow.id === "learn" ? (
              <section className="notebook-guidance">
                <div>
                  <strong>WRITE THIS DOWN</strong>
                  <ul>
                    {activeNotebookNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>DON&apos;T WASTE TIME WRITING THIS</strong>
                  <ul>
                    <li>Temporary explanations and source citations.</li>
                    <li>Repeated examples that do not add a reusable pattern.</li>
                    <li>Exercise instructions you can revisit here.</li>
                  </ul>
                </div>
              </section>
            ) : null}
            {flow.id === "practice" ? (
              <>
                <SentenceBuilder
                  day={activeDay}
                  disabled={!hydrated}
                  onComplete={() =>
                    setProgress((current) =>
                      withPracticeTaskCompletion(
                        withDayProgress(current, activeDay.dayNumber, {
                          sentenceBuilderCompleted: true,
                        }),
                        activeDay.dayNumber,
                        `day-${activeDay.dayNumber}-sentence-builder`,
                      ),
                    )
                  }
                />
                <GuidedPracticeTasks
                  day={activeDay}
                  disabled={!hydrated}
                  isComplete={(taskId) =>
                    isPracticeTaskComplete(progress, activeDay.dayNumber, taskId)
                  }
                  onComplete={(taskId) =>
                    completePracticeTask(activeDay.dayNumber, taskId)
                  }
                />
              </>
            ) : null}
          </div>
        ))}
      <section className="completion-card">
        <h3>Day status</h3>
        <p>
          Lesson and practice are separate. Mastery status never controls
          whether the next day unlocks.
        </p>
        <div className="button-row">
          <button
            className="button primary"
            disabled={!hydrated || activeProgress.lessonCompleted}
            onClick={() => updateDay(activeDay.dayNumber, { lessonCompleted: true })}
            type="button"
          >
            {activeProgress.lessonCompleted
              ? "Lesson completed"
              : "Complete lesson"}
          </button>
          <button
            className="button secondary"
            disabled={!hydrated || activeProgress.practiceCompleted}
            onClick={() => updateDay(activeDay.dayNumber, { practiceCompleted: true })}
            type="button"
          >
            {activeProgress.practiceCompleted
              ? "Practice completed"
              : "Complete practice"}
          </button>
          <button
            className="button subtle"
            disabled={!hydrated}
            onClick={() =>
              updateDay(activeDay.dayNumber, {
                needsReview: !activeProgress.needsReview,
              })
            }
            type="button"
          >
            {activeProgress.needsReview
              ? "Clear Needs Review"
              : "Mark Needs Review"}
          </button>
          {followingDay && isDayUnlocked(progress, followingDay.dayNumber) ? (
            <button
              className="button primary"
              onClick={() => chooseDay(followingDay.dayNumber)}
              type="button"
            >
              Start Day {followingDay.dayNumber}
            </button>
          ) : null}
        </div>
      </section>
      <TutorHandoff curriculum={curriculum} day={activeDay} />
      <FlowGroup
        day={activeDay}
        id="mastery"
        kinds={["mastery_check"]}
        label="Mastery check"
      />
      <details className="qa-overrides">
        <summary>Canonical final QA overrides for this day</summary>
        <MarkdownContent markdown={activeDay.finalQaOverrides} />
      </details>
    </article>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <a className="brand" href="#course">
            DeutschOS
          </a>
          <span className="brand-note">Local A1 learning runtime</span>
        </div>
        {renderTopNav()}
      </header>

      {view === "today" && renderToday()}
      {view === "day" && renderDayRunner()}
      {view === "map" && renderMap()}
      {view === "review" && renderReview()}
      {view === "vocabulary" && <VocabularyView items={vocabularyItems} />}
      {view === "exam" && (
        <ExamView examTrack={examTrack} setExamTrack={setExamTrack} />
      )}
      {view === "settings" && (
        <SettingsView
          speechRate={speechRate}
          setSpeechRate={setSpeechRate}
          examTrack={examTrack}
          setExamTrack={setExamTrack}
          onResetProgress={handleResetProgress}
        />
      )}
    </main>
  );
}

function VocabularyView({ items }: { items: CoreVocabularyItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = items.filter(
    (item) =>
      item.german.toLowerCase().includes(query.toLowerCase()) ||
      item.meaningAndType.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="vocabulary-view">
      <div className="eyebrow">Vocabulary</div>
      <h2>Canonical Daily German Core vocabulary</h2>
      <p className="muted">
        This list is sourced only from the Daily German Core items. It is not a
        complete A1 vocabulary database.
      </p>
      <input
        type="search"
        placeholder="Search German or meaning..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="vocab-list">
        {filtered.map((item, idx) => (
          <div className="vocab-item" key={`${item.dayNumber}-${idx}`}>
            <strong>{item.german}</strong>
            <p>{item.meaningAndType}</p>
            <small>
              Day {item.dayNumber} · Week {item.weekNumber}
              {item.register ? ` · ${item.register}` : ""}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExamView({
  examTrack,
  setExamTrack,
}: {
  examTrack: ExamTrackId;
  setExamTrack: (track: ExamTrackId) => void;
}) {
  const activeMetadata = EXAM_TRACK_METADATA[examTrack];

  return (
    <section className="exam-view">
      <div className="eyebrow">Exam track</div>
      <h2>Choose an exam overlay</h2>
      <p>Days 1–35 use the same German. Track-specific formats are an overlay only.</p>

      <div className="exam-tracks">
        {EXAM_TRACK_IDS.map((track) => (
          <button
            key={track}
            className={examTrack === track ? "active" : ""}
            onClick={() => setExamTrack(track)}
          >
            {EXAM_TRACK_METADATA[track].displayName}
          </button>
        ))}
      </div>

      <div className="exam-track-details">
        <h3>{activeMetadata.displayName}</h3>
        <p>{activeMetadata.verifiedFormatTiming}</p>
        <p>
          Day 42 official resource:{" "}
          <a
            href={activeMetadata.officialDay42ResourceReference}
            target="_blank"
            rel="noreferrer"
          >
            {activeMetadata.officialDay42ResourceLabel}
          </a>
        </p>
      </div>
    </section>
  );
}

function SettingsView({
  speechRate,
  setSpeechRate,
  examTrack,
  setExamTrack,
  onResetProgress,
}: {
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  examTrack: ExamTrackId;
  setExamTrack: (track: ExamTrackId) => void;
  onResetProgress: () => void;
}) {
  return (
    <section className="settings-view">
      <div className="eyebrow">Settings</div>
      <h2>Local controls</h2>
      <label>
        Speaking rate
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speechRate}
          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
        />
        <span>{speechRate.toFixed(1)}x</span>
      </label>
      <label>
        Exam track
        <select
          value={examTrack}
          onChange={(e) =>
            setExamTrack(
              normalizeExamTrackId(e.target.value) ?? DEFAULT_EXAM_TRACK_ID,
            )
          }
        >
          {EXAM_TRACK_IDS.map((track) => (
            <option key={track} value={track}>
              {EXAM_TRACK_METADATA[track].displayName}
            </option>
          ))}
        </select>
      </label>
      <div className="danger-zone">
        <button className="button subtle" onClick={onResetProgress}>
          Reset local progress
        </button>
      </div>
    </section>
  );
}
