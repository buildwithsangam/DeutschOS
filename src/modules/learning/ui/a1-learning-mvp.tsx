"use client";

import { useEffect, useMemo, useState } from "react";

import { createGeminiHandoffPrompt, type GeminiTutorMode } from "@/modules/ai/application/create-gemini-handoff";
import { type A1Curriculum, type A1Day, type A1LessonSection, type A1SectionKind } from "@/modules/curriculum/domain/a1-days-1-14";
import { germanAlphabetFoundation, highValueSpellingPatterns } from "@/modules/curriculum/domain/german-pronunciation-foundation";
import { learnerText, notebookGuidance } from "@/modules/curriculum/domain/learner-content";
import { dailyCoreItems, lessonFlow, sectionsForFlow, sentenceBuilderStages, todayTargets } from "@/modules/curriculum/domain/learning-presentation";
import {
  createLocalProgress,
  dayProgress,
  isDayUnlocked,
  localProgressStorageKey,
  readLocalProgress,
  type LocalLearningProgress,
  type MasteryStatus,
  isPracticeTaskComplete,
  withDayProgress,
  withPracticeTaskCompletion,
} from "@/modules/learning/domain/local-progress";
import { practiceTasksForDay } from "@/modules/learning/domain/practice-tasks";

type View = "course" | "review";

const tutorModes: GeminiTutorMode[] = ["Guide Me", "Pronunciation Practice", "Sentence Builder", "Role-Play", "Review & Error Repair"];

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
  other: "Other",
};

function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n").map(learnerText).filter(Boolean);
  return (
    <div className="source-content">
      {lines.map((line, index) =>
        /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) ? (
          <p className="source-bullet" key={`${line}-${index}`}>{line.replace(/^[-*]\s+/, "")}</p>
        ) : (
          <p key={`${line}-${index}`}>{line}</p>
        ),
      )}
    </div>
  );
}

