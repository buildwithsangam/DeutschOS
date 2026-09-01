# DeutschOS technical specification

**Status:** Architecture specification for the implementation phase. It defines the MVP technical direction; it does not implement, provision, or irreversibly configure any service.

**Terms used in this document:**

- **Chosen** — the MVP implementation baseline, subject to the explicitly stated review triggers.
- **Proposed** — a concrete shape to implement once the relevant feature is started; it is not yet a deployed component.
- **Deferred** — intentionally out of MVP scope.
- **Open** — requires an owner decision before the affected feature is released.

## 0. Critical review of the architecture proposal

The Step 2 proposal is retained with the following corrections and clarifications:

1. **Do not create a scheduler merely because a `Scheduler` port exists.** Reviews are due by data query, not by a background worker. A cron endpoint is introduced only when a concrete scheduled, idempotent task is approved (for example, reminder delivery). There is no queue or worker in the MVP.
2. **Use a server-side application boundary for all domain data.** The browser may use Supabase Auth and a narrowly scoped signed-upload flow, but it must not become a general client for curriculum, attempts, journal, or learner-state tables. This reduces accidental exposure while RLS remains defense in depth.
3. **Do not persist raw AI prompts/responses by default.** Store request metadata, template version, input references, model/provider identifier, outcome category, latency, and cost. Persist content only when it is a user-visible artifact that the product needs and its retention/consent rule allows it.
4. **Vercel and Supabase are chosen MVP hosts, not permanent architectural commitments.** The core is standard TypeScript and PostgreSQL. Provider replacement is not a near-term project, but the design avoids provider-owned business logic.
5. **Do not over-specify future roles or schema now.** The MVP authorizes a learner and a tightly controlled platform administrator. Instructor/institution roles, class sharing, and roster synchronization have a defined extension path but no MVP UI or broad access policies.
6. **Do not treat flexible JSON as a shortcut around curriculum modelling.** Any JSON exercise payload has a versioned schema and is validated; relationships, lifecycle state, ownership, rights, and reporting fields remain relational.
7. **Audio transcription is not pronunciation scoring.** Initial speaking feedback is formative. A phoneme-level scoring claim requires a separately validated method and is deferred.

## 1. Final system architecture

### 1.1 Chosen application boundary

DeutschOS is a single TypeScript web application and a single PostgreSQL system of record. Next.js provides the web UI and a backend-for-frontend (BFF) through server components, server actions, and route handlers. It is a **modular monolith**, not a distributed system.

```text
Browser
  ├─ Next.js client components: interaction, recorder, timers, accessible UI
  └─ Next.js server boundary: pages, actions, route handlers
       └─ Application use cases: authorization, validation, transactions
            └─ Domain modules: rules, types, policies, pure calculations
                 └─ Adapters: PostgreSQL/Auth/Storage/AI/Speech/observability
```

The application server is the only component that executes domain mutations and privileged integrations. Supabase hosts identity, PostgreSQL, and object storage; it is not a second application backend with duplicated business rules.

### 1.2 Module responsibilities

| Module | Responsibility | MVP status |
| --- | --- | --- |
| `identity` | actor resolution, profile, timezone, consent record, platform role checks | Chosen |
| `curriculum` | versioned objectives, nodes, mappings, prerequisites, sources, authored content metadata | Chosen |
| `learning` | exercise delivery, answer validation/scoring, attempts, evidence | Chosen |
| `review` | review items, deterministic scheduling, error-memory links | Chosen |
| `planning` | select a daily plan from deterministic signals; explain why an item was selected | Chosen |
| `readiness` | derived CEFR/Goethe-module evidence and internal estimates | Proposed for MVP, conservative |
| `ai` | provider port, prompts, schemas, limits, evaluation, failure handling | Chosen |
| `media` | private uploads, audio lifecycle, transcription, TTS | Chosen |
| `journal` | learner-private text entries and opt-in feedback | Proposed MVP feature |
| `analytics` | append-only product/learning events and derived summaries | Chosen, minimal |
| `institution` | organizations, classes, teacher sharing, synchronization | Deferred |
| `future-domains` | Germany, bureaucracy, Ausbildung, Berufsschule, IT content packs | Deferred |

