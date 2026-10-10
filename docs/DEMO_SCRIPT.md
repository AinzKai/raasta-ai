# Raasta — Demo Script

A walkthrough for a live demo of `/demo` (no account needed). It is written to
match what the app actually shows today. **Say only what the screen supports** —
the product's whole claim is honesty about how well each fact is backed.

## The four things a fact can be (use these words exactly)

| On screen | What it means | What you may say |
|---|---|---|
| **Verified** (with a date) | A named person checked it against the official source on that date. | "A person checked this on *the date shown*." |
| **Official source** | It comes from, or is linked from, an official government page. **No dated human check is on file.** | "This follows an official source. Nobody has signed off on it with a date yet, so confirm at the counter before you pay." |
| **Needs confirmation** | The source is incomplete, secondary, or may have changed. | "We're not sure — confirm with the office." |
| **Not currently verified** | We hold no confirmed amount or detail. The app shows *No confirmed amount*, never a guess. | "We refuse to guess here." |

Separately, **third-party tools** (Google Maps) are labelled *Third-party tool · Google Maps*
and sit under "Helpful tools outside government". They are conveniences, not sources.
Links on `gov.pk` carry a *Government site* tag.

### Do not say
- ~~"Verified fee"~~ / ~~"confirmed fee"~~ / ~~"recently verified"~~. **No record in the app currently carries a dated human
  verification**, so nothing on screen reads plain *Verified*. The honest word is **official source**.
- ~~"Google Maps is official"~~ or ~~"directions are verified"~~. Only the *address* comes from the official page; the map tool is Google's.
- ~~"Raasta files it for you"~~. Raasta is an independent guide; it cannot submit anything to any government system.
- ~~"The AI checks your documents are real"~~. The photo check is visual only.

## Before you go on stage (2 minutes)

1. Open the deployed `/demo`. If you see "This page didn't load", the build is missing its Supabase settings — see
   `FINAL_HANDOVER.md` (the demo should now render anyway; account features will say they're unavailable).
2. Click **Reset demo** so you start from 0% ready.
3. Know the answer to "where did the CNIC fee come from?" (see *Hard questions*).

## The hook (15 seconds)

"You bought a used car in Islamabad and want it in your name. You search online and find conflicting pages, old fee
ranges and forms. You don't know what to bring, what it costs, or which source to trust. Raasta turns that goal into a
step-by-step journey and tells you, for every fact, *how well it is backed*."

## The demo flow (`/demo`, vehicle transfer in Islamabad)

1. **Open `/demo`.** Point at the banner: *real sources, every fact labelled by how well it is backed; no account; changes stay in
   this browser.* Nothing is faked: the same knowledge layer and journey engine as the real product.
2. **The route.** "Vehicle ownership transfer · Islamabad Excise." Step 2 of 5, *Prepare your documents*, is highlighted.
   The route tells you what to do next, not just a list.
3. **The primary action.** "Download the official transfer form" — tagged **Official source** and **Government site**
   (it is a `ictadministration.gov.pk` link).
4. **Checklist and readiness.** Under *What you need*, tap **Ready** on a couple of items.
   Readiness updates live: *"2 of 10 required items ready"* → 20%. Say: "This number is arithmetic —
   ready ÷ required — not an AI estimate. **Needs attention** does not count as ready."
   Two items carry **Needs confirmation** (original registration book; token tax and dues) — say why they differ.
5. **Fees.** Show *Car — up to 1000 cc PKR 2,750*, *1000–1800 cc PKR 5,500*, *over 1800 cc PKR 11,000*, each **Official source**.
   Read the line above the table: *"These amounts follow an official notification. No dated check by a person is on file yet,
   so confirm at the counter before you pay."* Then the honest part: **Advance tax** and **outstanding token tax / challans**
   show *No confirmed amount* / **Not currently verified**, because the official page publishes no amount.
   Also point out *Good to know*: the ICT page still shows an older PKR 1,200–3,000 range; Raasta uses the revised fees
   (effective 14 April 2025) instead.
6. **Third-party vs government.** Scroll to *Official actions* (three government links, each tagged **Government site**), then
   *Helpful tools outside government*: "Get directions to the office — **Third-party tool · Google Maps**. Opens Google Maps.
   This is not a government site; the address itself comes from the official page." Say: "We never let a map link look official."
7. **Where to go.** The office, address and hours come from the official ICT page. The phone number says
   *"Phone number not currently verified"* — we show the gap instead of inventing a number.
8. **Mark a step done.** Click **Mark step complete** — the route advances (*2 of 5 steps*).
9. **Copy checklist.** Click **Copy checklist** → button turns to *Copied*. (If a browser blocks it, you'll see
   *"Couldn't copy on this browser. Nothing was copied."* — it never says Copied when it didn't.)
10. **Keep it.** Click **Save as my journey** → *"Saved on this device · My journeys"*. Without an account it is stored in this
    browser only; with an account it says *Saved to your account*. If storage is blocked you get a failure message, not a success.
11. **Reset.** Click **Reset demo** to return to 0% for the next person.

Optional beats: **Check a document photo** (visual legibility only — the app says it cannot confirm authenticity);
`/explain` (Explain This — numbers and links are guarded against invention); `/complaints` (the Case Tracker keeps *your own record*
and states "Not connected to any government system").

> The photo check, Explain This and the AI router have **not** been exercised against a live model in testing. Do not demo
> them live unless you have tried them with your API key first.

## Hard questions (honest answers)

**"Is this fee verified?"**
"It follows an official source, labelled *Official source*. We have not recorded a dated human verification, so we say so and
tell users to confirm at the counter."

**"Where does the CNIC fee come from?"** (open `/services/cnic`; its Fees card currently shows the same *"follow an official notification"* line, which overstates this one — see the decision note in `FINAL_HANDOVER.md`)
"The CNIC renewal amounts (400 / 1,150 / 2,150 for the standard card, and 750 / 1,500 / 2,500 for Smart CNIC) come from NADRA's
fee structure as supplied by our team and were corroborated by news reports on 7 Oct 2026. Raasta itself has not read NADRA's fee
page — it blocks automated access — so treat these as **unconfirmed by us** and confirm with NADRA. Fees for a first CNIC, a lost
CNIC and changes show *No confirmed amount*." *(Owner: see the decision note in `FINAL_HANDOVER.md` — these rows are currently badged
"Official source".)*

**"What about the passport fee?"**
"The 36-page rows were read from the official DGI&P page on 7 Oct 2026; the 72- and 100-page rows came from our team's brief. All
are labelled *Official source* with that read date — a read date, not a human verification."

**"Does it check my document is real?"**
"No. It only says whether the photo is readable or cropped, and it states that it cannot confirm authenticity."

**"Is Google Maps official?"**
"No. It is labelled *Third-party tool* and sits outside the official-actions list. Only the address is from the government page."

## Tone

Calm, direct, a little frustrated on the citizen's behalf — not salesy. The strongest material is what the product *refuses* to fake.
Lean into the *No confirmed amount* rows; they are the differentiator, not a limitation.
