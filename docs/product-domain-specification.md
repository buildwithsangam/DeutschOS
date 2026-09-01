# DeutschOS product-domain specification: A0 → early-A1 first vertical slice

**Status:** Implementation-ready product specification. It defines the smallest useful vertical learning loop; it does not create application code, content assets, or database schema.

## 1. Scope and authority

This document specifies the personal-use, adult-learner MVP vertical slice. It is governed by:

1. [Technical specification](technical-specification.md) for architecture, privacy/security boundaries, and implementation constraints.
2. [A0 → early-A1 15-day curriculum](curriculum/a0-a1-15-day-curriculum.md) for the canonical sequence, topics, and learning principles.
3. [Architecture proposal](architecture-decision.md) for the original rationale where the technical specification does not supersede it.

The 15-day curriculum is canonical. This document does not replace its order, add days, or make later A1/A2–B2 material required. “Goethe-aligned” information, where introduced later, is editorial/contextual only; all readiness and progress indicators in this slice are DeutschOS internal indicators, never official scores or certification.

### Status legend

- **MUST** — required for the first usable vertical slice.
- **SHOULD LATER** — compatible extension, not needed to prove the loop.
- **DEFERRED** — explicitly outside this slice.
- **FROZEN / APPROVED** — product decision approved in Step 5; implementation must follow it unless a later documented decision explicitly supersedes it.

## 2. Product outcome and learner journey

### 2.1 Product outcome

The first slice proves that one adult learner can progress through the canonical A0 → early-A1 curriculum while DeutschOS preserves trustworthy evidence, schedules retrieval, captures recurring errors, gives bounded feedback, and shows explainable progress.

The product must never reduce learning to a completion checklist. A lesson is a curriculum container; progress is based on evidence and review, not merely opening a page.

### 2.2 First learner journey

1. **Open DeutschOS.** The authenticated learner arrives at Today. If no curriculum is active, the canonical 15-day release is selected as the learner's active program and Day 1 is marked `NOW`.
2. **See a daily plan.** The plan first shows due retrieval/remediation, then the current `NOW` curriculum day, then the day's real-world implementation task. It explains why every item appears.
3. **Complete the lesson.** The learner receives the canonical day's context-first content, concise explanation, vocabulary, grammar where applicable, and linked practice. German is the primary presentation language; contextual help/translation is available when it helps learning.
4. **Practice in multiple modes.** The learner completes required receptive and productive activities appropriate to that day—listening/reading, speaking/writing where specified and feasible.
5. **Record evidence.** Every submitted or explicitly completed activity creates immutable attempt/evidence records tied to the curriculum and content/rubric versions used.
6. **Receive bounded feedback.** Deterministic scoring is shown when an answer key/rubric permits it. Otherwise feedback is formative and clearly labelled; AI feedback is optional assistance, not authority.
7. **Capture errors and schedule review.** Incorrect/struggled evidence creates or reinforces normalized error memories, selects a concise remediation task, and updates a versioned review schedule.
8. **Do a real-world transfer task.** The learner applies that day's language to objects, routine, a short interaction, or a diary task where the canonical day calls for it.
9. **Review progress.** Today shows what was introduced, what has evidence, what is due next, recurring error areas, and four-skill evidence. It never claims an official Goethe result.
10. **Resume deliberately.** The next local-day plan is recalculated from due review/remediation and the first incomplete `NOW` curriculum day. A learner may postpone or revisit a day; the system does not silently treat it as mastered.

## 3. Canonical content inventory

### 3.1 Inventory rule

The following table indexes the canonical curriculum; it does not expand or replace it. Each listed day becomes one versioned `CurriculumDay` containing authored nodes, content items, exercises, and source/provenance records. Exact vocabulary lists, audio scripts, reading passages, prompts, rubrics, and answer keys are authored implementation content and must remain within the listed scope.