### 1.3 Dependency rules

1. UI code may depend on its module's application-facing types and presentation helpers. It must not import database clients, service-role clients, or AI keys.
2. Application use cases may depend on domain types/rules and on ports. They coordinate authorization, validation, and a single transaction where required.
3. Domain code must be deterministic and side-effect free. It must not import Next.js, Supabase, OpenAI, browser APIs, or environment variables.
4. Infrastructure adapters implement ports and may depend on vendor SDKs. They may not contain curriculum or learning-policy decisions.
5. A module may consume another module only through its published application/domain contract. No module reads another module's persistence internals.
6. Cross-module changes that mutate learner state must name the initiating use case and write an auditable event in the same transaction when applicable.

### 1.4 Ports/adapters boundaries

Create ports only for external or materially volatile concerns:

- `CurrentActor` — authenticated actor and claims.
- `AiTutor` — structured explanation, correction, constrained exercise draft, and later roleplay.
- `SpeechService` — transcription and speech synthesis; streaming is an optional later capability.
- `ObjectStore` — create scoped upload/read access, delete, and retention operations.
- `Clock` — current instant and learner-local-day calculation input for testability.
- `Notifier` — deferred reminder delivery.
- `AnalyticsSink` — minimal event capture.
- `InstitutionSync` — deferred roster/content synchronization.

Do not add generic repository interfaces, an internal HTTP API, an event bus, or an ORM-agnostic data layer. PostgreSQL and Next.js are direct implementation dependencies at the infrastructure/application boundary.

### 1.5 Server/client boundaries

- **Server components:** authenticated data loading, curriculum pages, progress pages, and initial plan rendering.
- **Client components:** form interaction, optimistic display after a server-confirmed mutation, audio recording, playback controls, timers, and accessibility-focused UI state.
- **Server actions:** authenticated, same-origin UI mutations with validated input.
- **Route handlers:** streaming/output downloads, upload-authorisation handoff, webhooks, and future external integrations. They enforce authorization, idempotency, and request limits.
- **Browser-to-Supabase exceptions:** authentication session management and upload to a server-authorized, private object path only. The browser receives neither a service-role key nor broad table permissions.

## 2. Proposed technology stack

| Area | Chosen MVP technology | Boundary and trade-off |
| --- | --- | --- |
| Runtime/tooling | Node.js active LTS, TypeScript, a lockfile-based package manager | One language for UI, server, and tests. Exact package versions are selected during scaffold and pinned. |
| Frontend | Next.js App Router + React | Server-first rendering with isolated client islands. Do not create a separate SPA/API pair. |
| Application/server | Next.js server actions and route handlers | Adequate BFF boundary for web MVP; extract an API only for a real second client or independent operational need. |
| Database | Supabase-managed PostgreSQL with SQL migrations | Relational system of record. SQL/migrations remain portable; no ORM is chosen prematurely. |
| Auth | Supabase Auth; email magic link for MVP | Stable UUIDs flow into the profile. OAuth and enterprise SSO are deferred. |
| Authorization | application checks + PostgreSQL RLS and least-privilege grants | RLS is defense in depth, never a substitute for use-case authorization. |
| Storage | Supabase private Storage | Scoped upload/read/delete adapter; no public learner bucket. |
| AI | OpenAI Responses API through `AiTutor` | One provider adapter first; model selection remains configuration/evaluation driven. |
| Speech/audio | Browser MediaRecorder; OpenAI transcription and TTS through `SpeechService` | Asynchronous first. Real-time WebRTC and pronunciation scoring are deferred. |
| Jobs | none initially; optional protected Vercel Cron endpoint when a concrete job exists | Due reviews are queried, not enqueued. Durable workflow platform/queue is deferred. |
| Tests | TypeScript checks/linting, Vitest, React component tests, Playwright, PostgreSQL/RLS integration tests | AI and curriculum validation are first-class test suites. |
| Deployment | Vercel for Next.js; Supabase for managed services | Chosen for MVP simplicity, pending privacy/data-residency approval. |
| Observability | structured application logs, error reporting, request IDs, AI telemetry, database backup checks | No analytics warehouse or distributed tracing platform initially. |

