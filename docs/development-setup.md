# Local development setup

## Prerequisites

- Node.js 22 or later
- pnpm 10 or later
- A Supabase project or local Supabase environment when implementing authenticated/data-backed features

## Environment

Copy `.env.example` to `.env.local` and set only the variables required by the feature being exercised. The foundation home page does not access Supabase or OpenAI, so it starts without configured credentials.

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required when using Supabase Auth or public-key clients.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and reserved for isolated administrative adapters.
- `OPENAI_API_KEY` and `OPENAI_MODEL` are server-only and required only when an approved AI use case invokes the OpenAI adapter.

Never commit `.env.local` or real credentials.
