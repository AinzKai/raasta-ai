/**
 * Raasta AI verified knowledge base.
 *
 * Trust rule: every fee carries either a source OR `unverified: true`.
 * Never fill an unverified amount with a secondary-source guess — the UI
 * renders "Not confirmed yet" and shows the verification path instead.
 * Verification status reflects the research pass of 30 Aug 2026.
 */

export type Source = {
  title: string;
  url: string;
  verified: string; // human-readable date
  tier: 1 | 2;
};

export type Fee = {
  label: string;
  amountPkr: number | null;
  processingDays: number | null;
  unverified?: boolean;
  note?: string;
};

export type Step = {
  title: string;
  detail: string;
};

export type Service = {
  slug: string;
  name: string;
  urduName: string;
  agency: string;
  agencyFull: string;
  icon: "id" | "plane" | "car" | "file" | "receipt" | "shield" | "home" | "alert";
  summary: string;
  jurisdiction: string;
  online: "full" | "partial" | "offline";
  timeline: string;
  scenarios: string[];
  documents: string[];
  steps: Step[];
  fees: Fee[];
  sources: Source[];
  confidenceNote?: string;
  helpline?: string;
};

const nadraSite: Source = {
  title: "NADRA — Official site",
  url: "https://www.nadra.gov.pk",
  verified: "30 Aug 2026",
  tier: 1,
};

const nadraHelpline: Source = {
  title: "NADRA helpline (fee verification path)",
  url: "tel:+925111178610",
  verified: "30 Aug 2026",
  tier: 1,
};

const dgipFaq: Source = {
  title: "DGIP — Passport fee FAQ",
  url: "https://dgip.gov.pk/faq/faq.php",
  verified: "30 Aug 2026",
  tier: 1,
};

