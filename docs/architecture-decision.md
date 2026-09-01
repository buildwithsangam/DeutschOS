# Architecture proposal: DeutschOS

**Status:** Proposal only — not an implemented architecture or a commitment to a technology stack.

## Decision summary

Build DeutschOS first as a **TypeScript modular monolith**:

- **Web and server:** Next.js App Router on Node.js with TypeScript.
- **Managed platform:** Supabase for PostgreSQL, authentication, and private object storage.
- **AI:** OpenAI Responses API, called only from server-side application services through an internal provider interface.
- **Speech:** browser recording plus asynchronous server-side transcription and text-to-speech for the MVP; add real-time conversation only after product validation.
- **Deployment:** Vercel for the Next.js application, with Supabase hosted in an EU region if its data-residency terms meet the product's requirements.
- **Background work:** no queue initially. Derive due reviews from PostgreSQL on demand; add a protected Vercel Cron endpoint only for truly scheduled daily batch work.
- **Tests:** unit/component tests, browser end-to-end tests, PostgreSQL migration/RLS integration tests, and a small versioned AI evaluation set.

This combination uses one primary programming language and two managed services. It avoids a separate API service, worker fleet, cache, vector database, event bus, and analytics warehouse until a demonstrated need exists.

## Why a relational core

DeutschOS's hardest long-term problem is not streaming chat; it is trustworthy learning state. Curriculum objectives, prerequisites, vocabulary senses, grammar concepts, attempts, review schedules, error history, readiness measures, class membership, and content versions have strong relationships and require consistent transactions. PostgreSQL is therefore the system of record.

Use relational tables for canonical learning data and constrained event records for history. JSON may hold flexible exercise payloads or AI-generated drafts only after a validated schema; it must not replace canonical curriculum structure. PostgreSQL full-text search is sufficient initially. Vector search is a later retrieval enhancement, not an MVP dependency.

## Recommended architecture pattern

Use a **domain-oriented modular monolith with ports and adapters**.

```text
Browser / accessible web UI
            |
     Next.js pages and route handlers
            |
  Application services (use cases and authorization)
            |
 Domain modules + explicit interfaces (ports)
            |
 PostgreSQL / Auth / Storage / OpenAI / email or job adapter
```

Suggested modules, rather than microservices:

- `identity` — current user, profile, consent, roles.
- `curriculum` — versioned CEFR/Goethe mapping, units, objectives, and content metadata.
- `learning` — exercises, submissions, scoring, and competency evidence.
- `review` — review items, deterministic scheduling, and error-memory links.
- `planning` — daily plan selection and readiness aggregation.
- `ai` — prompt assembly, structured-output validation, moderation, cost controls, and evaluation fixtures.
- `media` — signed upload/download, transcription, generated speech, and retention.
- `journal` — private entries and opt-in feedback.
- `institution` — organizations, classes, sharing, and synchronization; defer implementation.
- `analytics` — product/learning events and derived summaries.

The UI calls application services, not raw database tables. Application services own authorization and transaction boundaries. Database constraints and row-level security provide a second boundary for user-owned data. Modules communicate through typed application/domain contracts, never through HTTP inside the same deployment.

Keep server code, provider credentials, and privileged database access server-only. Use server components for data-centric views and client components only for interaction, recording, timers, and other browser APIs.

## Options and trade-offs

### Frontend and server

| Option | Strengths | Limitations | Verdict |
| --- | --- | --- | --- |
| **Next.js + TypeScript, one repository** | One language, SSR, strong React ecosystem, route handlers for a small backend-for-frontend, straightforward Vercel deployment. | Framework conventions and server/client boundaries need discipline. | **Choose.** Best solo-developer speed without forcing a separate backend. |
| React SPA + separate API (NestJS/Fastify) | Clear API boundary and easy future native-client reuse. | Two deployments, authentication boundary, duplicated types/contracts, and more operational work before it is justified. | Defer; split only when other clients or independent scaling require it. |
| Remix/React Router full-stack | Excellent web fundamentals and simpler server model for some teams. | Smaller default ecosystem for managed React patterns and fewer turnkey deployment conventions for a solo MVP. | Reasonable alternative, not enough project-specific benefit over Next.js. |
| Django/Rails/Laravel | Mature batteries-included backends and reliable admin patterns. | Adds a second primary language and a separate frontend integration choice. | Strong if the developer is already highly productive in one; otherwise not the best fit for this project. |