| Day | Canonical focus | Required evidence modes in this slice |
| --- | --- | --- |
| 1 | German sound system/alphabet; greetings and introductions; name, origin, residence; ä/ö/ü/ch/r, vowel length and stress; classroom/communication repair | pronunciation/speaking and listening practice; introductory vocabulary evidence |
| 2 | personal pronouns; `sein`; `haben`; present-tense foundations; statements; yes/no and W-questions; self-introduction | controlled grammar exercise, self-introduction speaking or writing, short personal writing |
| 3 | `der/die/das`; introductory `ein/eine/einen`; gender; singular/plural; noun + article; immediate environment | vocabulary recognition/recall, object naming, controlled sentences |
| 4 | V2 main-clause order; sentence patterns; `nicht`; `kein`; questions; familiar objects/actions | controlled word-order/negation practice, short dialogue, direct-German-processing activity |
| 5 | numbers, age, clock time, weekdays, dates, time expressions, daily schedule | numerical-information listening, controlled production/retrieval |
| 6 | high-frequency regular and selected irregular verbs; routine vocabulary; conjugation in context; real routine | speaking/writing about routine and the first structured diary entry |
| 7 | family, occupations, basic description, functional introductory possessives | personal-information listening and short descriptive writing |
| 8 | rooms, furniture, household objects; `haben`; location expressions; in/on/at-type patterns | home/room description and controlled location practice |
| 9 | direct objects; `der → den`; `ein → einen`; `haben/kaufen/sehen/brauchen` | controlled production and retrieval in object/shopping sentences |
| 10 | food/drink; restaurant language; prices/quantities; `möchten`; `brauchen`; ordering | roleplay or controlled request production; menu/price-list reading |
| 11 | town places; left/right/straight; public transport; directions; `wo/wohin` | map-based listening and speaking |
| 12 | work/course/classroom and basic workplace vocabulary; appointment language; when/where; scheduling | practical phone/appointment expression practice |
| 13 | requests, clarification, repair, help, service interactions; integrate earlier contexts | unscripted-but-bounded practical interaction/speaking |
| 14 | integrate personal information, family, home, routine, shopping, city, work/school, appointments | mixed listening, reading, connected speaking, diary writing, retrieval review, targeted error correction |
| 15 | A0 → early-A1 diagnostic: pronunciation, listening, speaking, reading, writing, vocabulary, grammar, direct processing, communication repair | diagnostic evidence with each area classified Strong, Developing, Weak, or Critical |

The diagnostic grammar scope is exactly: pronouns; `sein/haben`; present tense; V2; questions; negation; articles/gender; plural; basic possessives; basic accusative; and core prepositions/location patterns. No advanced B1/B2 grammar is required mastery in this release.

### 3.2 Per-day content pattern

Each day MUST contain only the following product components as applicable to its canonical focus:

- a context-first lesson introduction;
- concise explanation/reference cards for that day's grammar or communication pattern;
- high-frequency vocabulary items, with nouns stored/displayed with article and plural where relevant;
- linked receptive and/or productive exercises;
- one daily real-world implementation prompt; and
- a retrieval/remediation link to prior items when due.

Day 6 introduces the first structured diary entry; Days 1–5 must not pretend to require structured diary writing. Day 14 includes diary writing and integrated correction. Day 15 creates diagnostic evidence and an internal summary, not a graduation or official examination result.

## 4. Roles and product boundaries

| Role | First slice responsibility | Status |
| --- | --- | --- |
| Adult learner | Owns and accesses all learner-generated content, evidence, preferences, and consent decisions. Completes the daily loop. | MUST |
| Platform administrator | Limited operational/content administration under audited access; not a normal learner-data viewer. | MUST as a boundary; administration UI may be minimal |
| Content editor/reviewer | Authors/publishes canonical curriculum content and provenance records. This can initially be the product owner, but the role is distinct from an AI. | MUST as a content-governance responsibility |
| Instructor | Shares only explicitly assigned learner/class data. | DEFERRED |
| Institution administrator | Manages organization/roster settings, never default access to private learner content. | DEFERRED |

The implementation uses stable learner IDs even though the MVP serves one person. No product behavior assumes a global singleton learner.

## 5. Core domain objects and responsibilities

