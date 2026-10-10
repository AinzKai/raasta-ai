# Raasta — Final Handover (10 Oct 2026)

Scope was frozen: stabilize, verify, package. No features were added.

## Status in one paragraph
`/demo` works without an account and — after this pass — without Supabase settings. The demo-reset "ghost record" was a dev-only
problem and is fixed at its root. All local checks pass (tsc, eslint, 180 tests, production build) and a headless-Chromium run of the
**production build** passed 43/43 checks. Nothing involving live Supabase or a live AI model has been run.

## Exact results (final pass, run after the last code change)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, no errors |
| `npx eslint .` | exit 0 — 0 errors, 10 warnings (all pre-existing: shadcn `ui/*` and `pwa.tsx` react-refresh, `status.tsx` hook deps) |
| `npx vitest run` | exit 0 — **12 files, 180 tests passed** (172 before this pass + 5 autosave + 3 config) |
| `npx vite build` | exit 0, with no Supabase variables and with placeholder ones |
| Production-browser script (Chromium → built worker via `wrangler dev`) | **43/43 passed** with Supabase variables missing; **43/43 passed** with placeholder variables set |
| `scripts/test-sql.sh` | **not re-run** this pass (earlier pass: 20 checks passed against local Postgres with stubbed `auth`) |

Prettier: `src/styles.css` and `src/routes/README.md` fail `prettier --check`; neither was touched in this pass.

## What was wrong and what was done

