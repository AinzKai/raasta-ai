# Raasta — your path through Pakistan's civic services

Raasta turns a person's goal ("I bought a used car in Islamabad and want it in my name") into a **verified, step-by-step journey**: what to prepare, how ready you are, what it costs, where to go, and which official source says so. When it can't confirm something, it says so instead of guessing.

> Status: working prototype / hackathon build. See **[docs/STATUS.md](docs/STATUS.md)** for exactly what is built, what was verified, and what is still missing.

## Why this isn't "ChatGPT for government"
- **The AI never supplies facts.** It only routes a request to IDs. The server validates each ID and every fee, form, link and office is read from a structured, source-cited knowledge layer.
- **Readiness is arithmetic, not AI:** ready required items ÷ required items.
- **Verification states are explicit:** Verified · Official source · Needs confirmation · Not currently verified · You told us.
- **Knowledge changes are governed:** monitored sources → change detection → review candidate → human approval → versioned, date-effective knowledge → audit trail. The AI never publishes knowledge.

## Run it
```bash
npm install
cp .env.example .env     # fill Supabase + one AI provider (the app still routes without an AI key)
npm run dev
npm test && npx tsc --noEmit && npm run lint && npm run build
```

`/demo` needs **no** account and works even if the Supabase variables are absent (accounts then show as unavailable). For a production
build, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as **build-time** variables (in the Cloudflare project's build settings) to enable sign-in and saving to an account. To preview the built worker locally: `npm run build` then
`npx wrangler dev --config .output/server/wrangler.json` (wrangler is not a dependency of this repo). See `FINAL_HANDOVER.md`.

## Layout
| Path | What |
|---|---|
| `src/lib/knowledge/` | verified records: services, fees, requirements, steps, actions, offices, sources |
| `src/lib/grounding/` | router schema, deterministic fallback router, server-side ID resolution, prose guards |
| `src/lib/journey/` | journey builder, readiness, persistence helpers |
| `src/lib/freshness/` | monitoring, change detection, candidates, versions, governance workflow |
| `src/components/journey/` | journey UI primitives (timeline, checklist, fee/trust cards) |
| `src/routes/` | pages incl. `/chat`, `/journeys`, `/demo`, `/explain`, `/complaints`, `/admin/*` |
| `supabase/migrations/` | schema + RLS · `supabase/tests/security.sql` RLS/immutability checks |

## Be precise about what is automatic
Automatic: source monitoring (registered sources only), change detection, candidate generation.
Human-controlled: approving/rejecting knowledge, publishing, conflict resolution, rollback.
Raasta is an independent guide, not a government service, and cannot submit anything on your behalf.