## 3. Proposed repository structure

The following tree is a future target, not scaffolding created by this document:

```text
DeutschOS/
├── docs/
│   ├── architecture-decision.md
│   ├── technical-specification.md
│   ├── adr/
│   └── runbooks/
├── src/
│   ├── app/                         # Next.js routes, layouts, route handlers
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── ui/
│   │   ├── curriculum/
│   │   ├── learning/
│   │   ├── review/
│   │   ├── planning/
│   │   ├── readiness/
│   │   ├── ai/
│   │   ├── media/
│   │   ├── journal/
│   │   └── analytics/
│   ├── shared/
│   │   ├── domain/                  # small, truly shared value types only
│   │   ├── application/             # actor, result/error conventions
│   │   ├── infrastructure/          # provider/client composition only
│   │   └── ui/                      # design primitives, no domain policy
│   └── styles/
├── supabase/
│   ├── migrations/                  # ordered SQL schema/RLS migrations
│   ├── seed/                        # non-production, provenance-labelled fixtures
│   └── tests/                       # SQL/RLS integration tests
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── ai-evals/
│   └── curriculum/
├── scripts/                         # explicit, safe maintenance/validation commands
├── public/                          # only non-private static assets
├── .env.example                     # variable names only, never secrets
└── README.md
```

`domain` contains business invariants and pure rules. `application` exposes use cases and ports. `infrastructure` implements ports and database/provider concerns. `ui` contains module-scoped React presentation. `src/app` composes routes; it must not grow into a second domain layer. `shared` is deliberately small—move code there only when two modules genuinely share a stable concept.

## 4. Data architecture

### 4.1 Canonical relational data

PostgreSQL holds canonical records and their foreign-key relationships:

- identity/profile, consent, role assignments, timezone, and account lifecycle;
- curriculum releases, CEFR/Goethe mappings, nodes/objectives, prerequisite edges, content sources/rights, and publication state;
- lexical entries/senses, grammar concepts, exercises, answer keys/rubrics, and content versions;
- learner enrolment/selection state, attempts, responses, score/evidence, review items, schedule decisions, error memories, plan entries, and readiness evidence;
- media asset metadata, ownership, retention state, transcript/feedback references, and deletion requests;
- journal metadata/entries, subject to privacy rules; and
- append-only operational/learning events and AI request metadata.

Use UUID primary keys, `created_at`/`updated_at` UTC instants where meaningful, explicit ownership/tenant fields, foreign keys, unique constraints, check constraints, and indexes for user + due-time, content version, and membership lookups.

### 4.2 Flexible JSON data

JSON is permitted only for bounded, versioned, validated payloads such as:

- exercise interaction configuration and accepted structured answer shape;
- AI structured output that survives as a learner-visible draft/feedback artifact;
- provider response metadata that is not queried as canonical business data; and
- optional feature-specific settings with a declared schema version.

Each JSON payload must have a `schema_version`, be validated at input/output, and have an owner module. If the application queries, joins, constrains, authorizes, reports on, versions independently, or references a field across records, that field belongs in relational columns/tables instead.

### 4.3 Event/history data

Attempts, review-scheduling decisions, content publication, consent changes, role changes, and AI operation metadata are append-only history. Corrections create a new event or derived projection; they do not rewrite evidence. Events record actor, correlation/request ID, timestamp, relevant entity/version references, and minimal redacted metadata. They do not become an event-sourcing platform.

### 4.4 Versioning requirements

- Curriculum release, mapping, node, exercise, rubric, and source provenance are versioned and immutable once published.
- Attempts and readiness evidence reference the content/rubric/review-algorithm version used at the time.
- Prompt templates and structured-output schemas are versioned.
- Learner state is a current projection derived from evidence plus explicit user actions; the evidence stays available for recalculation.
- Migrations are ordered, reviewed SQL. Never mutate production schema manually without a recorded migration.

## 5. Security architecture

### 5.1 Authentication, authorization, and roles

Supabase Auth issues the authenticated session. The server resolves an `IdentityContext` for every protected use case; client-provided user identifiers are never authorization evidence.

