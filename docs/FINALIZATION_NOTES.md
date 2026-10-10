# Finalization pass — notes (10 Oct 2026)

## What changed
- **Trust labels:** "Verified" is shown only when a dated human check exists (`lastVerifiedAt`).
  Seed records that were hand-labelled `verified` without a date are now `official_source`.
  A data-integrity check fails if a record claims `verified` without a date. Admin-approved
  fee versions still become Verified with their real approval date. No amounts or dates were changed.
- **Third-party vs government:** new `linkOrigin()` classifies by URL. Google Maps is shown in its own
  "Helpful tools outside government" section, tagged "Third-party tool · Google Maps", with no
  official-source badge. Government links are tagged "Government site". The main next-step button
  prefers a government link.
- **Controls:** "Save as my journey" now reports success or failure; Copy checklist has a fallback and
  shows a real failure message; steps with no link (pay, track) have "Mark step complete";
  share/copy icon no longer causes a hydration mismatch.
- **Copy:** demo banner and landing hero no longer claim "verified".
- **Lint:** prettier-only fixes to `public/sw.js` and `vite.config.ts`.

## Checks (all run after the last code change)
tsc exit 0 · eslint 0 errors / 10 pre-existing warnings · vitest 172/172 · production build OK.

## Real-browser check (headless Chromium, dev server, placeholder Supabase env)
44/47 checks passed. Failures: 2 = Google Fonts unreachable in the sandbox; 1 = after "Start over" an
empty demo record is re-written about 1s later (suspected dev-mode double effect; unconfirmed in production).

## Known issues / decisions for the owner
- **Production builds need `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time**,
  otherwise even `/demo` shows "This page didn't load".
- NADRA fee structure and the ICT transfer notification have never been read by Raasta (no read date);
  consider "Needs confirmation" instead of "Official source". Passport 72/100-page rows came from the
  owner's brief but carry a 7 Oct read date.
- "Save as my journey" copies the autosaved state (600 ms debounce) so a very recent change can be missed.
- `docs/DEMO_SCRIPT.md` still calls fees "confirmed" — say "official source, not yet human-verified".

## Not verified
Live Supabase/auth/account saving, AI router, Explain This, document checker, admin pages, other routes,
Urdu/Roman Urdu rendering, real devices, screenshots were taken but not reviewed.

---
## Update — final pass (10 Oct 2026, later)
- **Reset race**: reproduced only under the dev server (React `StrictMode` re-runs effects). Production build never re-wrote the record
  (4 scenarios × 3 s). Root cause: autosave skipped only the *first* effect run. Fixed with a content-based `AutosaveGate`
  (`src/lib/journey/autosave.ts`); regression tests in `src/lib/__tests__/autosave.test.ts`.
- **Missing Supabase variables**: previously crashed *every* page on hydration (header + root layout called the client). Now guarded by
  `isSupabaseConfigured()`; `/demo` and guest journeys work, `/auth` says accounts are unavailable. No security behaviour changed.
- **"Save as my journey" could miss a change made <600 ms earlier**: fixed by flushing the pending autosave first.
- `docs/DEMO_SCRIPT.md` rewritten to match the app (official source ≠ human verified). Related claims in `TEAM_BRIEF.md`,
  `raasta-ai-notebooklm-source.md`, `AGENTS.md` corrected.
- Earlier "44/47" browser failures: 2 were Google Fonts being unreachable in the sandbox (environmental); 1 was the reset race above (real, dev-only).