function normaliseSentence(value: string) {
  return value.trim().replace(/\s+([.,?!:;])/g, "$1").replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

function SentenceBuilder({ day, disabled, onComplete }: { day: A1Day; disabled: boolean; onComplete: () => void }) {
  const [available, setAvailable] = useState(() => [...day.sentenceBuilder.tokens].reverse());
  const [selected, setSelected] = useState<string[]>([]);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [result, setResult] = useState<"idle" | "hint" | "strong_hint" | "answer_revealed" | "complete">("idle");

  const builtSentence = selected.join(" ").replace(/\s+([.,?!:;])/g, "$1");
  const stages = sentenceBuilderStages(day);
  const reset = () => {
    setAvailable([...day.sentenceBuilder.tokens].reverse());
    setSelected([]);
    if (result !== "answer_revealed") setResult(incorrectAttempts === 1 ? "strong_hint" : "idle");
  };
  const beginOrEditAttempt = () => {
    if (result === "answer_revealed" || result === "complete") return;
    setResult(incorrectAttempts === 1 ? "strong_hint" : "idle");
  };
  const check = () => {
    if (normaliseSentence(builtSentence) === normaliseSentence(day.sentenceBuilder.answer)) {
      setResult("complete");
      onComplete();
    } else {
      const nextIncorrectAttempts = incorrectAttempts + 1;
      setIncorrectAttempts(nextIncorrectAttempts);
      if (nextIncorrectAttempts >= 2) {
        setResult("answer_revealed");
        setAvailable([...day.sentenceBuilder.tokens].reverse());
        setSelected([]);
      } else {
        setResult("hint");
      }
    }
  };

  const firstToken = day.sentenceBuilder.tokens[0];
  const finalToken = day.sentenceBuilder.tokens.at(-1);

  return (
    <section className="practice-card" aria-labelledby="sentence-builder-heading">
      <div className="eyebrow">Interactive practice</div>
      <h3 id="sentence-builder-heading">Sentence Builder</h3>
      <p>Build the canonical answer using the source exercise below. Punctuation is a selectable token.</p>
      <div className="construction-ladder" aria-label="Sentence-building stages present in this canonical task">
        {stages.map((stage) => <span key={stage}>{stage}</span>)}
      </div>
      <MarkdownContent markdown={day.sentenceBuilder.prompt} />
      <div className="token-row" aria-label="Available sentence tokens">
        {available.map((token, index) => (
          <button
            className="token"
            disabled={disabled}
            key={`${token}-${index}`}
            onClick={() => {
              setSelected([...selected, token]);
              setAvailable(available.filter((_, itemIndex) => itemIndex !== index));
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
              setSelected(selected.filter((_, itemIndex) => itemIndex !== index));
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
        <button className="button primary" disabled={disabled || selected.length === 0 || result === "complete"} onClick={check} type="button">{result === "answer_revealed" ? "Check reconstruction" : "Check sentence"}</button>
        <button className="button secondary" disabled={disabled} onClick={reset} type="button">Retry</button>
      </div>
      {result === "hint" ? <p className="feedback warning"><strong>Structural hint:</strong> Start with <strong>{firstToken}</strong>. Keep the words in a natural sentence order; the source task gives the vocabulary.</p> : null}
      {result === "strong_hint" ? <p className="feedback warning"><strong>Stronger hint:</strong> This answer has {day.sentenceBuilder.tokens.length} selectable parts and finishes with <strong>{finalToken}</strong>. Try the structure again without copying a full answer.</p> : null}
      {result === "answer_revealed" ? <div className="answer-reveal"><strong>Canonical answer:</strong> <span>{day.sentenceBuilder.answer}</span><p>Now build that exact sentence once yourself. It will only count after your reconstruction is correct.</p></div> : null}
      {result === "complete" ? <p className="feedback success">Correct. Practice for this day is recorded as complete.</p> : null}
    </section>
  );
}

function TutorHandoff({ curriculum, day }: { curriculum: A1Curriculum; day: A1Day }) {
  const [mode, setMode] = useState<GeminiTutorMode>("Guide Me");
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => createGeminiHandoffPrompt({ mode, day, curriculum }), [curriculum, day, mode]);

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
          <button className={option === mode ? "tab active" : "tab"} key={option} onClick={() => { setMode(option); setCopied(false); }} type="button">{option}</button>
        ))}
      </div>
      <textarea aria-label="Copyable tutor prompt" className="tutor-prompt" readOnly value={prompt} />
      <div className="button-row">
        <button className="button primary" onClick={copy} type="button">Copy prompt</button>
        {copied ? <span className="feedback success">Copied.</span> : <span className="muted">No automatic AI connection is used.</span>}
      </div>
    </section>
  );
}

function LessonSection({ section }: { section: A1LessonSection }) {
  return (
    <section className={`lesson-section ${section.kind === "daily_german_core" ? "daily-core" : ""}`} id={`section-${section.kind}`}>
      <div className="section-kicker">{sectionLabels[section.kind]}</div>
      <h3>{sectionLabels[section.kind]}</h3>
      {section.kind === "pronunciation" ? <p className="audio-note">Audio not available yet. Use the approved learner-facing text guidance below; no audio is being simulated.</p> : null}
      <MarkdownContent markdown={section.markdown} />
    </section>
  );
}

function TodayTargets({ day, progress }: { day: A1Day; progress: ReturnType<typeof dayProgress> }) {
  const remaining = [
    !progress.lessonCompleted ? "Finish Learn" : null,
    !progress.sentenceBuilderCompleted ? "Complete Sentence Builder" : null,
    !progress.practiceCompleted ? "Confirm today’s practice" : null,
  ].filter(Boolean);
  return (
    <section className="today-targets" aria-labelledby="today-targets-heading">
      <div className="section-kicker">Today&apos;s targets</div>
      <h2 id="today-targets-heading">A focused study plan from the approved Day {day.dayNumber} content</h2>
      <div className="target-grid">
        {todayTargets(day).map((target) => (
          <article className="target-card" key={target.label}>
            <span>{target.label}</span>
            <p>{target.value}</p>
          </article>
        ))}
      </div>
      <div className="today-status"><strong>Today&apos;s state</strong><span>{progress.lessonCompleted ? "Learn complete" : "Learn remains"}</span><span>{progress.sentenceBuilderCompleted ? "Sentence Builder complete" : "Sentence Builder remains"}</span><span>{progress.practiceCompleted ? "Practice complete" : "Practice remains"}</span></div>
      <p className="remaining"><strong>Next:</strong> {remaining.length ? remaining.join(" · ") : "Everything required for this day is complete. Review or begin the next available day."}</p>
    </section>
  );
}

function DailyGermanCore({ day }: { day: A1Day }) {
  const items = dailyCoreItems(day);
  if (!items.length) return null;
  return (
    <section className="core-panel" id="daily-core" aria-labelledby="daily-core-heading">
      <div><div className="section-kicker">Separate reinforcement layer</div><h2 id="daily-core-heading">Daily German Core</h2><p>Lightweight current-day language for real contact. It is separate from the main lesson, not a second course.</p></div>
      <div className="core-items">
        {items.map((item) => (
          <article className="core-item" key={item.german}>
            <strong>{item.german}</strong>
            <p>{item.meaningAndType}</p>
            <div className="core-meta"><span>Introduced today</span>{item.register ? <span>{item.register} register</span> : null}<span>Audio unavailable</span></div>
          </article>
        ))}
      </div>
      <p className="core-context">Practical context and approved examples appear in today&apos;s Real-life mission. The canonical day does not separately label every Core item active or receptive.</p>
    </section>
  );
}

function PronunciationFoundation({ day }: { day: A1Day }) {
  if (day.dayNumber < 5) return null;
  return (
    <details className="pronunciation-foundation" id="alphabet-foundation">
      <summary><span>Pronunciation Foundation</span><small>German alphabet and high-value spelling patterns · introduced in Day 5</small></summary>
      <p className="audio-note">Audio not available yet. These are learner-facing spelling references, not simulated recordings.</p>
      <div className="alphabet-grid">
        {germanAlphabetFoundation.map((entry) => <article key={entry.letter}><strong>{entry.letter}</strong><span>{entry.germanName}</span><p>{entry.learnerNote}</p>{entry.example ? <small>Example: {entry.example}</small> : null}</article>)}
      </div>
      <div className="pattern-grid">
        {highValueSpellingPatterns.map(([pattern, note]) => <article key={pattern}><strong>{pattern}</strong><p>{note}</p></article>)}
      </div>
      <p className="pronunciation-path">Use the progression already established in the curriculum: letter/sound → syllable → word → phrase → sentence → short connected speech.</p>
    </details>
  );
}

function LearningFlow({ day }: { day: A1Day }) {
  return (
    <nav className="learning-flow" aria-label="Today’s learning flow">
      <span>Today&apos;s flow</span>
      <a href="#today-targets">Targets</a><a href="#learn">Learn</a><a href="#pronunciation">Pronunciation</a><a href="#listen">Listen</a><a href="#practice">Practice</a><a href="#sentence-builder-heading">Build</a><a href="#speak">Speak</a><a href="#mission">Mission</a><a href="#review">Review</a><a href="#tutor">Tutor</a><a href="#mastery">Mastery</a>
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
      <div className="flow-heading"><span>{label}</span><div /></div>
      {id === "learn" ? <p className="flow-intro">Vocabulary and reusable patterns are kept in the approved Main lesson rather than duplicated into a second word list.</p> : null}
      {sections.map((section) => <LessonSection key={section.kind} section={section} />)}
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
  const tasks = practiceTasksForDay(day).filter((task) => task.kind !== "sentence_builder");
  if (!tasks.length) return null;
  return (
    <section className="guided-practice">
      <div className="eyebrow">Guided practice</div>
      <h3>Retrieval and practical use</h3>
      <p>These canonical prompts ask for active recall or a practical response. Mark completion only after you have done the task; no unsupported automatic score is claimed.</p>
      {tasks.map((task) => (
        <article className="guided-task" key={task.id}>
          <span className="task-type">{task.kind === "retrieval" ? "Quick recall" : "Practical response"}</span><strong>{task.title}</strong>
          <MarkdownContent markdown={task.instruction} />
          <button className="button secondary" disabled={disabled || isComplete(task.id)} onClick={() => onComplete(task.id)} type="button">
            {isComplete(task.id) ? task.completionLabel : `Mark: ${task.completionLabel}`}
          </button>
        </article>
      ))}
    </section>
  );
}

export function A1LearningMvp({ curriculum }: { curriculum: A1Curriculum }) {
  const [progress, setProgress] = useState<LocalLearningProgress>(createLocalProgress);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("course");

  useEffect(() => {
    const savedProgress = readLocalProgress(window.localStorage.getItem(localProgressStorageKey));
    const timer = window.setTimeout(() => {
      setProgress(savedProgress);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(localProgressStorageKey, JSON.stringify(progress));
  }, [hydrated, progress]);

  const activeDay = curriculum.days.find((day) => day.dayNumber === progress.currentDay) ?? curriculum.days[0];
  const activeProgress = dayProgress(progress, activeDay.dayNumber);
  const activeNotebookNotes = notebookGuidance(activeDay);
  const nextLearningDay = curriculum.days.find((day) => {
    const item = dayProgress(progress, day.dayNumber);
    return isDayUnlocked(progress, day.dayNumber) && !(item.lessonCompleted && item.practiceCompleted);
  }) ?? activeDay;
  const followingDay = curriculum.days.find((day) => day.dayNumber === activeDay.dayNumber + 1);
  const courseWeeks = [...new Set(curriculum.days.map((day) => day.weekNumber))];
  const completedDays = curriculum.days.filter((day) => {
    const item = dayProgress(progress, day.dayNumber);
    return item.lessonCompleted && item.practiceCompleted;
  }).length;
  const reviewDays = curriculum.days.filter((day) => dayProgress(progress, day.dayNumber).needsReview);

  const updateDay = (dayNumber: number, update: Parameters<typeof withDayProgress>[2]) => setProgress((current) => withDayProgress(current, dayNumber, update));
  const completePracticeTask = (dayNumber: number, taskId: string) => setProgress((current) => withPracticeTaskCompletion(current, dayNumber, taskId));
  const chooseDay = (dayNumber: number) => {
    if (!isDayUnlocked(progress, dayNumber)) return;
    setProgress((current) => ({ ...current, currentDay: dayNumber }));
    setView("course");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><a className="brand" href="#course">DeutschOS</a><span className="brand-note">Local A1 learning MVP</span></div>
        <nav aria-label="Primary navigation">
          <button className={view === "course" ? "nav-button active" : "nav-button"} onClick={() => setView("course")} type="button">Course</button>
          <button className={view === "review" ? "nav-button active" : "nav-button"} onClick={() => setView("review")} type="button">Review {reviewDays.length ? `(${reviewDays.length})` : ""}</button>
        </nav>
      </header>

      <section className="dashboard" id="course">
        <div>
          <div className="eyebrow">Your current lesson</div>
          <h1>Day {nextLearningDay.dayNumber}: {nextLearningDay.title}</h1>
          <p>{learnerText(nextLearningDay.objective)}</p>
          <div className="button-row">
            <button className="button primary" disabled={!hydrated} onClick={() => chooseDay(nextLearningDay.dayNumber)} type="button">Continue learning</button>
            <span className="status-chip">{completedDays}/{curriculum.days.length} complete</span>
          </div>
        </div>
        <aside className="dashboard-aside">
          <strong>{reviewDays.length ? `${reviewDays.length} item${reviewDays.length === 1 ? "" : "s"} needs review` : "No items marked for review"}</strong>
          <p>Review is learner-controlled in this local milestone. No SRS claim is made.</p>
          <a className="bridge-link" href="/pre-a1">New to German? Try the optional Pre-A1 foundation</a>
        </aside>
      </section>

      <section className="week-navigation" aria-label="A1 course days">
        {courseWeeks.map((weekNumber) => (
          <div className="week" key={weekNumber}>
            <div className="eyebrow">Week {weekNumber}</div>
            <div className="day-buttons">
              {curriculum.days.filter((day) => day.weekNumber === weekNumber).map((day) => {
                const unlocked = isDayUnlocked(progress, day.dayNumber);
                const item = dayProgress(progress, day.dayNumber);
                return (
                  <button
                    aria-current={activeDay.dayNumber === day.dayNumber ? "page" : undefined}
                    className={`day-button ${activeDay.dayNumber === day.dayNumber ? "current" : ""} ${item.lessonCompleted && item.practiceCompleted ? "complete" : ""}`}
                    disabled={!hydrated || !unlocked}
                    key={day.dayNumber}
                    onClick={() => chooseDay(day.dayNumber)}
                    type="button"
                  >
                    <span>Day {day.dayNumber}</span><small>{unlocked ? (item.lessonCompleted && item.practiceCompleted ? "Complete" : "Available") : "Locked"}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="muted">Only Days {curriculum.learningScope.firstDay}–{curriculum.learningScope.lastDay} are available in this learning milestone. Day {curriculum.learningScope.lastDay + 1} and later are not exposed.</p>
      </section>

      {view === "review" ? (
        <section className="review-panel">
          <div className="eyebrow">Needs review</div>
          <h2>Return to a marked learning day</h2>
          {reviewDays.length ? reviewDays.map((day) => (
            <article className="review-item" key={day.dayNumber}>
              <div><strong>Day {day.dayNumber}</strong><span>{day.title}</span></div>
              <div className="button-row"><button className="button secondary" onClick={() => chooseDay(day.dayNumber)} type="button">Open day</button><button className="button subtle" onClick={() => updateDay(day.dayNumber, { needsReview: false })} type="button">Clear review</button></div>
            </article>
          )) : <p>Nothing is marked Needs Review. Mark any day from its lesson page when you want to revisit it.</p>}
        </section>
      ) : (
        <article className="lesson" key={activeDay.dayNumber}>
          <div className="lesson-heading">
            <div><div className="eyebrow">Week {activeDay.weekNumber} · Day {activeDay.dayNumber}</div><h2>{activeDay.title}</h2></div>
            <div className="lesson-state"><label>Internal learning status<select aria-label="Internal learning status" disabled={!hydrated} onChange={(event) => updateDay(activeDay.dayNumber, { masteryStatus: event.target.value as MasteryStatus })} value={activeProgress.masteryStatus}><option value="not_assessed">Not assessed</option><option value="needs_practice">Needs practice</option><option value="developing">Developing</option><option value="strong_evidence">Strong evidence</option><option value="ready_for_review">Ready for review</option></select></label></div>
          </div>
          <TodayTargets day={activeDay} progress={activeProgress} />
          {activeDay.finalQaNotices.length ? <aside className="qa-notice"><strong>Approved final QA correction</strong>{activeDay.finalQaNotices.map((notice) => <p key={notice}>{learnerText(notice)}</p>)}</aside> : null}
          <DailyGermanCore day={activeDay} />
          <LearningFlow day={activeDay} />
          {lessonFlow.filter((flow) => flow.id !== "mastery").map((flow) => (
            <div key={flow.id}>
              <FlowGroup day={activeDay} id={flow.id} kinds={flow.kinds} label={flow.label} />
              {flow.id === "learn" ? <section className="notebook-guidance"><div><strong>WRITE THIS DOWN</strong><ul>{activeNotebookNotes.map((note) => <li key={note}>{note}</li>)}</ul></div><div><strong>DON&apos;T WASTE TIME WRITING THIS</strong><ul><li>Temporary explanations and source citations.</li><li>Repeated examples that do not add a reusable pattern.</li><li>Exercise instructions you can revisit here.</li></ul></div></section> : null}
              {flow.id === "practice" ? <><SentenceBuilder day={activeDay} disabled={!hydrated} key={activeDay.dayNumber} onComplete={() => setProgress((current) => withPracticeTaskCompletion(withDayProgress(current, activeDay.dayNumber, { sentenceBuilderCompleted: true, practiceCompleted: true }), activeDay.dayNumber, `day-${activeDay.dayNumber}-sentence-builder`))} /><GuidedPracticeTasks day={activeDay} disabled={!hydrated} isComplete={(taskId) => isPracticeTaskComplete(progress, activeDay.dayNumber, taskId)} onComplete={(taskId) => completePracticeTask(activeDay.dayNumber, taskId)} /></> : null}
            </div>
          ))}
          <section className="completion-card">
            <h3>Day status</h3>
            <p>Lesson and practice are separate. Mastery status never controls whether the next day unlocks.</p>
            <div className="button-row"><button className="button primary" disabled={!hydrated || activeProgress.lessonCompleted} onClick={() => updateDay(activeDay.dayNumber, { lessonCompleted: true })} type="button">{activeProgress.lessonCompleted ? "Lesson completed" : "Complete lesson"}</button><button className="button secondary" disabled={!hydrated || activeProgress.practiceCompleted} onClick={() => updateDay(activeDay.dayNumber, { practiceCompleted: true })} type="button">{activeProgress.practiceCompleted ? "Practice completed" : "Complete practice"}</button><button className="button subtle" disabled={!hydrated} onClick={() => updateDay(activeDay.dayNumber, { needsReview: !activeProgress.needsReview })} type="button">{activeProgress.needsReview ? "Clear Needs Review" : "Mark Needs Review"}</button>{followingDay && isDayUnlocked(progress, followingDay.dayNumber) ? <button className="button primary" onClick={() => chooseDay(followingDay.dayNumber)} type="button">Start Day {followingDay.dayNumber}</button> : null}</div>
          </section>
          <TutorHandoff curriculum={curriculum} day={activeDay} />
          <FlowGroup day={activeDay} id="mastery" kinds={["mastery_check"]} label="Mastery check" />
          <details className="qa-overrides"><summary>Canonical final QA overrides for this day</summary><MarkdownContent markdown={activeDay.finalQaOverrides} /></details>
        </article>
      )}
    </main>
  );
}