| Role | Status | Permitted scope |
| --- | --- | --- |
| Learner | Chosen MVP | Own profile, curriculum assignments, learning state, private media, and journal according to consent. |
| Platform administrator | Chosen MVP, tightly controlled | Operational/admin workflows only; not routine learner-content access. Any access is audited. |
| Instructor | Deferred | Learners explicitly assigned through a class/membership policy only. |
| Institution administrator | Deferred | Institution configuration and aggregate/roster administration only. |

### 5.2 RLS strategy

1. Every exposed application table has RLS enabled in the same migration that creates it.
2. Grants are explicit and minimum necessary; policies restrict rows by authenticated actor, ownership, and later membership.
3. Browser access to application tables is not the normal path. RLS protects against accidental/alternate access and supports narrowly approved direct operations.
4. The server normally uses a request-bound user session for learner-domain work so RLS remains active. A service-role client is allowed only in isolated, server-only administrative/job adapters and must perform its own authorization.
5. RLS policies, views, functions, and Storage policies are integration-tested before release. `SECURITY DEFINER` functions are exceptional, narrowly permissioned, and reviewed.

### 5.3 Secrets and private storage

- Secrets exist only in server/deployment secret stores; never in client bundles, source, logs, fixtures, or error messages.
- The public Supabase project key is not a secret but is used only with RLS and least privilege. Service-role credentials are server-only.
- Journal entries, recordings, transcripts, learner uploads, and generated private audio use private buckets/records and short-lived, audience-checked signed URLs.
- Validate upload ownership, MIME type, size, and allowed path before issuing an upload authorization; process or reject unexpected files safely.
- Apply rate limits and per-user usage quotas to mutation, AI, and media endpoints before external availability.

## 6. AI architecture

### 6.1 Provider boundary

`AiTutor` is the only domain-facing AI port. The MVP OpenAI adapter implements explicit operations such as `explainConcept`, `correctResponse`, and `generateExerciseDraft`. `roleplayTurn` is part of the future port, not an MVP requirement. The port accepts a typed pedagogical context and returns either validated typed output or a classified failure—never untyped provider text.

### 6.2 Rules and lifecycle

1. A use case first selects canonical curriculum objective, learner level, task type, safety constraints, and permitted context.
2. The adapter uses a named, versioned prompt template and a versioned output schema.
3. Structured output is validated before it reaches UI or storage. Invalid output is retried only within a bounded policy, then returns a safe fallback/error.
4. AI may make an explanation, constrained exercise draft, formative correction, or recommendation. It may not publish curriculum, change mappings/prerequisites/rubrics, alter mastery/review state, assign a readiness result, or delete learner data.
5. A deterministic application use case decides whether an AI recommendation becomes a proposed action. Any accepted learner-state change is persisted transactionally with its origin marked as user, deterministic rule, or accepted recommendation.
6. Canonical curriculum is authored/reviewed content with source provenance. AI-generated curriculum-like material is a draft until a human publishes it through a future content-authoring workflow.

### 6.3 Prompt, evaluation, and cost controls

- Keep prompt templates, output schemas, and evaluation fixtures versioned in the repository. Do not place credentials or raw learner data in fixtures.
- Maintain a small level-tagged corpus for explanation accuracy, correction constraints, exercise quality, refusal/safety behavior, and known German learner errors. A human rubric reviews material prompt/model changes.
- Record minimal request metadata: operation, template/schema version, provider/model configuration, input references rather than raw inputs, latency, token/usage estimate, outcome, and correlation ID.
- Enforce per-operation input/output limits, timeout, retry cap, per-user quota, global budget alert, and feature kill switch. Stream only through authenticated endpoints.
- On provider/network/validation failure, show a clear retryable state and preserve the learner's original work. The failure never mutates learner state or silently substitutes invented curriculum facts.

## 7. Media and audio architecture

### 7.1 MVP recording and upload flow

1. A learner explicitly starts browser recording; the UI displays recording status and the applicable retention/AI-processing consent.
2. The browser sends metadata to a protected server action/route handler.
3. The server authorizes the actor, validates quota/type/size, creates a private asset record, and returns a scoped upload authorization/path.
4. The browser uploads only to that path. The server finalizes the asset after verification and queues no invisible processing.
5. The learner explicitly requests transcription/feedback. The server retrieves the private asset, calls `SpeechService`, validates the result, and stores transcript/feedback under the asset's owner and retention rule.