| Object | Responsibility | Data class |
| --- | --- | --- |
| `CurriculumRelease` | Identifies the published canonical 15-day sequence, release/version, scope, and publication status. | Canonical curriculum |
| `CurriculumDay` | Represents one ordered canonical day and its included nodes/content links. | Canonical curriculum |
| `CurriculumNode` | Stable learning objective: language/communication target, CEFR context, prerequisite links, source/provenance, version. | Canonical curriculum |
| `VocabularyItem` | Lemma/sense, part of speech, and for nouns article/plural; links to nodes and content. | Canonical curriculum |
| `GrammarConcept` | Named grammar target and its scope/level; links to explanatory and exercise content. | Canonical curriculum |
| `LessonContent` | Versioned, published authored material such as explanation, script, reading, audio reference, prompt, or image/context. | Canonical or sourced/reference material |
| `Exercise` and `Rubric` | Versioned practice definition, accepted response form, skill/node targets, deterministic answer key/rubric where applicable. | Canonical curriculum |
| `LearnerProgram` | Learner's selected release, current day context, timezone, and explicit priority states. | Learner state |
| `DailyPlan` / `PlanItem` | Immutable daily selection snapshot plus reasons: due review, remediation, canonical lesson, or transfer task. | Learner state/history |
| `Attempt` | Raw learner submission/completion, time, input modality, content/rubric version, and result status. | Assessment evidence / private learner data |
| `EvidenceRecord` | Normalized learning evidence derived from an attempt: objective, skill, outcome, confidence/quality where supported, and origin. | Assessment evidence |
| `MasteryProjection` | Current explainable stage per learner/node; derived from evidence and review. | Derived learner state |
| `ReviewItem` | Recall target, due time, scheduling algorithm/version, current review status, and evidence links. | Learner state/history |
| `ErrorMemory` | Normalized recurring error pattern, affected node/skill, occurrence evidence, severity/trend, and remediation status. | Private learner data / evidence |
| `RemediationTask` | Narrow re-teach/retrieval/re-test action associated with an error memory. | Learner state |
| `SkillSnapshot` | Derived listening/speaking/reading/writing evidence summary with uncertainty. | Derived learner state |
| `ProgressSummary` | Current day completion, evidence coverage, reviews due, mastery distribution, and diagnostic indicator. | Derived learner state |
| `AiInteraction` | Minimal metadata, template/schema version, input references, outcome, and retained user-visible artifact if permitted. | Restricted operational/private data |
| `MediaAsset` | Private recording or generated audio metadata, owner, consent, retention, transcript/derivative links. | Highly restricted private data |
| `ConsentRecord` | Versioned agreement/withdrawal for optional AI, audio, journal-feedback, and retention processing. | Restricted private data |

## 6. Daily-plan and lesson behavior

### 6.1 Daily plan

**MUST**

- Calculate the learner's plan on demand for their local day, using stored IANA timezone and UTC evidence/review times.
- Show items in this intent order: overdue/urgent remediation, due reviews, the first incomplete `NOW` curriculum day, and that day's real-world transfer task. If a lesson is intentionally postponed, explain the result rather than silently advancing it.
- State why each item is shown: `due review`, `recurring error`, `current curriculum day`, or `real-world transfer`.
- Preserve a snapshot of completed/selected plan items so later progress is explainable. Recalculating a plan does not overwrite completed evidence.
- Allow the learner to start a lesson, continue an incomplete lesson, complete a plan item, or explicitly postpone an eligible item. Postponement is learner preference/history, not mastery.

**SHOULD LATER**

- Let the learner set time availability and receive a plan that is appropriately sized.
- Offer a deliberate catch-up/rebalancing action when several days are incomplete.

**DEFERRED**

- Push/email reminders, calendar synchronization, background schedule generation, and AI-autonomous planning.

### 6.2 Lesson behavior

**MUST**

- Present only published content associated with the selected canonical day and its eligible prior review/remediation items.
- Lead with context/use, then concise explanation. Translation/help is available when useful but is never the mandatory primary route.
- Link every exercise to its target node(s), skill(s), content/rubric version, and expected response mode.
- Make the distinction visible between `Learn today`, `Review due`, and `Fix a recurring error`.
- Record lesson engagement separately from evidence; opening content alone does not raise mastery.

**SHOULD LATER**

- Include richer contextual media and alternative explanations selected by learner preference.

**DEFERRED**

- Open-ended, automatically published lesson generation and content selection beyond the canonical release.

## 7. Vocabulary, grammar, and four-skill behavior

### 7.1 Vocabulary

**MUST**

- Prioritize high-frequency/high-utility vocabulary that belongs to the selected canonical day.
- Store and display noun vocabulary with article and plural where relevant; do not treat a bare noun as the complete canonical item.
- Separate recognition evidence from recall/production evidence. A correct multiple-choice response cannot by itself establish independent use.
- Create review targets for vocabulary/senses that have been introduced and have retrievable evidence.

**SHOULD LATER:** semantic families, confusable-word detection, example-sentence variations, and import/export of personal vocabulary.