### Database and data access

| Option | Strengths | Limitations | Verdict |
| --- | --- | --- | --- |
| **Supabase PostgreSQL** | Real PostgreSQL, SQL migrations, Auth, Storage, RLS, backups, and future `pgvector`/`pg_cron` options in one managed service. | Requires care with grants, RLS policies, and provider terms. | **Choose.** The learning model and personal data suit it very well. |
| Managed PostgreSQL (Neon/RDS) + separate Auth/Storage | More vendor choice per concern. | More accounts, integration code, and security configuration. | Valid later; unnecessary MVP surface area. |
| Firebase/Firestore | Fast realtime prototypes and low operational overhead. | Document modelling is awkward for curriculum relationships, reporting, and scheduling; moving to relational later is expensive. | Do not choose as the system of record. |
| MySQL/PlanetScale | Familiar operational path and branching options. | No advantage over PostgreSQL for this relationship-heavy, search/retrieval-friendly domain. | Not preferred. |

Use Supabase's generated database types at the boundary and SQL migrations as the source of truth. An ORM/query builder can be introduced only if it demonstrably improves the team's productivity; do not create a repository abstraction around every query. The important seam is domain/application code versus persistence, not a speculative ORM swap.

### Authentication and authorization

| Option | Strengths | Limitations | Verdict |
| --- | --- | --- | --- |
| **Supabase Auth + PostgreSQL RLS** | Identity is colocated with data; email/passwordless and OAuth are available; RLS supports learner and class isolation. | RLS needs tests and a service-role key must never reach the client. | **Choose.** |
| Clerk/Auth0 | Excellent hosted user-management UI and enterprise features. | Another vendor and user-ID migration concern; overlapping capabilities at MVP. | Revisit for enterprise SSO or provisioning. |
| Self-hosted auth | Maximum control. | Security work and legal/operational burden are disproportionate. | Do not choose. |

Start with email magic link or email/password and retain a stable internal user UUID. Model learner, instructor, institution-admin, and platform-admin roles separately; do not encode all authorization only in frontend checks. Every user-owned table and private storage bucket must have least-privilege RLS/grants from its first migration.

### AI integration

| Option | Strengths | Limitations | Verdict |
| --- | --- | --- | --- |
| **OpenAI Responses API behind an internal `AiTutor` port** | Supports structured outputs, multi-turn workflows, tools, and a coherent text/audio roadmap. A server-side adapter centralizes safety, cost, prompt versions, and evaluation. | A provider dependency and variable model cost; outputs are probabilistic. | **Choose for MVP.** |
| Multi-provider gateway from day one | More resilience and negotiation leverage. | Doubles test cases and makes behavior consistency harder before the product contract is known. | Design the port, but implement one provider first. |
| Vercel AI SDK | Convenient streaming UI and provider integrations. | An additional abstraction that may obscure provider-specific features needed for learning evaluations and audio. | Optional presentation-layer helper later, not a core dependency decision. |
| Self-hosted/open-weight model | Potential data-control advantages at sufficient scale. | Significant serving, evaluation, quality, and GPU operations burden. | Postpone until scale/compliance justifies it. |

AI must augment deterministic pedagogy rather than own it. The application chooses the exercise objective, level, expected answer form, and accepted scoring rules. The model can explain, generate a constrained draft, give formative feedback, or roleplay. Validate all model output against a typed schema before display or persistence. Store prompt template/version, model identifier, input provenance, latency, token/cost telemetry, and a minimal redacted result trace. Do not make the model the canonical source for CEFR/Goethe facts.

### Files, audio, and speech