### 7.2 TTS and lifecycle

Text-to-speech is requested by an authenticated use case for approved text. Generated audio is either streamed transiently or stored as a private derivative with a short retention policy; it is never put in a public bucket merely for convenience.

The source asset, transcript, feedback, and generated derivative have separately recorded lifecycle states. A learner deletion request deletes/revokes all live object references and marks dependent records consistently. Backup expiry and any legal hold are handled as policy/operations, not silently claimed as immediate erasure.

### 7.3 Privacy and future extension

Recording is opt-in per feature and must state external processing. Journal entries and recordings are not supplied to AI by default. Audio is formative; no pronunciation score is represented as a Goethe result.

**Deferred real-time voice path:** add a `StreamingSpeechSession` adapter, server-minted short-lived session credentials, explicit session start/stop, transcript retention policy, quota, and observability. This is an additive adapter; it does not change canonical attempt/review records.

## 8. Curriculum architecture

### 8.1 Core model

The curriculum module represents a versioned directed graph:

- **Curriculum release:** a published, immutable collection/version for a learning program.
- **Node:** a stable learning unit/objective with level, type, publication state, and provenance.
- **Mapping:** relation from node to CEFR level and, where substantiated, Goethe exam/module competency mapping.
- **Prerequisite edge:** an explicit graph edge with rationale; cycles are rejected by validation.
- **Content item:** versioned authored material/exercise associated with one or more nodes.

Goethe mappings are editorial mappings with a source reference and review status. They must never be presented as official Goethe certification, scoring, or affiliation unless an approved source and legal claim permit it.

### 8.2 Curriculum relevance states

`NOW`, `EXPOSURE`, `LATER`, `OPTIONAL`, and `SKIP` are learner- or program-context selections, not mastery results:

- `NOW` — candidate for active planning now.
- `EXPOSURE` — introduce or revisit without making it a mastery gate.
- `LATER` — intentionally postponed, commonly because prerequisites/priority are unmet.
- `OPTIONAL` — useful elective content, excluded from required progression.
- `SKIP` — explicitly excluded for this learner/program; retains rationale and does not erase the node.

These states are separate from content publication and from a learner's evidence/mastery.

### 8.3 Mastery and provenance

Mastery is a derived, explainable projection per learner/node: `not_started`, `introduced`, `practising`, `stable`, or `needs_review`. It is backed by attempt evidence, review outcomes, and deterministic rules; it is not set directly by AI.

Every published node/content version records author/editor, source/rights/provenance reference, review/publish timestamps, and replacement/supersession relation. A new version does not silently revise evidence obtained against an earlier version.

## 9. Learning-state architecture

Learning state is per learner and derives from canonical evidence. It is not one opaque profile blob.

| State area | Canonical evidence/current projection |
| --- | --- |
| Learner | profile, timezone, declared goal, availability/preferences, consent, active curriculum context |
| Vocabulary | lexical sense exposure, attempts, recall evidence, review item, error links, current mastery projection |
| Grammar | concept exposure, exercise evidence, error-pattern links, review item, mastery projection |
| Skills | reading/listening/writing/speaking evidence per node/task/rubric/version; speaking is formative unless separately calibrated |
| Review | item target, due time, scheduling algorithm version/input/output, status, and last reviewed evidence |
| Error memory | normalized error category, target node/content, occurrence evidence, remediation status; never an unsupported psychological diagnosis |
| Readiness | derived evidence coverage, consistency, and internal estimate by CEFR/Goethe module, with calculation version |

All review timestamps are UTC instants. Learner-local days are calculated using a stored IANA timezone, never a fixed browser offset.

## 10. Adaptive-engine boundaries

### Deterministic application controls

- prerequisite validation, curriculum relevance state, exercise eligibility, answer scoring where a rubric is deterministic, review due calculation, mastery projection, daily-plan constraints, and readiness aggregation;
- transaction boundaries, audit/history records, permissions, quotas, and published-content selection.

### AI may recommend