**DEFERRED:** uncontrolled dictionary scraping, broad word lists outside the 15-day release, and automatic mastery based only on AI chat.

### 7.2 Grammar

**MUST**

- Treat grammar concepts as explicit, versioned curriculum nodes, not as hidden tags inside a lesson page.
- Give context first, then concise rule/reference, then controlled practice before independent production is expected.
- Keep grammar scope bounded to the 15-day curriculum and Day 15 diagnostic list.
- Link relevant errors to a grammar concept and a remediation/re-test path.

**SHOULD LATER:** contrastive explanations tailored to verified learner error patterns.

**DEFERRED:** advanced B1/B2 grammar requirements or AI-created grammar rules becoming canonical content.

### 7.3 Four-skill tracking

Every evidence record declares zero or more skill dimensions; an exercise can support more than one skill, but its primary assessment claim must be explicit.

| Skill | First-slice behavior | Evidence boundary |
| --- | --- | --- |
| Listening | Original/rights-cleared listening content from the canonical day's specified context; learner answers comprehension/selection/production prompt. | Correct response supports comprehension of that item, not global listening proficiency. |
| Reading | Short, authored or rights-cleared texts such as self-introduction, menu/price list, schedule, map instruction, or appointment content only where the day calls for it. | Response is tied to text/content version. |
| Speaking | Controlled spoken response, roleplay turn, or Day 15 diagnostic prompt. Basic opt-in browser recording/transcription may provide formative evidence in P0; a text-only proxy is clearly marked as not pronunciation evidence. | Transcription must not produce pronunciation/accent scores, Goethe speaking scores, or unsupported proficiency claims. |
| Writing | Short self-introduction, description, routine/diary, request, or integrated Day 14/15 response, according to canonical day scope. | Rubric/feedback evaluates only stated criteria; it does not infer wider proficiency. |

**MUST:** Day 14 produces evidence across all four skills; Day 15 produces a diagnostic classification for all four skills plus pronunciation/direct processing/communication repair. Basic opt-in recording/transcription is formative evidence only. Earlier days produce only the modes the canonical curriculum specifies.

**SHOULD LATER:** richer speaking rubrics, multiple attempts over time, accessibility alternatives, and calibration against editorially approved benchmarks.

## 8. Direct-German-processing support

The learning principle is gradual support for German → meaning/context, replacing German → English/Hindi/Punjabi → meaning when useful and appropriate. It is a pedagogical support pattern, not a ban on translation.

**MUST**

- Present familiar-object/action tasks, visual/contextual prompts, short scenarios, and German-first question/answer paths where the canonical day supports them.
- Offer concise translation/meaning help on request or when the learner is blocked; do not penalize use of help.
- Mark direct-processing evidence only when the task is designed to test it—for example Day 4 familiar-object/action tasks and Day 15 diagnostic—not merely because the interface language was German.
- Show direct-processing as a bounded internal learning indicator, never as an official proficiency claim.

**SHOULD LATER:** learner-configurable support level and analysis of which help mode improves their outcomes.

**DEFERRED:** forcing immersion, removing accessibility/translation support, or using AI inference alone to declare direct processing.

## 9. Attempts, assessment evidence, mastery, and priority

### 9.1 Attempt and evidence behavior

**MUST**

- Preserve each submitted attempt with its input modality, timestamp, learner, target exercise/content/rubric version, and result.
- Create one or more `EvidenceRecord`s from an assessed attempt. Evidence identifies objective, skill, outcome, origin, and applicable error links.
- Distinguish deterministic results (answer key, constrained rubric) from formative/AI-assisted results. The UI must not present the latter as objective scoring.
- Allow a learner to retry; the new attempt adds evidence rather than deleting an earlier attempt.

### 9.2 Mastery stages

For a learner/objective, the product-stage progression is:

```text
exposure → recognition → controlled production → independent production → functional/automatic use
```

`not started` is the absence of evidence before exposure. `needs review` is a review/risk status, not a sixth mastery stage. This refines the technical specification's earlier generic mastery labels without changing its rule that mastery is derived and explainable.

