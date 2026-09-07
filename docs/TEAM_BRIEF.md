# Raasta AI — Team Brief
*Read this once, fully, before judging day. It's written so any teammate can
answer any question below without looking at the code.*

## The 30-second pitch (memorize this)

"Raasta AI turns a Pakistani citizen's civic-service problem — an expired
CNIC, a passport renewal, transferring a car — into a clear, step-by-step
checklist, in whichever language they're comfortable in: Urdu, Roman Urdu,
or English. The one rule the entire product is built around: every fact it
gives you is either sourced from an official government page, or it's
explicitly labeled unverified. It never guesses a fee and presents it as
real."

## The problem, in one concrete story

Someone's CNIC expires. They search online. One site says renewal costs
750 rupees. Another says 400. NADRA's own fee page is hard to access
directly. They don't know which number is true, and they don't know what
documents to bring. That's not hypothetical — it's what happened when we
tried to verify these exact fees ourselves while building this. That
experience is *why* the product is built the way it is: we hit the same
wall we're trying to solve for citizens.

## What's actually built (say this with confidence — it's all real, all working)

- **7 services**, not 3: CNIC renewal, passport renewal, vehicle ownership
  transfer (Islamabad), birth certificate, NTN tax registration, police
  character certificate, domicile certificate.
- **A grounded chat assistant.** The AI is only allowed to state facts that
  exist in our knowledge base for that service. If a fee isn't verified, it
  says so — it doesn't pick the most common secondary-source number and
  present it as fact.
- **Clarifying questions instead of guesses.** If the assistant needs one
  more fact (has your CNIC already expired, or is it expiring soon?) it
  asks, rather than assuming.
- **Document sanity-check.** Upload a photo of a document before going to
  the office — it tells you if it's blurry or a field is cut off. It
  explicitly does **not** and never will claim to verify authenticity. If a
  judge asks "so it checks if my CNIC is fake?" — the answer is no,
  deliberately, and that's said out loud in the product itself every time.
- **Complaints tracking** — log and track a complaint against a government
  service, separate from the assistant.
- **Real accounts** (email/Google sign-in) with saved request history.
- **Runs on either Google Gemini or Alibaba Cloud Qwen** — whichever API
  key is set, the app uses that provider automatically. No code change to
  switch.
- Installable as a home-screen app; fully bilingual UI (English/Urdu, with
  correct right-to-left rendering for Urdu script).

## The architecture, in plain English (for when someone asks "how'd you build this")

- **Frontend:** React, running through a framework called TanStack Start,
  which lets us render pages on the server for speed and SEO, and call
  backend functions directly from the frontend code without hand-writing a
  separate REST API.
- **Database:** Supabase (which is Postgres — a real relational database)
  with Row-Level Security. That means the database itself enforces that a
  user can only ever see their own conversations and complaints — it's not
  just the app's UI hiding other people's data, the database physically
  refuses the query. This is a real security property, not a cosmetic one.
- **AI:** every AI response is requested as strict JSON, and we validate it
  before it's ever shown to a user — because AI providers' "JSON mode"
  guarantees the output parses as JSON, not that it matches the shape our
  app expects. That validation step is the actual anti-hallucination
  mechanism, not a nice-to-have.
- **Rate limiting:** every AI-calling request is throttled per IP address
  in the database, so the app can't be spammed into running up our AI bill
  or exhausting quota mid-demo.
- **Deploys to Cloudflare Workers** — meaning it runs at the edge, close to
  users, and scales without us managing a server.

## If a judge asks a hard question — here's the honest answer

**"Why don't you have real-time official fee data for CNIC and vehicle
transfer?"**
"Because it doesn't exist accessibly right now. We tried — NADRA's fee page
blocks automated access, and secondary sources genuinely disagree with each
other (we found a real conflict: 750 vs 400 rupees for the same fee
tier). Rather than pick whichever number seemed more common and present it
as fact, we show it as unverified with the actual phone number to call. We
think that's the more honest — and more useful — answer than a confident
guess."

**"Why phone/Google login instead of CNIC-based verification like real
government apps use?"**
"That's a real tradeoff we made for hackathon timeline reasons — CNIC-based
identity verification needs integration with NADRA's own verification
systems, which wasn't feasible to build and verify in this timeframe. Email
and Google sign-in was the right scope for what we needed accounts for:
saving someone's request history, not verifying their legal identity."

**"Does the document checker verify my CNIC is real?"**
"No, deliberately. It's a visual legibility check only — is the photo
blurry, is a field cut off. We were very careful about this because a
'looks real' claim from an AI model is exactly the kind of overconfident
answer this whole product exists to avoid making."

**"Why Gemini/Qwen and not a custom-trained model?"**
"The task here is grounded retrieval and formatting, not open-ended
reasoning — a general-purpose model constrained by a strict system prompt
and a verified knowledge base is the right tool, and it's provider-
agnostic by design so we're not locked into one company's API."

**"What happens if the AI provider's API goes down during judging?"**
"We have a status page that checks this before we go on stage, and the app
degrades gracefully — the assistant returns a clear error rather than a
wrong answer, and every other feature (complaints, service directory,
accounts) works independently of it."

## What to actually click during the demo (see raasta-ai-demo-script.md for the full narrated version)

1. Open the app, pick a service or just type a problem in Roman Urdu.
2. Show it asking a clarifying question instead of guessing.
3. Show the answer: checklist, a **confirmed** fee next to an **unverified**
   one, and the source link.
4. Upload a document photo, show the disclaimer.
5. Show a complaint being logged.
6. Close on the honesty angle — that's the actual differentiator, lean into
   it, don't rush past it.

## Numbers worth having ready

- 7 government services covered
- 2 AI providers supported, auto-switching
- Every table in the database has row-level security — not just some
- Rate-limited, error-monitored, has a live status page
- Zero unverified facts ever silently upgraded to "confirmed" — checked
  across all 7 services, not just the original 3

## One instruction for everyone before Sept 7

Open `/status` on the deployed URL 10 minutes before you present. If
either row is red, fix it before you're in front of judges, not during.
