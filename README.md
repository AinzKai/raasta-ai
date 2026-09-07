# Raasta AI

A bilingual (Urdu / Roman Urdu / English) assistant that turns a Pakistani
citizen's civic-service problem — CNIC renewal, passport renewal, vehicle
ownership transfer, and more — into a clear, sourced, step-by-step checklist.

Every fact the assistant states is either traceable to an official government
source or explicitly labeled unverified. Nothing is ever guessed and
presented as fact — that's the entire trust claim the product is built on.

## Features

- **Grounded chat assistant** — answers only from a verified knowledge base
  per service; asks a clarifying question instead of guessing when it needs
  one more fact; every factual claim shows its source.
- **Document sanity-check** — an optional photo upload that gives a plain
  visual read (is it legible? is a field blank?) — never a claim about
  authenticity or legal validity.
- **Complaints** — file and track a complaint against a government service.
- **Phone/email + Google sign-in**, with saved request history per account.
- Installable as a PWA; fully responsive; built to feel like a trustworthy
  government digital-service portal, not a generic chatbot demo.

## Tech stack

- **Frontend:** React + TanStack Start (SSR) + TanStack Router, Tailwind CSS,
  shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Row-Level Security) via TanStack
  Start server functions
- **AI:** Google Gemini or Alibaba Cloud Qwen — auto-selected based on which
  API key is configured (see below)
- **Build/deploy target:** Cloudflare Workers, via Nitro

## Setup

1. Copy the env template and fill in real values:
   ```sh
   cp .env.example .env
   ```
2. Supabase — set `SUPABASE_URL`, `SUPABASE_PROJECT_ID`,
   `SUPABASE_PUBLISHABLE_KEY` (and the matching `VITE_` versions) from your
   Supabase project's API settings.
3. AI provider — set **one** of:
   - `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`, defaults to
     `gemini-1.5-flash`), or
   - `QWEN_API_KEY` (+ optional `QWEN_MODEL` / `QWEN_VISION_MODEL` /
     `QWEN_BASE_URL`)

   If both are set, Qwen takes priority. Nothing will answer without one of
   these configured.
4. Install and run:
   ```sh
   npm install
   npm run dev
   ```
5. Build for production:
   ```sh
   npm run build
   ```

## Project structure

```
src/
  routes/          TanStack Router pages (index, chat, auth, complaints, ...)
  components/       UI components
  lib/
    ai.ts           Dual-provider AI client (Gemini / Qwen)
    assistant.functions.ts   Main chat/roadmap server function
    documents.functions.ts   Document sanity-check server function
    knowledge.ts     The verified per-service knowledge base
  integrations/supabase/    Supabase client + auth wiring
supabase/
  migrations/       Database schema (profiles, conversations, complaints, ...)
```

## License

Not yet decided — add one before making this repository public if that
matters for your use case.
