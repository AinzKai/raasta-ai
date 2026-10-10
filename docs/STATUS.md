# Raasta — implementation status & handover

Snapshot of the repository after the product upgrade and the knowledge-freshness work.
Written to be read cold: what exists, what was actually verified, what was **not**, and what to do next.

## Verification results (measured, final pass 10 Oct 2026)

| Check | Result |
|---|---|
| `tsc --noEmit` | **Pass** (0 errors) |
| `eslint .` | **Pass** — 0 errors, 10 warnings (react-refresh in shadcn `ui/*` and `pwa.tsx`; one `useEffect` dependency warning in `status.tsx`) — all pre-existing |
| `vitest run` | **Pass** — 12 files, 180 tests |
| `vite build` (production) | **Pass**, with and without Supabase variables |
| Production-browser smoke test (headless Chromium vs the built Cloudflare worker, run locally with `wrangler dev`) | **Pass** — 43/43 checks, both with Supabase variables missing and with (placeholder) variables present |
| SQL security tests (`scripts/test-sql.sh`) | Passed in the earlier pass (20 checks, local PostgreSQL 16 with Supabase's `auth` schema stubbed); **not re-run in the final pass** |

### Verified in a real browser (production build)
`/demo` reset, checklist readiness maths, step completion, copy success **and** failure, save destination ("Saved on this device"),
no "Saved" message when storage fails, Google Maps labelled *Third-party tool*, *Government site* only on `gov.pk` links, no item
badged plain *Verified*, no horizontal overflow at 390 px on 10 routes. Desktop and mobile screenshots were inspected.

### NOT verified — please do not assume these work
- **Live Supabase** (auth, saving to an account, case tracker, admin), **live AI** (router, Explain This, document checker): never run
  against real credentials. Tests use in-memory fakes.
- Migrations were never applied to a real Supabase project.
- The scheduled source monitor has never run against the real government sites.
- `/chat` journey intake, `/explain`, `/complaints` with a signed-in user, `/admin`: not exercised in a browser beyond load/overflow checks.
- Urdu and Roman Urdu copy has not been reviewed by a native speaker; RTL layout not visually reviewed.
- PWA install, offline mode, accessibility audit (axe / screen reader), Lighthouse, real devices: not done.
- Google Fonts could not load in the test sandbox (no external network); the app falls back to system fonts. Not tested with fonts loaded.

## What was built

### 1. Product (journeys, trust, grounding)
- **Verified knowledge layer** `src/lib/knowledge/` — structured fee / requirement / step / action / office / warning / timeline records, each with `sourceId`, `verificationStatus` (`verified | official_source | needs_confirmation | not_verified | user_provided`), `lastCheckedAt`, `lastVerifiedAt`, `basis`. Fees are numbers (or `null` = "no confirmed amount"), never strings. Seed data supplied in the brief (NADRA, DGI&P, Islamabad Excise) is loaded with honest provenance; unverified things stay unverified (e.g. lost-CNIC fee, motorbike fees).
- **Fixes to the old knowledge:** Islamabad vehicle transfer no longer points at Punjab Excise; a wrong NADRA helpline `tel:` link was corrected; stale pre-April-2025 Islamabad fees are kept only as superseded history; real office/hours/form link from the official ICT page were added.
- **Server-side grounding** `src/lib/grounding/` — the model is a router that outputs *only IDs* (strict Zod schema; no free-text, fee or URL field). The server validates every ID against the knowledge layer, retries once, then falls back to a deterministic router that also works with no AI key. Jurisdiction is first-class (unsupported provinces are refused, not guessed). Prompt-injection cases are tested.
- **Journey engine** `src/lib/journey/` — pure, deterministic: step statuses, checklist, **readiness = ready ÷ required** (no AI), saved state validated on load.
- **UI** — landing page with a live journey preview built by the real engine; `/chat` (journey intake + clarifier chips); `/journeys` (My Journeys); `/journey/$id`; `/demo` (no account, reset button); `/explain` (Explain This with a prose guard that rejects invented numbers/links); `/services`; `/complaints` rewritten as **Raasta Case Tracker** (separates *Raasta status* from *Official status: Not connected*); `/account` with delete-my-data and delete-account; trust badges with a provenance popover; mobile bottom nav and sticky next-action bar.
- **Localization** — English / اردو / Roman Urdu for the main experience (`src/lib/copy.ts`, enforced by tests). Legacy services (birth certificate, NTN, police certificate, domicile) are English-only content.
- **Security/privacy** — layered fail-closed rate limiting (IP + user, per-minute + daily; in-memory fallback if the counter is down); document-checker boundary enforced in code (no authenticity claims, ID numbers redacted, MIME/size checks, client-side re-encode strips EXIF); `journeys` table with RLS; case-tracker columns that never imply government filing.
- **PWA** — manifest, service worker (production only), offline page, offline banner. Offline = app shell + pages already visited + saved journeys; new AI questions need a connection.

### 2. Knowledge freshness & governance
Pipeline: *registered source → check → change detection → candidate → human review → versioned knowledge → date-driven active value.*
- **Monitoring** (`src/lib/freshness/monitor.ts`, `source-health.server.ts`, upgraded the existing cron path): only registered sources; robots.txt honoured; per-source frequency; retries only for 429/5xx; bot-protection pages treated as failures (never bypassed); content normalization + hash; meaningful-change detection by facts (numbers) not bytes; snapshots kept; sources that can't be fetched are flagged **manual**.
- **Candidates**: AI may only *propose*; proposals are Zod-validated, must reference a real monitored fact, and the evidence quote must appear in the real page text (the stored quote is the page's own text). With no AI, a meaningful change still creates a page-level candidate for a human.
- **Versioning**: seed = version 1; approved changes are versions 2+. The active value is computed from `effective_from` at read time, so a future-dated change activates itself with no deploy. Rollback marks a version rolled-back; nothing is ever deleted.
- **Admin** (`/admin`, `/admin/candidates/:id`, `/admin/history`): knowledge-health dashboard, review queue, old-vs-proposed diff, "open official source", approve / reject / needs-investigation with notes, optional effective date, conflicts list with resolve/dismiss, version history + rollback, audit trail, "run monitor now", and a clearly-labelled DEV fixture (CNIC 400 → 600) that is disabled unless `ALLOW_KNOWLEDGE_FIXTURES=true` outside production.
- **Authorization is server-side**: every admin server function runs `requireKnowledgeAdmin` (verified JWT → `app_admins` lookup on every call). The `/admin` UI gate only chooses what to render.
- **Database**: all governance tables are admin-read-only under RLS with *no* write policies; published versions and the audit log are protected by triggers (immutable, no delete); deleting an admin account cannot rewrite history. Verified by `supabase/tests/security.sql`.
- **The public AI path** sees only active approved knowledge: the router catalogue contains no values at all, and the public overlay endpoint selects only `status = 'published'` versions (rolled-back/pending never appear).

## What remains (honest list)

**Must do before showing this to anyone**
1. Run it: `npm install && npm run dev`, click through `/chat`, `/explain`, `/complaints`, `/account`, `/admin` with real Supabase and AI keys (`/demo`, `/`, `/journeys`, `/services` were checked in a production build).
2. Apply migrations to your Supabase project and confirm the new tables, RLS and `increment_rate_limit` RPC work there.
3. Create the first admin (SQL below) and exercise the 400 → 600 flow using the dev fixture.
4. Check the real first monitor run: which sources become *manual*, which fail.

**Product gaps**
- No screenshots, OG image (currently the 512 icon), or README visuals; GitHub description/topics can't be changed from here.
- Dark mode not built (the existing theme had none).
- Only one verified office record; no phone/hours for most offices (shown as "not currently verified" by design).
- Journeys for 4 legacy services are generic and English-only; their facts are `needs_confirmation`/`not_verified`.
- Old saved-conversation history is no longer shown in the UI (tables untouched; "Delete my data" still removes them).
- Document checker and Explain This unverified with a real model.
- Accessibility: semantics/labels/focus/reduced-motion were built in but not audited with a screen reader or axe.
- Performance audit (bundle size, duplicate requests) not done.

**Governance gaps**
- Only fee `amount` is versionable; documents, steps, timelines and processing days are not yet.
- Adapters: HTML pages and opaque files (hash only). No PDF text extraction, no structured-table or API adapters.
- Conflict UI can only *resolve/dismiss with a note*; it does not apply a chosen value (use approve on the right candidate).
- Safe auto-publish exists only as a policy flag (`autoPublishEnabled`, off for every source); no auto-publish code path was written — by design.
- No metrics endpoint beyond the dashboard counts; no alerting/email on new candidates.
- No UI to add/remove admins or edit the source registry (registry is code; admins via SQL).
- Staleness shown to users is limited to a popover note and a downgrade after 90 days with no read date.

**Known data decisions to confirm**
- Motorbike transfer fees are `needs_confirmation` because a one-month waiver was announced on 7 Apr 2026 and I could not confirm it ended.
- CNIC processing-day figures are marked estimates (secondary sources disagree).
- DGI&P helpline number carried over unverified.
- The ICT page lists a 4-week processing time (shown as official-source, unconfirmed).
- `lastVerifiedAt` is deliberately `null` everywhere in the seed: no dated *human* verification was available.

## Setup notes
Env (see `.env.example`): Supabase URL/keys incl. `SUPABASE_SERVICE_ROLE_KEY`, one AI provider key, cron secret. Optional dev-only: `ALLOW_KNOWLEDGE_FIXTURES=true`.

Make a user an admin (run in the Supabase SQL editor, using their auth user id):
```sql
insert into public.app_admins (user_id) values ('<auth.users.id>');
```
SQL security tests (needs a scratch Postgres superuser): `PGURL="postgresql://postgres@localhost:5432" scripts/test-sql.sh`.

Migrations (apply in order): `20260907000001`, `...0002`, `20261007000001_journeys_and_case_tracker`, `20261009000001_knowledge_governance`.