- an explanation style, a formative correction, a constrained draft exercise, optional practice alternatives, or a ranked recommendation with reasons.

### AI must not directly mutate

- canonical curriculum/mappings/provenance; prerequisites; published content; attempts; review schedule; mastery; error state; readiness; membership/roles; consent; media retention; or any access-control data.

Every learner-state mutation is made by a named server-side use case after deterministic validation. The mutation stores the actor/origin, evidence references, algorithm/version where relevant, and a correlation ID. Recommendation acceptance is explicit and never background automation.

## 11. Goethe readiness architecture

Readiness is an internal decision-support feature, not an official Goethe score. The model stores evidence by relevant skill/module (reading, listening, writing, speaking, and any confirmed module mapping), content/rubric version, and recency. A calculation produces:

- coverage of mapped objectives;
- recent evidence and review stability;
- gaps/uncertainty; and
- an internal, explainable readiness indicator.

The UI must label all outputs as DeutschOS estimates and explain the evidence/gaps. Calibration uses authoritative official sources only where rights/terms permit, plus editorial review; no algorithm may infer an official threshold from unverified data. Official exam registration, examination, and scoring remain outside the system.

## 12. Institute synchronization architecture

This is an extension module, not MVP scope. Its future model is:

- institution → class → membership/teaching assignment → lesson/assigned curriculum nodes;
- learners own their personal learning state by default;
- an instructor sees only assigned learners and only the fields explicitly approved by the sharing policy;
- journal text, raw recordings, and AI conversations are private by default and require explicit future policy/consent before sharing;
- institution administrators manage roster/configuration, not unrestricted learner content.

Future synchronization enters through `InstitutionSync` with an import/export boundary and idempotent external identifiers. It must not directly write learner review/mastery evidence. Roster, SSO, gradebook, real-time class sync, and teacher dashboards are deferred.

## 13. Future-domain architecture

Germany, bureaucracy, Ausbildung, Berufsschule, and IT are additions to curriculum/content, not new learning engines. Each can be represented as a provenance-labelled curriculum program/content pack with nodes, prerequisites, vocabulary, grammar/skill objectives, exercises, and optional planning tags. Domain-specific documents or simulations remain content/exercise types behind the same attempt/evidence/review interfaces.

If a future domain requires trusted regulatory content, its editorial source, effective date, jurisdiction, and review owner are versioned. This preserves the core learner/review/readiness model and avoids a redesign. It does not authorize the product to provide legal, immigration, employment, or professional advice.

## 14. Non-functional requirements

| Concern | MVP requirement |
| --- | --- |
| Reliability | Mutations are validated, authorized, transactional where multi-record consistency matters, idempotent where retried, and preserve learner work on integration failure. |
| Performance | Server-render data-first routes; paginate/limit learner-history queries; index due-review and ownership lookups; move only measured slow work out of request paths. |
| Accessibility | Keyboard-operable flows, semantic HTML, labelled controls, visible focus, sufficient contrast, caption/transcript alternatives for audio, and no audio-only instructions. Test critical flows with automated checks and manual keyboard/screen-reader review. |
| Maintainability | Strict TypeScript, module dependency rules, small focused use cases, SQL migrations, documented ADRs/runbooks, and tests at deterministic boundaries. |
| Observability | Request/correlation IDs, structured errors, health of critical integrations, migration tracking, AI/media usage telemetry, audit events for privileged operations, and no sensitive content in logs. |
| Scalability | Managed PostgreSQL with indexed relational access first. Add read replicas, durable jobs, caching, or split services only after measured bottlenecks and an ADR. |
| Backup/recovery | Use provider backups according to the selected plan; periodically test restore/export procedures in a non-production environment; document RPO/RTO targets before paid/public launch. Storage backup coverage and deletion semantics are verified separately from database backups. |

## 15. Testing architecture