| Stage | Product meaning | Minimum evidence character |
| --- | --- | --- |
| Exposure | Learner has encountered the target in meaningful context. | Lesson engagement plus an explicit introduction/comprehension interaction. |
| Recognition | Learner can identify the intended form/meaning in a familiar context. | Successful receptive/recognition evidence. |
| Controlled production | Learner produces/selects the target with prompt, scaffold, or constrained format. | Successful constrained production evidence. |
| Independent production | Learner uses the target in an appropriate unscaffolded-but-bounded task. | Successful independent spoken/written evidence where applicable. |
| Functional/automatic use | Learner shows stable, recent use and retrieval across appropriate contexts with no unresolved critical pattern. | Repeated successful evidence plus successful scheduled retrieval; never one attempt. |

The deterministic mastery rule is versioned. It evaluates evidence quality, recency, retrieval stability, and unresolved recurring errors. It must show the learner the evidence/gaps behind the current stage; it does not advance based solely on time, page completion, or an AI assertion.

### 9.3 Priority states

Priority is separate from mastery and content publication. The states are:

```text
NOW → EXPOSURE → LATER → OPTIONAL → SKIP
```

They are plan/selection states, not a learner-proficiency ladder:

| Priority | Product behavior |
| --- | --- |
| NOW | Eligible for active daily planning; canonical current day defaults here. |
| EXPOSURE | May be introduced/revisited without being a current mastery gate. |
| LATER | Intentionally postponed; not selected until explicitly moved or made eligible by the learner/program rule. |
| OPTIONAL | Useful but excluded from required day completion/progression. |
| SKIP | Explicitly excluded for this learner/program with a retained reason; it does not delete the canonical node or create false mastery. |

For the initial personal release, canonical day content is `NOW` when it becomes the current day; optional enrichment is not needed to complete the day. Learner selection of `LATER`, `OPTIONAL`, or `SKIP` is preserved as state/history and must be visible in progress.

## 10. Errors, remediation, re-test, and review/SRS

### 10.1 Error behavior

**MUST**

1. Capture an error only from an attempt/evidence context; it has a target node, skill, category, occurrence reference, and severity/impact.
2. Normalize repeated mistakes into an `ErrorMemory` when the same underlying issue recurs. Keep the original attempts—do not overwrite them with a summary.
3. Classify an error as a correction need, not a permanent learner trait. It must be possible for remediation evidence to resolve it.
4. Give the learner concise, target-specific feedback: what was expected, what was observed, and the next remediation/re-test action.

An error may be lexical (article/plural/meaning/recall), grammatical (e.g. V2, negation, accusative), comprehension, communication-repair, or skill-specific. AI may suggest a category, but the application only persists a normalized category after schema/target validation; it cannot invent a canonical grammar rule.

### 10.2 Remediation and re-test

**MUST**

- Create a narrow remediation task linked to the failing target: concise re-explanation, contrast/example, controlled retrieval, then a re-test appropriate to the error.
- Put unresolved high-impact or recurring errors ahead of new optional material in the daily plan.
- Record the re-test as new evidence. A successful re-test changes the remediation/error status and review scheduling through deterministic rules; it does not erase the failure.
- Retain `open`, `improving`, and `resolved` remediation/error status with reasons/evidence.

**SHOULD LATER:** group related error patterns and recommend a small targeted practice set.

**DEFERRED:** automated medical/psychological learning diagnoses, irreversible error labels, or AI-only remediation completion.

### 10.3 Review/SRS behavior

**MUST**

- Create a review item when a target has been introduced and needs later active retrieval; it holds target, due time, scheduling algorithm/version, prior outcomes, and status.
- Build review as recall/retrieval, not merely re-reading the original lesson.
- Calculate the next due time through a deterministic, versioned SRS function from assessed outcome, prior review history, recency, and unresolved errors. The initial product does not need public hard-coded intervals.
- Treat incorrect/struggled outcomes as evidence: show remediation/re-test and schedule an appropriately earlier follow-up. Treat successful retrieval as evidence that may support a stage increase.
- Include due reviews in the daily plan and allow a learner to defer an item explicitly. Deferred/overdue status is visible and does not imply mastery.
- Preserve every scheduling decision and algorithm version so learning history remains explainable and recalculable.

**SHOULD LATER:** tune SRS parameters against accumulated, consented product evidence and test alternatives by algorithm version.

**DEFERRED:** opaque AI-controlled scheduling, background notification workers, gamified streak pressure, and a separate queue/Redis system.

## 11. AI-assisted behavior and strict boundaries

### 11.1 Permitted uses