export const SERVICES: Service[] = [
  {
    slug: "cnic",
    name: "CNIC renewal",
    urduName: "شناختی کارڈ کی تجدید",
    agency: "NADRA",
    agencyFull: "National Database & Registration Authority",
    icon: "id",
    summary: "Renew, replace or update the address on a Computerised National Identity Card.",
    jurisdiction: "Pakistan (NADRA, federal — no provincial variation)",
    online: "partial",
    timeline: "Roughly 7–30 days depending on the fee tier you pay.",
    scenarios: [
      "My CNIC is expiring soon",
      "My CNIC has already expired",
      "I moved and need to change my address",
      "My card was lost or stolen",
    ],
    documents: [
      "Your existing CNIC (or the CNIC number if it is lost)",
      "A family member's CNIC number for verification",
      "Proof of your current address, if the address is changing",
    ],
    steps: [
      {
        title: "Start the renewal",
        detail:
          "Apply through the Pak-ID app or website, or walk in to a NADRA Registration Centre (NRC). Both routes end at the same biometric step.",
      },
      {
        title: "Book or take a token at an NRC",
        detail:
          "Online applicants still attend a centre for biometrics. Walk-ins take a token on arrival — go early in the day.",
      },
      {
        title: "Give biometrics and photo",
        detail: "Fingerprints and a fresh photograph are captured at the counter.",
      },
      {
        title: "Pay the fee for your tier",
        detail:
          "Normal, urgent and executive tiers differ only in processing speed. Confirm the current amount at the counter — see the note below.",
      },
      {
        title: "Track and collect",
        detail:
          "You get a 10-digit tracking ID. Check status by SMS to 8400, in the Pak-ID app, or on the helpline.",
      },
    ],
    fees: [
      { label: "Normal", amountPkr: null, processingDays: null, unverified: true },
      { label: "Urgent", amountPkr: null, processingDays: null, unverified: true },
      { label: "Executive", amountPkr: null, processingDays: null, unverified: true },
    ],
    sources: [nadraSite, nadraHelpline],
    confidenceNote:
      "Fee figures conflict across secondary sources as of Aug 2026, and NADRA's own fee page blocks automated checking. Raasta will not print a number it cannot source. Call 051-111-786-100 (or 1777 from a mobile) or ask at an NRC counter before you budget.",
    helpline: "051-111-786-100 · 1777 from mobile",
  },
  {
    slug: "passport",
    name: "Passport renewal",
    urduName: "پاسپورٹ کی تجدید",
    agency: "DGIP",
    agencyFull: "Directorate General of Immigration & Passports",
    icon: "plane",
    summary: "Renew an ordinary Pakistani passport, online or at a passport office.",
    jurisdiction: "Pakistan (DGIP, federal)",
    online: "full",
    timeline: "5 days on the urgent fee, about 21 days on the normal fee.",
    scenarios: [
      "My passport expires within a year",
      "My passport pages are full",
      "I need it urgently for travel",
    ],
    documents: [
      "Your current CNIC (must be valid — renew the CNIC first if it has expired)",
      "Your old passport",
      "Fee challan or online payment receipt",
    ],
    steps: [
      {
        title: "Check your CNIC is valid",
        detail:
          "An expired CNIC blocks the passport application. Fix that first if needed.",
      },
      {
        title: "Apply online or book an appointment",
        detail:
          "Use the DGIP online renewal portal, or book a slot at a Regional Passport Office.",
      },
      {
        title: "Pay the fee for your booklet and tier",
        detail:
          "Fees depend on page count, validity and speed. The 36-page 5-year amounts below are confirmed.",
      },
      {
        title: "Attend for biometrics and photo",
        detail:
          "Online renewals may skip the visit; first-time and irregular cases do not.",
      },
      {
        title: "Collect or receive by courier",
        detail: "Track with your token number on the DGIP tracking page.",
      },
    ],
    fees: [
      { label: "Normal — 36 pages, 5 years", amountPkr: 4500, processingDays: 21 },
      { label: "Urgent — 36 pages, 5 years", amountPkr: 7500, processingDays: 5 },
      {
        label: "Fast track — 36 pages, 5 years",
        amountPkr: null,
        processingDays: null,
        unverified: true,
        note: "Secondary sources suggest a figure, but it is not confirmed on an official page.",
      },
    ],
    sources: [
      dgipFaq,
      {
        title: "DGIP — Official site",
        url: "https://dgip.gov.pk",
        verified: "30 Aug 2026",
        tier: 1,
      },
    ],
    helpline: "051-111-344-777",
  },
  {
    slug: "vehicle-transfer",
    name: "Vehicle ownership transfer",
    urduName: "گاڑی کی ملکیت کی منتقلی",
    agency: "Islamabad Excise",
    agencyFull: "Excise & Taxation Department, Islamabad Capital Territory",
    icon: "car",
    summary: "Transfer a registered vehicle into a new owner's name in Islamabad.",
    jurisdiction: "Islamabad Capital Territory (rules differ in each province)",
    online: "partial",
    timeline: "Usually same day to a few days once both parties appear.",
    scenarios: [
      "I bought a used car in Islamabad",
      "I sold my car and want it off my name",
      "The vehicle is registered in another province",
    ],
    documents: [
      "Original registration book",
      "CNIC copies of both buyer and seller",
      "Signed transfer letter (TR form) from the seller",
      "Proof that token tax is paid up to date",
    ],
    steps: [
      {
        title: "Confirm the vehicle's record is clean",
        detail:
          "Check outstanding token tax, challans and any hold on the registration before you pay the seller.",
      },
      {
        title: "Get the seller's signed transfer papers",
        detail:
          "The seller signs the transfer form and hands over the original registration book.",
      },
      {
        title: "Both parties attend the Excise office",
        detail:
          "Biometric verification of buyer and seller is the step people most often miss.",
      },
      {
        title: "Pay the transfer fee and any arrears",
        detail:
          "Amounts vary by engine capacity and vehicle age — confirm at the counter.",
      },
      {
        title: "Collect the updated registration",
        detail: "Check the new owner's details on the book before you leave.",
      },
    ],
    fees: [
      {
        label: "Transfer fee (varies by engine capacity)",
        amountPkr: null,
        processingDays: null,
        unverified: true,
      },
      {
        label: "Outstanding token tax / challans",
        amountPkr: null,
        processingDays: null,
        unverified: true,
        note: "Depends entirely on the individual vehicle record.",
      },
    ],
    sources: [
      {
        title: "Excise & Taxation ICT — Official site",
        url: "https://excise.punjab.gov.pk",
        verified: "30 Aug 2026",
        tier: 2,
      },
    ],
    confidenceNote:
      "Islamabad transfer fees are banded by engine capacity and change with the annual budget. Raasta shows no amount until it can be read off an official schedule.",
  },
  {
    slug: "birth-certificate",
    name: "Birth certificate (NADRA / union council)",
    urduName: "پیدائش کا سرٹیفکیٹ",
    agency: "NADRA",
    agencyFull: "NADRA with the local union council",
    icon: "file",
    summary: "Register a birth and get a computerised birth certificate (CRC).",
    jurisdiction: "Registered at the union council, printed by NADRA",
    online: "partial",
    timeline: "Varies by union council; often a few days to a few weeks.",
    scenarios: ["Registering a newborn", "Getting a computerised copy of an old record"],
    documents: [
      "Hospital birth record or an affidavit if the birth was at home",
      "Both parents' CNICs",
      "Child registration certificate form from the union council",
    ],
    steps: [
      {
        title: "Register the birth at the union council",
        detail: "Registration is a local-government step, not a NADRA counter step.",
      },
      {
        title: "Apply for the computerised certificate",
        detail: "Once registered, NADRA can issue the CRC.",
      },
      { title: "Collect the certificate", detail: "Check the spelling of every name before you leave." },
    ],
    fees: [
      { label: "Union council registration", amountPkr: null, processingDays: null, unverified: true },
      { label: "Computerised certificate", amountPkr: null, processingDays: null, unverified: true },
    ],
    sources: [nadraSite],
    confidenceNote:
      "Union council charges vary by district and are not published on a single official page. Ask your union council directly.",
  },
  {
    slug: "ntn-tax-filing",
    name: "NTN registration & tax filing",
    urduName: "این ٹی این اور ٹیکس گوشوارہ",
    agency: "FBR",
    agencyFull: "Federal Board of Revenue",
    icon: "receipt",
    summary: "Register for an NTN and file an annual income tax return on IRIS.",
    jurisdiction: "Pakistan (FBR, federal)",
    online: "full",
    timeline: "NTN registration is usually same day; filing is open until the annual deadline.",
    scenarios: [
      "I want to become a filer",
      "I need an NTN for a bank or vehicle purchase",
      "I need to file this year's return",
    ],
    documents: [
      "CNIC",
      "A mobile number and email registered in your own name",
      "Bank account details and, if employed, your salary certificate",
    ],
    steps: [
      { title: "Create an IRIS account", detail: "Register on the FBR IRIS portal with your CNIC." },
      { title: "Complete registration", detail: "Your CNIC number becomes your NTN for individuals." },
      { title: "File the return and wealth statement", detail: "Both are required for individuals." },
      { title: "Check the Active Taxpayer List", detail: "Filer status updates on the weekly ATL." },
    ],
    fees: [
      { label: "NTN registration", amountPkr: 0, processingDays: 1, note: "Registration itself is free on IRIS." },
      { label: "Late-filing surcharge", amountPkr: null, processingDays: null, unverified: true },
    ],
    sources: [
      { title: "FBR — Official site", url: "https://www.fbr.gov.pk", verified: "30 Aug 2026", tier: 1 },
    ],
  },
  {
    slug: "police-character-certificate",
    name: "Police character certificate",
    urduName: "پولیس کریکٹر سرٹیفکیٹ",
    agency: "ICT Police",
    agencyFull: "Islamabad Capital Territory Police",
    icon: "shield",
    summary: "Get a police clearance certificate, usually needed for visas and jobs abroad.",
    jurisdiction: "Islamabad Capital Territory",
    online: "partial",
    timeline: "Commonly a few working days after verification.",
    scenarios: ["I need clearance for a visa", "My employer abroad asked for one"],
    documents: ["CNIC", "Passport copy", "Passport-size photographs", "Proof of Islamabad residence"],
    steps: [
      { title: "Apply at the district police office or online portal", detail: "Submit the form with your documents." },
      { title: "Police verification", detail: "Your local station verifies address and record." },
      { title: "Collect the certificate", detail: "Check the validity period printed on it." },
    ],
    fees: [{ label: "Certificate fee", amountPkr: null, processingDays: null, unverified: true }],
    sources: [
      { title: "Islamabad Police — Official site", url: "https://islamabadpolice.gov.pk", verified: "30 Aug 2026", tier: 2 },
    ],
    confidenceNote: "Charges differ by district and are not published centrally.",
  },
  {
    slug: "domicile",
    name: "Domicile certificate",
    urduName: "ڈومیسائل سرٹیفکیٹ",
    agency: "Deputy Commissioner",
    agencyFull: "Office of the Deputy Commissioner, ICT",
    icon: "home",
    summary: "Prove your province or territory of residence for jobs and admissions.",
    jurisdiction: "Issued by the district administration where you reside",
    online: "offline",
    timeline: "Typically 1–3 weeks including verification.",
    scenarios: ["Applying for a government job", "University admission on a regional quota"],
    documents: [
      "CNIC and father's CNIC",
      "Proof of residence for the required number of years",
      "Educational certificates",
      "Affidavit on stamp paper",
    ],
    steps: [
      { title: "Collect and submit the form", detail: "Available at the DC office." },
      { title: "Attach residence proof", detail: "Utility bills, school records or property papers." },
      { title: "Verification", detail: "The office verifies residence before issuing." },
      { title: "Collect the domicile", detail: "Keep attested copies — most employers ask for them." },
    ],
    fees: [{ label: "Domicile fee", amountPkr: null, processingDays: null, unverified: true }],
    sources: [
      { title: "ICT Administration", url: "https://ictadministration.gov.pk", verified: "30 Aug 2026", tier: 2 },
    ],
    confidenceNote: "Stamp and processing charges vary by district office.",
  },
];

export const PRIMARY_SLUGS = ["cnic", "passport", "vehicle-transfer"];

export function getService(slug: string | undefined | null): Service | undefined {
  if (!slug) return undefined;
  return SERVICES.find((s) => s.slug === slug);
}

export const AGENCIES = Array.from(new Set(SERVICES.map((s) => s.agency)));

export const DEPARTMENTS = [
  "NADRA",
  "DGIP (Passports)",
  "Excise & Taxation",
  "FBR",
  "Police",
  "District administration",
  "Utility company (electricity, gas, water)",
  "Other",
];

export const COMPLAINT_CATEGORIES = [
  "Long delay",
  "Asked for a bribe",
  "Rude or unhelpful staff",
  "Wrong information given",
  "Online system not working",
  "Other",
];