| Test layer | Required coverage |
| --- | --- |
| Unit | Pure curriculum graph validation, relevance/mastery/review rules, readiness calculations, consent/retention policy helpers, and error classification. |
| Integration | Application use cases with isolated PostgreSQL, migrations, transactions, provider adapter contracts, and Storage lifecycle fakes/fixtures. |
| RLS/security | Each protected table/bucket policy: owner allowed, other learner denied, unauthenticated denied, later membership access explicit, service role never available to browser. |
| End-to-end | Sign in; complete a selected learning item; record attempt; receive due review; view daily plan; use AI failure-safe state; and consent/delete media flow when media ships. |
| AI evaluation | Versioned fixtures/rubrics for schema conformance, level/goal constraints, known error cases, safe failure, and cost/latency regression review. |
| Curriculum validation | Required provenance/version fields, acyclic prerequisites, valid mappings, valid relevance/mastery enums, no unpublished content in learner plans, and deterministic release builds. |

Tests do not use production learner data or live provider credentials by default. Any integration test that calls an external service is separately labelled, opt-in, rate-limited, and redacts artifacts.

## 16. Environment and deployment model

| Environment | Purpose | Data/service rule |
| --- | --- | --- |
| Local | developer implementation and tests | local/isolated Supabase-compatible environment or non-sensitive development project; synthetic fixtures only. |
| Development | shared integration checks | separate Supabase project and secrets; no real learner content. |
| Staging | release verification | production-like configuration; synthetic/anonymized test data only; migrations rehearsed here first. |
| Production | learner service | separate Vercel/Supabase projects, least-privilege production secrets, backups/monitoring enabled. |

Environment variables are named in `.env.example` without values. Public configuration is explicitly allow-listed; secrets are server-only deployment secrets. Rotate secrets through the provider process, never by committing replacements.

All schema, RLS, function, and storage-policy changes use reviewed SQL migrations. CI runs validation/tests against an isolated database; staging applies the exact migration sequence before production. Production migration, rollback/forward-fix, backup, and incident steps are documented in a runbook before public launch.

## 17. Architectural decision records

New material decisions get a short ADR in `docs/adr/` before implementation changes their cost. The initial decisions are:

| ID | Decision | Reason | Alternatives rejected | Trade-off | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| ADR-001 | Modular monolith | One deployable, one language, strong domain boundaries without distributed operations. | Microservices; SPA + API split. | Future extraction requires deliberate API work. | A second client/team needs independent release/scale with measured pressure. |
| ADR-002 | PostgreSQL on Supabase | Relational curriculum/learning state plus managed Auth/Storage/RLS. | Firestore; separate DB/Auth/Storage. | Provider operational dependency; RLS complexity. | Compliance, regional availability, or service limits fail requirements. |
| ADR-003 | Next.js BFF | Solo-developer speed and server/client boundary in one repo. | Separate Nest/Fastify; Django/Rails. | Framework conventions and server/client discipline. | Native/external API needs or independent backend scaling are demonstrated. |
| ADR-004 | Supabase Auth + RLS | Identity colocated with tenant data and defensive authorization. | Clerk/Auth0; self-hosted auth. | Provider/user-ID migration cost later. | SSO/provisioning/compliance requirements cannot be met. |
| ADR-005 | OpenAI behind `AiTutor` | Fast initial AI capabilities without hard-wiring pedagogical rules to a vendor. | Multi-provider gateway; self-hosted model. | Provider cost/availability dependence. | Evaluation, cost, privacy, or capability requirements fail. |
| ADR-006 | Async audio first | Lower complexity/cost and clear learner consent boundary. | Real-time voice first; browser speech only. | Less conversational immediacy. | Evidence shows live roleplay materially improves outcomes and can meet cost/privacy requirements. |
| ADR-007 | No job system initially | Due work is queryable; no concrete long-running/retry workflow exists. | Redis/worker; durable workflow platform. | Future reminders/jobs need an explicit addition. | A specified workflow needs durable retries, fan-out, or exceeds request time. |
| ADR-008 | Immutable learning evidence/versioned curriculum | Explainability, recalculation, and pedagogical trust. | Mutable aggregate-only records. | More storage and migration discipline. | Never for evidence; only projection/storage optimization strategy may change. |

## 18. MVP boundary

### MUST BUILD FIRST