**FROZEN / APPROVED:** OpenAI is the initial AI and speech provider. It is accessed only through the existing server-side `AiTutor` and `SpeechService` abstractions; provider/API secrets remain server-side. The abstraction remains in place so this is not a permanent provider commitment.

| Capability | First-slice behavior | Status |
| --- | --- | --- |
| Explanation | Explain a selected canonical vocabulary/grammar/communication target in the learner's requested support level. It references the target/version. | MUST |
| Feedback | Give formative feedback on a learner attempt against a provided task/rubric; label uncertainty and preserve the learner's original work. | MUST |
| Constrained practice | Generate a temporary practice item only from selected canonical targets, permitted difficulty, response schema, and safety limits. It is visibly AI-generated. | SHOULD LATER; adapter/evaluation boundary is MUST |
| Roleplay | Run a bounded text roleplay from a canonical scenario such as restaurant, directions, appointment, or service interaction. | SHOULD LATER |
| Audio roleplay | Real-time or speech-to-speech conversation. | DEFERRED |

### 11.2 Non-negotiable boundaries

AI must not silently create, revise, publish, reorder, or delete canonical curriculum; modify CEFR/Goethe facts or mappings; decide official requirements; set priority/mastery/review/error/readiness state; change roles/consent/retention; or access private learner content outside the selected, consented use case.

AI output is either transient assistance or a learner-visible artifact labelled with AI origin, prompt/schema version, and retention rule. It becomes canonical curriculum only through a separate future human editorial publication process. AI estimates are never presented as official Goethe scores, certification, or examination results.

On provider, schema, or safety failure, DeutschOS preserves the learner's work, displays a clear non-destructive failure/retry state, and continues the deterministic learning loop without AI.

## 12. Curriculum, provenance, and versioning

### 12.1 Content classes

| Class | Meaning | Rules |
| --- | --- | --- |
| Canonical curriculum | Published DeutschOS release/day/node/exercise/rubric that determines the plan and evidence targets. | **FROZEN / APPROVED:** first-slice lesson/exercise content is original DeutschOS-authored or otherwise rights-cleared; it is versioned, provenance-labelled, editorially published, and never changed by AI. |
| Sourced/reference material | Permitted factual requirement/mapping or licensed/cleared asset referenced by curriculum. | **FROZEN / APPROVED:** official Goethe and other authoritative sources may be used for requirements, exam structure, competency mappings, and reference information subject to applicable rights. Record source, rights/permission basis, effective/review date, and attribution/display requirement. Do not copy/scrape proprietary Goethe course/exam content without explicit permission/licensing. |
| Learner-generated data | Attempts, writing, diary, recordings, preferences, plans, and consent. | Private by default; owner-scoped; retention/export/deletion rules apply. |
| AI-generated content | Explanation, feedback, temporary exercise, roleplay response, or generated derivative. | Labelled, schema-validated, bounded to selected target, never canonical by default. |
| Assessment evidence | Immutable record derived from an attempt/review/diagnostic. | References target/content/rubric/algorithm versions; supports explainable progress only. |

### 12.2 Versioning rules

**MUST**

- Version every published curriculum release/day/node/content item/exercise/rubric and retain provenance.
- Keep canonical DeutschOS-authored content and sourced/reference material distinguishable by provenance class; neither may be silently reclassified by AI.
- Reference exact content/rubric/review-algorithm versions from attempts, evidence, review decisions, and diagnostics.
- Publish corrections as a new version/supersession relation; never rewrite historical learner evidence to appear as though it used new content.
- Keep the supplied 15-day curriculum document as the canonical source for the initial release. Any change requires explicit editorial change control before implementation content changes.
- Store AI template/schema versions with retained AI artifacts and minimal metadata.

## 13. Privacy and data classification

The first slice is adult-only, personal-use. All learner data is private by default; the future presence of instructors/institutions grants no access in this slice.

| Classification | Examples | Required handling |
| --- | --- | --- |
| Public/non-sensitive | Product UI assets and published non-personal curriculum metadata. | No learner data; publish only cleared assets. |
| Internal operational | Aggregated health/error/usage metadata without learner content. | Minimize, restrict operational access, no raw private text/audio in logs. |
| Private learner | Profile, plan, attempts, vocabulary/grammar state, progress, error memories, skill/readiness summaries. | Owner-scoped authorization/RLS, server-side use cases, export/deletion design. |
| Highly restricted learner | Journal entries, free-text conversations, recordings, transcripts, AI feedback derived from them, consent records. | Private storage, explicit feature consent, short-lived access URLs, minimal retention, external processing disclosure, deletion propagation. |

