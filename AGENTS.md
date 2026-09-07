# Agent notes for this repo

- This app's core trust rule: the assistant only states facts that are in
  `src/lib/knowledge.ts` or returned by an AI call grounded in that
  knowledge. Never let a code change cause a fee, deadline, or requirement
  to be presented as confirmed when it's marked `unverified` in the
  knowledge base.
- AI calls go through `src/lib/ai.ts` (`callAI`), which picks Gemini or
  Qwen automatically based on which env var is set. Don't call either
  provider's API directly from a new feature — extend `ai.ts` instead so
  both providers keep working everywhere.
- Server-only code (Supabase service-role calls, AI provider calls) belongs
  under files matching `**/server/**` or using the `server-only` import
  guard — `tanstackStart`'s `importProtection` (see `vite.config.ts`) will
  error at build time if server code leaks into a client bundle. Treat that
  error as a real bug to fix, not something to bypass.
- Database schema lives in `supabase/migrations/`. Add new migrations
  rather than hand-editing the schema elsewhere.