- Next.js TypeScript application foundation; managed Postgres/Auth/private Storage configuration; migrations and RLS test harness.
- Email magic-link authentication, learner profile, timezone, consent, and minimal administrator operational access.
- One small, authored curriculum release/slice with provenance, versioning, CEFR mapping, and validated prerequisite graph.
- Vocabulary/grammar plus at least one reading or listening exercise flow; attempts, deterministic scoring where applicable, evidence history, review queue, error-memory link, and daily-plan query.
- Server-side AI explanation/correction or constrained draft flow with typed outputs, evaluation fixture, quotas, telemetry, and safe failure.
- TTS and opt-in recorded speaking submission/transcription only if the selected first vertical slice needs it; otherwise retain the media architecture and postpone implementation.
- Basic internal progress/readiness evidence display with non-official wording.
- Core test, migration, RLS, error logging, backup/runbook, and accessibility baseline.

### BUILD LATER

- Complete A0–B2 curriculum coverage; richer skill/rubric content; journal AI feedback.
- Real-time voice roleplay; calibrated pronunciation assessment; push/email reminders; durable workflows.
- Instructor/institution/class synchronization, SSO, roster imports, dashboards, sharing policies.
- Germany/bureaucracy/Ausbildung/Berufsschule/IT content packs.
- Mobile clients, offline support, vector retrieval, data warehouse, advanced adaptive models, multi-provider AI routing.

### DO NOT BUILD YET

- Microservices, internal service HTTP calls, Kafka/event bus, Redis, a generic queue/worker fleet, Kubernetes, data warehouse, vector database/RAG pipeline, speculative native apps, custom identity system, or a broad public API.
- Automated curriculum publication, automated learner-state changes from AI, official Goethe-score claims, or pronunciation-score claims based on transcription alone.

## 19. Known risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Curriculum accuracy, rights, or misleading Goethe claims | Versioned provenance, editorial review/publish state, source validation, clear internal-estimate wording. |
| Sensitive journal/audio data exposure | Server boundary, RLS/grants/storage policies, minimal logging, consent, retention/deletion flow, and security tests. |
| AI hallucination or inappropriate feedback | Typed outputs, curated prompt/eval fixtures, deterministic constraints, no direct state mutation, fallback UI, and feature kill switch. |
| AI/audio cost escalation | Quotas, input/output caps, per-operation telemetry, budget alerts, and async-first audio. |
| RLS policy mistake | RLS/grant policy template, migration review, table/bucket security tests, and avoid broad direct client database access. |
| Learner progress becomes irreproducible | Immutable evidence, versioned algorithm/content/rubric references, and derived projections. |
| Premature infrastructure burden | Explicit no-queue/no-Redis/no-microservices rule; ADR and metrics required before additions. |
| Provider outage or API change | Narrow adapters, timeouts/retries, safe degradation, contract tests, and no provider-owned canonical truth. |
| Scope grows beyond solo-developer capacity | One vertical learning loop first; all institution/realtime/domain-pack capabilities deferred. |
| Migration/data loss | Ordered SQL migrations, staging rehearsal, backup/recovery runbooks, and forward-fix discipline. |

## 20. Open decisions requiring owner approval

Only the following decisions genuinely require product/legal owner confirmation before the affected release:

1. **Curriculum rights and review owner:** original/licensed/imported source policy, editorial approval authority, and permitted use of CEFR/Goethe references.
2. **Privacy policy:** target learner age range, lawful basis/consent design, data-residency requirement, retention/deletion/export expectations, and approved AI/audio subprocessors.
3. **First vertical slice:** the initial CEFR level/objectives, exercise types, and whether speaking transcription is in that first slice or follows it.
4. **Readiness claim policy:** the exact learner-facing wording and governance for internal Goethe B1/B2 readiness estimates.
5. **Initial launch geography and compliance requirements:** determines whether the chosen EU-region hosting/provider terms are sufficient.

Institute synchronization, SSO, real-time speech, and advanced adaptation are deliberately not open MVP blockers because they are deferred.

## 21. Exact next implementation step

**Step 4, after the five open decisions are approved:** create the product-domain specification for the selected first vertical slice—personas, learner journey, curriculum-node/content inventory, answer/rubric rules, data classification/retention mapping, acceptance criteria, and ordered implementation backlog. Do not scaffold or install the stack until that specification is approved.