**MUST**

- Model consent separately for optional recording/transcription, AI use of selected content, and future journal-feedback processing. Withdrawal stops new processing and triggers the defined deletion/retention workflow.
- Design export and deletion requests as domain actions even if the first UI is deferred; retain a deletion-request/lifecycle record rather than making data disappear without trace.
- **FROZEN / APPROVED:** learner content, conversations, transcripts, and recordings are private by default. Send them to OpenAI only for an explicit feature request with applicable consent. Do not use learner content for hidden training or broad analytics.
- **FROZEN / APPROVED:** retain audio no longer than necessary. Audio retention is explicitly controlled per asset and deletable through the media lifecycle; withdrawal/deletion must revoke live access and propagate the defined deletion workflow to dependent derivatives/references.
- **FROZEN / APPROVED:** provider/API secrets remain server-side. Do not claim a legal or data-residency guarantee unless it has been verified against current provider terms. Production privacy/retention policy remains subject to final verification before public deployment.
- Never store secrets, raw audio, raw journal text, or full prompts/responses in ordinary logs.

**SHOULD LATER:** learner-facing privacy controls/history and self-service export/deletion UI.

**DEFERRED:** institution/teacher sharing consent flows, minors/guardian workflows, and cross-tenant analytics.

## 14. Progress and internal diagnostic behavior

**MUST**

- Show current curriculum day state (`not started`, `in progress`, `completed`, or explicitly postponed) separately from mastery stages.
- Show evidence-based progress by canonical day/node and four skill dimensions, due review/remediation count, and recurring-error status.
- On Day 15, produce Strong/Developing/Weak/Critical classifications only for the canonical diagnostic areas. Each classification includes evidence/gaps and the diagnostic/rubric version.
- **FROZEN / APPROVED:** present learner-facing internal progress/readiness using `Needs practice`, `Developing`, `Strong evidence`, and `Ready for review`. Day 15's canonical Strong/Developing/Weak/Critical classifications remain the underlying diagnostic categories; they are not Goethe scores. `Ready for review` means evidence merits a learner's own review of the relevant target, not exam readiness or a predicted result.
- **FROZEN / APPROVED:** label every Goethe-related output as an internal DeutschOS preparation/readiness indicator. It is never an official Goethe score, result, certification, prediction, or guarantee of examination outcome.

**SHOULD LATER:** trend views across releases and editorially calibrated readiness summaries.

**DEFERRED:** official Goethe readiness thresholds, official score prediction, certificates, and institution reporting.

## 15. Acceptance criteria: complete daily learning loop

A daily loop is complete only when all applicable criteria below are met. “Applicable” respects the canonical day's specified modes; it does not require every skill every day.

1. An authenticated adult learner can open Today and see an explainable plan based on due review/remediation plus the current canonical day.
2. The learner can open the selected day and see only its published, versioned curriculum content and eligible review/remediation items.
3. Vocabulary appears with article/plural where relevant; grammar/exercise targets are explicitly linked to their canonical nodes.
4. The learner can complete at least one required activity for the day. Days requiring listening/reading/speaking/writing provide the corresponding rights-cleared content and response mechanism; Days 14 and 15 cover all four skills.
5. Submitting an activity creates an immutable attempt and linked evidence referencing learner, node, skill, content/rubric version, and timestamp.
6. Deterministically gradable work produces a clear result. Formative/AI feedback is labelled as such and does not overwrite the learner response or claim objective authority.
7. A wrong/struggled result creates or updates a target-linked error/remediation path and offers an appropriate re-test.
8. Completion/assessment creates or updates a deterministic, versioned review item; the next plan can show it when due.
9. The learner can view current day status, mastery evidence, four-skill evidence, due reviews, and open/improving/resolved error patterns without an official Goethe claim.
10. Private data remains owner-scoped; optional recording/transcription/AI processing requires applicable consent; provider failure leaves the learning loop usable and learner work preserved.

## 16. Implementation backlog

### P0 — must build to prove the vertical slice