| Option | Strengths | Limitations | Verdict |
| --- | --- | --- | --- |
| **Browser MediaRecorder + private object storage + asynchronous transcription/TTS** | Simple interaction model; audio is uploaded directly with signed access; lower cost and easier reliability than a permanent voice session. | Not instant conversational feedback. | **Choose for MVP.** |
| **OpenAI transcription + TTS through a server adapter** | Good language-learning building blocks and one AI provider surface. | External processing and variable usage cost; need consent and deletion rules. | **Choose behind the audio port.** |
| Browser Web Speech API only | No server audio cost and very fast to demo. | Browser/locale quality and availability are inconsistent; unsuitable as a scored learning record. | Progressive enhancement only. |
| Real-time WebRTC speech-to-speech model | Natural roleplay and low-latency interaction. | Session security, observability, retries, and cost are materially more complex. | Postpone until asynchronous speaking practice proves demand. |
| Specialized pronunciation scorer | Potentially better phoneme-level feedback. | Different evaluation model, vendor, and data contract. | Evaluate later against German pronunciation requirements. |

Store original audio only when the learner explicitly consents and for a documented retention duration. Store transcript, feedback, and a reference to the audio separately. Use private buckets and short-lived signed URLs. Do not claim that transcription alone is valid pronunciation assessment.

### Background jobs and scheduling

| Option | Strengths | Limitations | Verdict |
| --- | --- | --- | --- |
| **Calculate due reviews from Postgres at request time; protected Vercel Cron for a daily batch only when needed** | No worker fleet or queue; reliable enough for personal daily planning. | Not suitable for high-volume or long-running tasks. | **Choose for MVP.** |
| Supabase `pg_cron`/database functions | Scheduling close to data, fewer network hops. | Database-side logic can become opaque and provider-specific. | Use later for a small, transactional maintenance job if it is clearly simpler. |
| Trigger.dev/Inngest | Durable multi-step workflows, retries, and observability. | Extra service and mental model. | Add when jobs need retries, fan-out, notifications, or long execution. |
| Redis queue + separate workers | Flexible, scalable processing. | Operational overhead and another data system. | Do not introduce for MVP. |

The review algorithm should be a pure, versioned function. Persist its inputs, algorithm version, scheduled time, and outcome. This makes it testable and lets it evolve without silently corrupting learner history. Store all instants in UTC and calculate learner-local day boundaries from an IANA timezone.

### Testing

Use TypeScript static checks and linting; unit-test pure curriculum, review, readiness, and authorization policy helpers; add component tests for complex interactions; and use Playwright for the critical learner journey. Run migration tests and RLS integration tests against an isolated PostgreSQL environment. Add contract tests around provider adapters.

AI needs a small curated evaluation corpus: level-tagged prompts, expected constraints, known error patterns, and human rubric checks. Run it on prompt/model changes before accepting them. Audio flows need fixture-based transcription tests and a small manual quality checklist. Do not rely on snapshots of arbitrary model prose as the only oracle.

### Deployment, monitoring, and cost

Deploy the web application on Vercel and use a managed Supabase project. This gives preview deployments and keeps the initial operational footprint to two services plus AI usage. Use an EU region for learner data if legal/data-residency evaluation confirms it, configure separate development/staging/production projects before collecting real learner data, and use environment-specific credentials.

Start with structured server logs, error tracking, request IDs, basic performance metrics, AI cost/latency telemetry, database backup checks, and a product-event table. Do not add a data warehouse, event stream, Redis cache, Kubernetes, or observability suite until volume and questions justify them. Add rate limits and per-user AI/audio quotas from the first externally usable release; they are both a cost and abuse control.

## MVP architecture scope

The MVP should prove one complete learning loop rather than implement every promised layer:

1. Account, learner profile, timezone, consent, and private data boundaries.
2. A deliberately small, authored curriculum slice with stable IDs, level/objective mapping, and content versioning. The schema can accommodate A0–B2, but the MVP should not pretend the full curriculum is complete.
3. Vocabulary, grammar, and reading/listening exercises with attempt recording.
4. A deterministic review queue plus basic error-memory links.
5. A daily plan generated from due work, selected goals, and learner availability.
6. AI explanation and constrained correction/generation via the server, with schemas, limits, telemetry, and a human-review path for authored content.
7. Text-to-speech playback and recorded speaking submission with transcription; make audio retention opt-in.
8. Basic progress and readiness indicators that visibly distinguish evidence from an official Goethe readiness claim.
9. Private journal entries; AI journal feedback only with explicit per-feature consent.

The MVP does **not** need real-time voice roleplay, full A0–B2 content coverage, adaptive machine learning, institute synchronization, classroom dashboards, push notifications, a native app, a vector store/RAG system, a queue, microservices, or a warehouse.

## Designed for replacement

Create narrow interfaces only around volatile external concerns:

- `AiTutor`: structured generation, explanation, correction, moderation, and model telemetry.
- `SpeechService`: synthesize, transcribe, and later score/stream speech.
- `ObjectStore`: private upload, read URL, delete, and retention operations.
- `Notifier` and `Scheduler`: daily plan/review reminders without coupling domain logic to cron or email vendor.
- `IdentityContext`: current actor and claims, isolating application services from a particular auth SDK.
- `InstitutionSync`: import/export and roster synchronization, wholly deferred.
- `AnalyticsSink`: product telemetry that can begin in Postgres and later fan out.

Do **not** abstract HTTP, React, PostgreSQL, every repository, or every date utility merely in anticipation of a replacement. Those abstractions make an MVP slower without reducing a realistic migration risk.

## Decisions needing extra care

These choices create durable data or compliance consequences and should be confirmed before implementation:

1. **Curriculum provenance and versioning.** Define whether content is original, licensed, or imported; retain source/rights metadata; version mappings and objectives. “Goethe-aligned” must be pedagogically reviewed and must not imply official certification or affiliation.
2. **Learning evidence and algorithm history.** Keep immutable attempt/review records, algorithm versions, timestamps, and content versions. Readiness scores must be explainable and recalculable.
3. **Privacy, consent, retention, and data residency.** Journal text, corrections, recordings, transcripts, and AI prompts can be highly personal. Confirm user age policy, lawful basis, consent UX, retention/deletion/export requirements, subprocessors, EU hosting, and whether recordings may be sent to an AI provider.
4. **Tenant and sharing model.** Personal learner data, institute data, class membership, teacher visibility, and guardian/minor scenarios need an explicit policy before institute work begins. This drives RLS and audit design.
5. **Identity keys and migrations.** Use stable UUIDs and an explicit profile model. Changing auth providers, user identifiers, or tenant boundaries later is possible but costly.
6. **Time and scheduling semantics.** Use IANA timezones, UTC instants, and defined “learning day” rules from the first review record.
7. **AI quality and safety contract.** Decide which feedback is advisory versus scored, what must be validated, how users report errors, and what is retained. Never expose provider keys to the browser.
8. **Media lifecycle.** Decide whether to retain original audio, derivative audio, transcripts, and feedback independently; define deletion propagation and backup expectations.

## Implementation gate and proposed next step

Before writing application code, confirm the primary stack and the eight durable decisions above, especially curriculum rights, privacy/data residency, target learner age range, MVP learner journey, and whether institute sync is in the first release or a later phase.

**Proposed next implementation step:** create a product-domain specification and MVP vertical-slice plan: personas, the first learner journey, a curriculum/content model proposal, data-classification and retention rules, acceptance criteria, and an ordered implementation backlog. That remains a planning step; after approval, initialize the selected stack and build the first authenticated curriculum/review vertical slice.

## Reference documentation consulted

- [Next.js App Router](https://nextjs.org/docs/app) and [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Supabase PostgreSQL overview](https://supabase.com/docs/guides/database/overview), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and [data security](https://supabase.com/docs/guides/database/secure-data)
- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model) and [audio/realtime model catalog](https://developers.openai.com/api/docs/models)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
