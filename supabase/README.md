# Supabase foundation

This directory is the source of truth for ordered PostgreSQL, Row Level Security,
and Storage-policy migrations. The baseline migration is intentionally empty.
The A1 curriculum foundation migration introduces versioned, provenance-aware
canonical content tables only; it does not include learner state, attempts,
reviews, or other learning-engine tables.

Use a separate Supabase project for local/development, staging, and production.
Never apply unreviewed changes directly through a production dashboard.
