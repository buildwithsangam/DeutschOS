# Module boundaries

Each module owns `domain`, `application`, `infrastructure`, and `ui` concerns.

- `domain`: pure business types and rules; no framework, provider, or environment imports.
- `application`: use cases and ports; coordinates authorization and transactions.
- `infrastructure`: vendor/database implementations of ports.
- `ui`: module-scoped presentation components.

The initial foundation contains only identity, AI, and media boundary types. Future modules are added at this same level: `curriculum`, `learning`, `review`, `planning`, `readiness`, `journal`, `analytics`, `goethe`, `institution`, and `future-domains`. They must communicate through published application/domain contracts, not each other's persistence internals.