1. Authentication/profile/timezone/consent foundation for one adult learner, with stable multi-learner-ready identity boundaries.
2. Canonical 15-day curriculum release, day/node/content/exercise/rubric/provenance model and editorial publication validation.
3. Today daily-plan query and plan-item reasons; Day 1 → Day 15 progress states and explicit postpone/resume behavior.
4. Lesson delivery for the authored 15-day content, including the canonical vocabulary/grammar structures and rights-cleared listening/reading assets required by the table above.
5. Attempts/evidence model; deterministic assessment for constrained tasks; four-skill tagging; immutable history.
6. Product mastery projection, `NOW/EXPOSURE/LATER/OPTIONAL/SKIP` priority selection, review item, versioned deterministic SRS function, and explainable due review UI.
7. Error-memory/remediation/re-test loop with normalized categories and visible status.
8. Day 15 diagnostic, internal classifications, and progress display with non-official wording.
9. Server-side AI explanation and formative feedback for selected canonical targets, with structured validation, quota/telemetry, failure handling, and clear AI labels.
10. Opt-in speaking recording/transcription needed for Days 1/11/13/14/15, private media lifecycle, and a clear formative/pronunciation limitation. If audio cannot meet the approved privacy conditions, ship a labelled non-audio speaking proxy and mark pronunciation diagnostic unavailable rather than fabricating it.
11. Unit/integration/RLS/end-to-end/curriculum/AI-evaluation coverage required by the technical specification.

### P1 — build after the P0 loop works with the intended learner

1. Constrained AI-generated temporary practice and bounded text roleplay for canonical scenarios.
2. TTS playback, richer listening variations, and accessible alternative interaction modes.
3. Availability-aware catch-up planning, review-parameter tuning by algorithm version, and more detailed trend views.
4. Structured journal UI and optional AI journal feedback under a separately confirmed consent/retention policy.
5. Content-editor workflow beyond the minimum operational process.

### P2 — only after a demonstrated need

1. Institution/class/teacher sharing and synchronization boundary implementation.
2. Future Germany, bureaucracy, Ausbildung, Berufsschule, and IT programs as versioned content packs using the same engine.
3. A2–B2 curriculum, sophisticated readiness calibration, real-time voice, calibrated pronunciation assessment, native apps, and offline support.

## 17. Explicitly deferred functionality

- Institution/class synchronization, teacher dashboards, roster import, SSO, and learner-data sharing.
- Full A2–B2 curriculum and advanced B1/B2 grammar as required content.
- Germany, bureaucracy, Ausbildung, Berufsschule, and IT content/program layers. They will enter as provenance-labelled curriculum programs, not a new learning engine.
- Real-time speech-to-speech roleplay, a generic queue/worker system, push/email reminders, vector retrieval, analytics warehouse, microservices, mobile apps, and a public API.
- AI-controlled mastery, review scheduling, curriculum publication, official-requirement changes, or learner-state mutation.
- Official Goethe scores, certificates, exam registration, score prediction, or claims that transcription is pronunciation assessment.

## 18. Frozen Step 5 decisions and remaining verification gate

The following previously open decisions are **FROZEN / APPROVED**:

1. **Content/provenance:** first-slice lesson and exercise content is original DeutschOS-authored or rights-cleared. Proprietary Goethe course/exam material is not copied without explicit permission/licensing. Canonical and sourced/reference material remain distinct by provenance.
2. **AI/speech/privacy:** OpenAI is the initial provider behind the existing abstraction. Learner content, conversations, transcripts, and recordings are private by default; secrets are server-side; audio retention is controlled, minimal, and deletable.
3. **P0 speaking recording:** basic opt-in browser recording/transcription may ship in P0 as formative learning evidence only. It produces no pronunciation/accent score, official Goethe speaking score, or unsupported proficiency claim. Real-time voice remains deferred.
4. **Readiness language:** use `Needs practice`, `Developing`, `Strong evidence`, and `Ready for review` as learner-facing internal labels. All Goethe-related output is explicitly an internal DeutschOS preparation/readiness indicator, never an official result or prediction.

**Remaining genuine verification gate:** before any public production deployment, verify the current provider terms and production privacy/retention policy, including applicable hosting/data-residency claims. This is a release-compliance verification, not an unresolved product or architecture decision.

## 19. Exact next implementation step

After the four open decisions are approved, **initialize the chosen Next.js/TypeScript/Supabase development foundation and implement P0 in order, starting with curriculum/provenance migrations and the authenticated Day 1 daily-plan → lesson → attempt/evidence vertical path.** Do not implement later days, AI, or audio before that path passes its unit, integration, RLS, and end-to-end acceptance checks.
