# Raasta AI — Source Document

*Use this as a source in NotebookLM. It's written to be read by both humans
and an AI summarizer — plain sections, no ambiguity, every claim stated once
clearly rather than scattered.*

## The problem

Government digital services in Pakistan are fragmented. A citizen renewing
their CNIC uses one NADRA process, a passport uses a completely different
DGIP system, a vehicle transfer in Islamabad goes through yet another
department (ICT Excise & Taxation) — each with its own fee structure,
document list, and office. Some steps are online, some aren't. Information
about fees and requirements is scattered across secondary sources that often
disagree with each other, and government fee pages are frequently hard to
access directly. A citizen with a routine problem — "my CNIC expired," "I
need to transfer a car I just bought" — has no single place to go for a
clear, trustworthy answer.

## The solution

Raasta AI ("raasta" = path/way in Urdu) is a bilingual (Urdu / Roman Urdu /
English) chat assistant that turns a citizen's civic-service problem into a
clear, sourced, step-by-step checklist — for one problem at a time, across
seven of Pakistan's most common bureaucratic processes, in one place.

**The core trust rule the entire product is built around:** every fact the
assistant states is either traceable to a verified official source, or
explicitly labeled unverified rather than presented as confirmed. The
product never guesses a fee or a requirement and states it as fact. Where
official sources genuinely conflict (this happened during real research for
this project — CNIC renewal fees, for example, have conflicting figures
across secondary sources with no accessible official fee table), the
assistant says so and points to the actual verification channel (a
department phone number) instead of picking whichever number seems most
likely.

## Services covered

1. CNIC renewal (NADRA)
2. Passport renewal (DGIP)
3. Vehicle ownership transfer, Islamabad Capital Territory (ICT Excise &
   Taxation)
4. Birth certificate (NADRA / union council)
5. NTN registration & tax filing
6. Police character certificate
7. Domicile certificate

## Core features

- **Grounded chat assistant** — a conversational interface where a citizen
  describes their problem in whichever language/script they're comfortable
  in, and receives a step-by-step roadmap: required documents, process
  steps, fees (with unverified fees clearly labeled as such, never
  presented as fact), and links to the actual official sources. If the
  assistant needs one more fact to give a correct answer (e.g., "has your
  CNIC already expired, or is it expiring soon?") it asks a clarifying
  question instead of guessing.
- **Document sanity-check** — an optional feature where a citizen can
  upload a photo of a document before heading to a government office. This
  is explicitly and only a visual legibility check (is the photo blurry? is
  a field blank or cut off?) — it never claims to verify a document's
  authenticity or legal validity, and that limitation is stated directly to
  the user every time a result is shown.
- **Complaints** — a citizen can log and track a complaint about a
  government service (a delay, a bribe demand, poor service at an office),
  keeping a dated record with status tracking, separate from — but
  alongside — the main assistant.
- **Accounts** — phone/email or Google sign-in, so a citizen's request
  history isn't lost between visits.
- Fully bilingual UI and responses; installable as a home-screen app (PWA)
  on a phone.

## Design philosophy

The product is deliberately designed to feel like a trustworthy, modern
government digital-service portal — closer to the polish of Singapore's
SingPass or Estonia's e-ID than a generic AI chatbot demo. Warm paper
background rather than sterile white, a single confident type family, a
restrained color system where a specific muted gold accent is used *only*
for citation/source cards (so it always reads as "this is a verified
citation," never anything else), and one deliberate visual signature: a
dotted "route" line connecting sequential steps in any checklist —
literally visualizing the "raasta" (path) concept the whole product is
named for.

## Technical architecture

- **Frontend:** React, TanStack Start (server-side rendering) and TanStack
  Router, Tailwind CSS, shadcn/ui components.
- **Backend:** Supabase — Postgres database with Row-Level Security,
  authentication, called via TanStack Start server functions (not a
  separate exposed API).
- **AI:** the assistant is provider-agnostic by design — it runs on either
  Google Gemini or Alibaba Cloud Qwen, auto-selected based on which API key
  is configured, with zero code changes needed to switch. Every AI response
  is requested as structured JSON and validated before it ever reaches a
  user — this is treated as load-bearing infrastructure, not an
  optimization, because a provider's JSON-mode guarantee is about output
  parsing as valid JSON, not about matching the app's expected schema.
- **Deployment target:** Cloudflare Workers (via Nitro).
- Database schema is fully migration-tracked: `profiles`, `conversations`,
  `messages`, `complaints`, and `complaint_events` tables, with Row-Level
  Security policies scoping every citizen to their own data.

## Who this is for

Any Pakistani citizen who needs to interact with government bureaucracy for
one of the covered services and doesn't already know the process — from
someone renewing an expired CNIC for the first time, to someone who just
bought a used car and doesn't know where to start on the transfer. The
product's tone and design assume a frustrated, time-pressured user, not a
tech-savvy one: plain language, short sentences, no jargon.

## Project status

Built for a hackathon (Alibaba Cloud / Bano Qabil AI Hackathon). Core chat
assistant, document sanity-check, complaints system, and authentication are
functionally complete and independently deployable. Known open items at
time of writing: an account page for browsing past saved conversations
(the database already supports this; the frontend page doesn't exist yet),
and tappable "common scenario" quick-reply chips in the chat interface
(currently free-text entry only).