1. **Demo reset race — reproduced, cause found, fixed.**
   *Production build:* after Reset demo / Start over (each settled and mid-debounce), storage stayed empty for 3 s — **no race in production**.
   *Dev server:* an empty record was auto-saved on every mount, and again ~600 ms after each reset. Cause: `JourneyWorkspace` skipped
   only the *first* run of its autosave effect; React `StrictMode` (enabled by TanStack Start's default client entry, dev only) runs
   effects twice. Fix: autosave now compares content against what is already persisted (`src/lib/journey/autosave.ts`,
   `AutosaveGate`). Normal autosave still works (verified). Regression tests: `src/lib/__tests__/autosave.test.ts`.
2. **Missing Supabase variables — reproduced, fixed in code.**
   Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` at build time, **every page** (not just `/demo`) failed on hydration
   with "This page didn't load": `SiteHeader`/`useSession`, the root layout's auth listener and the server-function auth middleware all
   touched the Supabase client. Smallest safe change: `isSupabaseConfigured()` (`src/integrations/supabase/config.ts`, presence check
   only, nothing logged) and guards in those three places. With no configuration there is simply no session. `/auth` then says
   *"Accounts aren't available on this deployment"* and links to the demo. No authentication or authorization logic was weakened.
   Tests: `supabase-config.test.ts` plus both browser runs.
3. **"Save as my journey" could miss a change made <600 ms earlier** (listed as a known issue in `FINALIZATION_NOTES.md`): the demo now
   flushes the pending autosave first (`flushRef`). Verified in the browser run (the check was added after the fix, so it has not been
   observed failing beforehand).
4. **Docs.** `docs/DEMO_SCRIPT.md` rewritten against the actual UI. Conflicting claims corrected in `docs/TEAM_BRIEF.md`,
   `raasta-ai-notebooklm-source.md`, `AGENTS.md`; `docs/STATUS.md`, `docs/FINALIZATION_NOTES.md`, `README.md` updated. No government
   amount, status or date was changed.

## Browser checks performed (production build, 1280 px and 390 px, headless Chromium)
- Reset demo → readiness 0%, storage empty for 2 s afterwards, "My journeys" copy untouched. ✔
- Checklist: Ready ×2 → "2 of 10 required items ready", 20%; **Needs attention** does not count; toggling off reduces the count. ✔
- Mark step complete: "1 of 5 steps" → "2 of 5 steps". ✔
- Copy checklist: shows *Copied* and the clipboard really contains the checklist; with clipboard blocked it shows
  *"Couldn't copy on this browser. Nothing was copied."* and never *Copied*. ✔
- Save: "Save as my journey" → *"Saved on this device · My journeys"*, record present in the journeys store and listed on `/journeys`.
  Header "Save journey" saves only the **demo's own** record. ✔
- Storage failure (setItem throws): failure alert shown, **no** "Saved…" text anywhere, autosave failure also surfaces. ✔
- Google Maps: both links sit beside *Third-party tool · Google Maps*, are not in *Official actions*, and the note says it is not a
  government site. ✔  *Government site* tags appear only on `gov.pk` links. ✔
- Badges: 31 *Official source*, 2 *Needs confirmation*, 2 *Not currently verified*, **0 plain *Verified*** (no dated human check exists). ✔
- 390 px: no horizontal overflow on `/demo`, `/`, `/chat`, `/journeys`, `/services`, `/explain`, `/complaints`, `/about`, `/status`, `/auth`. ✔
- Screenshots (desktop full page; mobile top and tools sections) were opened and read. Layout looked correct; mobile bottom nav and the
  sticky next-step bar overlap content only as designed.
- Both builds: no console errors except Google Fonts being blocked in the sandbox.

### The three earlier browser-test failures
- 2 × Google Fonts unreachable — **environmental** (reproduced: `ERR_TUNNEL_CONNECTION_FAILED`; app falls back to system fonts).
- 1 × empty demo record reappearing after reset — **real but dev-only**; fixed (see above).

## Decision needed from you before presenting (not changed — scope frozen)
**CNIC fee rows are badged *Official source* but Raasta has never read NADRA's fee page.** Their basis in `src/lib/knowledge/fees.ts`
(`cnicBase`) is "supplied in the owner's brief; corroborated by news reports on 7 Oct 2026". `/services/cnic` also shows the generic line
"These amounts follow an official notification." Consider changing `cnicBase.verificationStatus` from `"official_source"` to
`"needs_confirmation"` (amounts unchanged; run `npm test` afterwards, some tests may assert the current label). The demo script is
written so you can present either way honestly. Passport rows: only the 36-page rows were read from the DGI&P page (7 Oct 2026); the
72/100-page rows came from the brief but carry the same label and date. Vehicle-transfer fees follow the ICT notification effective
14 Apr 2025 (not read by a human; labelled *Official source*).

## Environment requirements
- Node and npm (tested here with Node 22; the repo pins no engine). `npm ci` (or `npm install`).
- **To enable accounts / saving to an account:** build-time `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (and server-side
  `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, plus `SUPABASE_SERVICE_ROLE_KEY`, read by the server-only client but **missing from `.env.example`** — add it as a secret, never a build variable).
  If the VITE variables are missing at build time the client bundle has no Supabase config: the demo and guest journeys still work,
  accounts show as unavailable.
- **AI:** one of `GEMINI_API_KEY` or `QWEN_API_KEY`. Without a key the deterministic router still works.
- **Cloudflare:** I had no access to Cloudflare and did not change or verify any dashboard setting. Add the two `VITE_SUPABASE_*`
  values to the project's **build** variables (they are inlined at build time, so a runtime-only variable does not reach the browser)
  and redeploy.
- Previewing the built worker locally needs `wrangler`, which is **not** a repo dependency (`vite preview` fails without it).

## Start it
```bash
npm ci
cp .env.example .env          # optional for /demo; required for accounts and AI
npm run dev                   # http://localhost:8080
# production check
npm run build
npx wrangler dev --config .output/server/wrangler.json --port 4173   # http://127.0.0.1:4173
```

## Demo `/demo` in 60 seconds
Open `/demo` → **Reset demo** → tap **Ready** on two items (watch "2 of 10 … 20%") → point at *Official source* vs
*No confirmed amount* in Fees → show *Third-party tool · Google Maps* → **Mark step complete** → **Copy checklist** →
**Save as my journey** → **Reset demo**. Full script and wording rules: `docs/DEMO_SCRIPT.md`.

## Remaining limitations / unverified
- Live Supabase (auth, account saves, case tracker, admin) and live AI (router, Explain This, document checker): **not run**.
- Migrations never applied to a real Supabase project; SQL tests not re-run this pass.
- `/chat` intake, `/explain`, `/complaints` (signed in), `/admin`, PWA install/offline, accessibility audit, Lighthouse, real devices,
  Urdu/Roman Urdu review and RTL visual review: not done.
- Google Fonts never loaded in testing.
- With only *runtime* Supabase variables set (no VITE ones) the server believes it is configured while the browser does not; the
  first render may differ slightly on account pages. Set the VITE variables at build time.
- Header "Save journey" in `/demo` shows "Saved on this device" but writes only the demo's own record; "Save as my journey" is the
  one that adds it to My journeys.

## Files changed in this final pass
Modified: `AGENTS.md`, `README.md`, `docs/DEMO_SCRIPT.md`, `docs/FINALIZATION_NOTES.md`, `docs/STATUS.md`, `docs/TEAM_BRIEF.md`,
`raasta-ai-notebooklm-source.md`, `src/components/journey/JourneyWorkspace.tsx`, `src/hooks/useSession.ts`,
`src/integrations/supabase/auth-attacher.ts`, `src/lib/journey/index.ts`, `src/routes/__root.tsx`, `src/routes/auth.tsx`,
`src/routes/demo.tsx`.
New: `FINAL_HANDOVER.md`, `src/integrations/supabase/config.ts`, `src/lib/journey/autosave.ts`,
`src/lib/__tests__/autosave.test.ts`, `src/lib/__tests__/supabase-config.test.ts`.

## What is in the package
- `raasta-ai-final.zip` — full source incl. `.git` (history + your uncommitted work), excluding `node_modules`, `.output`, `.wrangler`, `.env*`.
- `raasta-ai-final.patch` — `git diff HEAD --binary` after `git add -A`; includes every new file. Apply to commit `1f96f27` with
  `git apply raasta-ai-final.patch`.
- `FINAL_HANDOVER.md` — this file.
