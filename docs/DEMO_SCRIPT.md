# Raasta AI — Demo Script

*A walkthrough script for a live demo, or as a second NotebookLM source to
help it generate a narrated video/audio overview with a real story arc
instead of a dry feature list.*

## The hook (15 seconds)

"Say your CNIC just expired. You go online. One site says the renewal fee
is 750 rupees. Another says 400. NADRA's own fee page won't load for you.
You don't know which number is real, and you don't know what to bring with
you. That's not a hypothetical — that's what happened when we tried to
verify these fees ourselves while building this. Raasta AI exists because
that shouldn't be how bureaucracy works."

## The demo flow

**1. Landing.** Open the app. Point out the plain-language framing — this
isn't styled like a chatbot toy, it's styled like something you'd trust
with a government form.

**2. Start a request.** Pick a service (or just type the problem directly
in plain Roman Urdu or English — the assistant understands both). Say
something a real citizen would actually type: "mera CNIC expire ho gaya
hai" or "I just bought a used car, what do I need to do."

**3. Watch it ask, not guess.** If the assistant needs one more fact to
answer correctly — has the CNIC already expired, or is it expiring soon; is
the car under or over 5 years old (this changes whether advance tax
applies) — it asks, instead of assuming. This is the moment to say out
loud: "Notice it didn't just guess an answer to sound confident. That's
deliberate."

**4. The answer.** Walk through what comes back: a plain-language
checklist, the required documents, and — this is the important part — the
fee table. Point at a confirmed fee (Passport renewal: PKR 4,500, sourced
directly from DGIP) next to an unverified one (CNIC fees, explicitly marked
"not confirmed" rather than showing a number someone might act on). Say:
"This is the whole point. It would be easy to just put a number here. We
didn't, because we couldn't verify it, and pretending otherwise is worse
than saying nothing."

**5. Sources.** Show the source citation on the answer — an official
government link, not a random blog. Every fact traces back to something
real.

**6. Document sanity-check (optional but a strong beat).** Upload a photo
of a document. Show the result: it tells you if the photo is legible or a
field is cut off — and shows the disclaimer that this is *not* an
authenticity check. "We're very deliberate about what this feature does and
doesn't claim. It saves someone a wasted trip to the office because their
photo was blurry — it does not, and never will, tell you a document is
real."

**7. Complaints.** Switch to the complaints feature. Log a complaint about
a delay or bad service, show it getting a tracked status. "The other half
of the problem: when the system fails you, there's usually nowhere
consistent to even record that it happened."

**8. Close.** "Seven services today — CNIC, passport, vehicle transfer,
birth certificate, tax filing, police character certificate, domicile.
One place, in the citizen's own language, that never pretends to know
something it doesn't."

## Lines worth keeping verbatim

- "The product's entire trust claim is one sentence: every fact is either
  sourced, or it's labeled unverified. Never both."
- "We didn't pick the number more sites agreed on. We picked the honest
  answer, even when the honest answer is 'call this number and ask.'"
- "This is meant to work whether you type in English, Roman Urdu, or Urdu
  script — because that's actually how people write when they're stressed
  about a government office, not how a demo script writes."

## Tone notes for narration

Calm, direct, a little frustrated on the citizen's behalf — not salesy.
The strongest material here is the honesty about what the product refuses
to fake (fees it can't verify, document authenticity it can't check) —
lean into that rather than glossing over it. That refusal is the actual
differentiator, not a limitation to downplay.
