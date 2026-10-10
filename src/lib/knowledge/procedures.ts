import type {
  JurisdictionId,
  Localized,
  ProcedureStep,
  StepKind,
  TimelineRecord,
  VerificationStatus,
  WarningRecord,
} from "./types";

type Ctx = {
  serviceId: string;
  jurisdictionId: JurisdictionId;
  sourceId: string | null;
  status: VerificationStatus;
  basis: string;
  checked?: string | null;
};

function stepper(c: Ctx) {
  const prefix = `${c.serviceId}.${c.jurisdictionId}`;
  let order = 0;
  return (
    key: string,
    kind: StepKind,
    title: Localized,
    detail: Localized,
    extra: {
      actionKeys?: string[];
      guidance?: boolean;
      status?: VerificationStatus;
      sourceId?: string | null;
      basis?: string;
    } = {},
  ): ProcedureStep => ({
    id: `${prefix}.step.${key}`,
    serviceId: c.serviceId,
    jurisdictionId: c.jurisdictionId,
    order: ++order,
    kind,
    title,
    detail,
    ...(extra.actionKeys
      ? { actionIds: extra.actionKeys.map((a) => `${prefix}.action.${a}`) }
      : {}),
    ...(extra.guidance ? { guidance: true } : {}),
    sourceId: extra.sourceId === undefined ? c.sourceId : extra.sourceId,
    verificationStatus: extra.guidance ? "official_source" : (extra.status ?? c.status),
    lastCheckedAt: c.checked ?? null,
    lastVerifiedAt: null,
    basis: extra.basis ?? c.basis,
  });
}

// ----------------------------------------------------- Vehicle transfer ------

const vtCtx: Ctx = {
  serviceId: "vehicle-transfer",
  jurisdictionId: "ict",
  sourceId: "ict-admin.vehicle-transfer",
  status: "official_source",
  basis: "Steps from the official ICT Administration vehicle transfer page, read 7 Oct 2026.",
  checked: "2026-10-07",
};
const vt = stepper(vtCtx);
const teamBasis = {
  status: "needs_confirmation" as const,
  basis:
    "Compiled by the Raasta team; not stated on the official page. Confirm with Islamabad Excise.",
};

const VEHICLE_STEPS: ProcedureStep[] = [
  vt(
    "confirm",
    "confirm",
    {
      en: "Confirm the vehicle is registered in Islamabad",
      ur: "تصدیق کریں کہ گاڑی اسلام آباد میں رجسٹرڈ ہے",
      roman: "Tasdeeq karein ke gaari Islamabad mein registered hai",
    },
    {
      en: "This route is for a vehicle already registered with Excise & Taxation, Islamabad. If it is registered in another district, extra documents apply.",
      ur: "یہ راستہ اس گاڑی کے لیے ہے جو پہلے سے ایکسائز اینڈ ٹیکسیشن اسلام آباد میں رجسٹرڈ ہے۔ کسی اور ضلع میں رجسٹرڈ ہو تو اضافی دستاویزات درکار ہیں۔",
      roman:
        "Yeh raasta us gaari ke liye hai jo pehle se Excise & Taxation Islamabad mein registered hai. Kisi aur zile mein registered ho to additional documents darkaar hain.",
    },
  ),
  vt(
    "prepare",
    "prepare",
    {
      en: "Prepare your documents",
      ur: "اپنی دستاویزات تیار کریں",
      roman: "Apne documents tayyar karein",
    },
    {
      en: "Gather the application, CNIC copies, forms and affidavit. Download the official transfer form and print it on legal paper.",
      ur: "درخواست، شناختی کارڈ کی کاپیاں، فارم اور حلف نامہ جمع کریں۔ سرکاری ٹرانسفر فارم ڈاؤن لوڈ کر کے لیگل کاغذ پر پرنٹ کریں۔",
      roman:
        "Darkhwast, CNIC ki copies, forms aur halaf nama jama karein. Official transfer form download kar ke legal kaghaz par print karein.",
    },
    { actionKeys: ["transfer-form", "service-page"] },
  ),
  vt(
    "verify",
    "verify",
    {
      en: "Check token tax and any dues",
      ur: "ٹوکن ٹیکس اور بقایاجات چیک کریں",
      roman: "Token tax aur baqayajaat check karein",
    },
    {
      en: "Before you pay the seller, check for unpaid token tax, challans or holds on the vehicle. Islamabad's City Islamabad app offers token tax payment.",
      ur: "فروخت کنندہ کو ادائیگی سے پہلے غیر ادا شدہ ٹوکن ٹیکس، چالان یا گاڑی پر کسی پابندی کی جانچ کریں۔ سٹی اسلام آباد ایپ پر ٹوکن ٹیکس ادا کیا جا سکتا ہے۔",
      roman:
        "Seller ko payment se pehle unpaid token tax, challan ya gaari par kisi pabandi ki jaanch karein. City Islamabad app par token tax ada kiya ja sakta hai.",
    },
    { actionKeys: ["excise-site"], ...teamBasis },
  ),
  vt(
    "act",
    "act",
    {
      en: "Pay the fee and get your documents verified",
      ur: "فیس ادا کریں اور دستاویزات کی تصدیق کروائیں",
      roman: "Fee ada karein aur documents ki tasdeeq karwayein",
    },
    {
      en: "Deposit the fee at the designated Excise window, have your documents verified by the Excise Inspector, then collect the receipt from the Data Entry Operator.",
      ur: "مقررہ ایکسائز کھڑکی پر فیس جمع کروائیں، ایکسائز انسپکٹر سے دستاویزات کی تصدیق کروائیں، پھر ڈیٹا انٹری آپریٹر سے رسید حاصل کریں۔",
      roman:
        "Muqarrara Excise window par fee jama karwayein, Excise Inspector se documents ki tasdeeq karwayein, phir Data Entry Operator se raseed hasil karein.",
    },
    { actionKeys: ["office", "excise-site"] },
  ),
  vt(
    "track",
    "track",
    {
      en: "Check your updated registration record",
      ur: "اپنا اپ ڈیٹ شدہ رجسٹریشن ریکارڈ چیک کریں",
      roman: "Apna update shuda registration record check karein",
    },
    {
      en: "Before you leave, check that the new owner's details are correct, and keep the receipt.",
      ur: "جانے سے پہلے دیکھ لیں کہ نئے مالک کی تفصیلات درست ہیں، اور رسید سنبھال کر رکھیں۔",
      roman:
        "Jaane se pehle dekh lein ke naye malik ki tafseelat durust hain, aur raseed sambhal kar rakhein.",
    },
    teamBasis,
  ),
];

// --------------------------------------------------------------- CNIC -------

const cnCtx: Ctx = {
  serviceId: "cnic",
  jurisdictionId: "federal",
  sourceId: "nadra.site",
  status: "needs_confirmation",
  basis: "Compiled in the Raasta research pass of 30 Aug 2026; confirm with NADRA.",
  checked: "2026-08-30",
};
const cn = stepper(cnCtx);

const CNIC_STEPS: ProcedureStep[] = [
  cn(
    "confirm",
    "confirm",
    {
      en: "Tell us what you need",
      ur: "بتائیں آپ کو کیا چاہیے",
      roman: "Bataein aapko kya chahiye",
    },
    {
      en: "Renewing, replacing a lost card, changing details, or a first CNIC — the fee and checklist differ.",
      ur: "تجدید، گمشدہ کارڈ کی تبدیلی، تفصیلات میں تبدیلی یا پہلا شناختی کارڈ — فیس اور فہرست مختلف ہیں۔",
      roman:
        "Renewal, gum shuda card ki replacement, details mein tabdeeli ya pehla CNIC — fee aur checklist mukhtalif hain.",
    },
    { guidance: true },
  ),
  cn(
    "prepare",
    "prepare",
    {
      en: "Gather your documents",
      ur: "اپنی دستاویزات جمع کریں",
      roman: "Apne documents jama karein",
    },
    {
      en: "Keep your current CNIC (or its number) and a family member's CNIC number ready.",
      ur: "اپنا موجودہ شناختی کارڈ (یا اس کا نمبر) اور خاندان کے کسی فرد کا شناختی کارڈ نمبر تیار رکھیں۔",
      roman:
        "Apna maujooda CNIC (ya us ka number) aur khandan ke kisi fard ka CNIC number tayyar rakhein.",
    },
  ),
  cn(
    "verify",
    "verify",
    {
      en: "Choose a processing speed",
      ur: "پروسیسنگ کی رفتار منتخب کریں",
      roman: "Processing ki raftaar chunein",
    },
    {
      en: "Normal, urgent and executive differ in price and processing time. Pick the one that matches your deadline.",
      ur: "عام، فوری اور ایگزیکٹو قیمت اور وقت میں مختلف ہیں۔ اپنی ضرورت کے مطابق منتخب کریں۔",
      roman:
        "Normal, urgent aur executive qeemat aur waqt mein mukhtalif hain. Apni zaroorat ke mutabiq chunein.",
    },
    {
      sourceId: "nadra.fee-structure",
      status: "official_source",
      basis: "Fee tiers from NADRA's fee structure (owner's brief).",
    },
  ),
  cn(
    "act",
    "act",
    {
      en: "Apply with PakID or at a NADRA Registration Centre",
      ur: "پاک آئی ڈی یا نادرا رجسٹریشن سینٹر پر درخواست دیں",
      roman: "PakID ya NADRA Registration Centre par darkhwast dein",
    },
    {
      en: "PakID is NADRA's official mobile app. Biometric verification or a photograph may still need a NADRA Registration Centre, depending on your case.",
      ur: "پاک آئی ڈی نادرا کی سرکاری موبائل ایپ ہے۔ آپ کے کیس کے مطابق بائیومیٹرک تصدیق یا تصویر کے لیے نادرا رجسٹریشن سینٹر جانا پڑ سکتا ہے۔",
      roman:
        "PakID NADRA ki official mobile app hai. Aap ke case ke mutabiq biometric tasdeeq ya tasweer ke liye NADRA Registration Centre jaana par sakta hai.",
    },
    {
      actionKeys: ["nadra-site", "helpline"],
      status: "official_source",
      basis: "NADRA's renewal flow as described in the owner's brief.",
    },
  ),
  cn(
    "track",
    "track",
    {
      en: "Track your application",
      ur: "اپنی درخواست ٹریک کریں",
      roman: "Apni darkhwast track karein",
    },
    {
      en: "You get a tracking ID. Check status in the PakID app, by SMS, or on the helpline.",
      ur: "آپ کو ٹریکنگ آئی ڈی ملتی ہے۔ حالت پاک آئی ڈی ایپ، ایس ایم ایس یا ہیلپ لائن پر چیک کریں۔",
      roman: "Aapko tracking ID milti hai. Status PakID app, SMS ya helpline par check karein.",
    },
    { actionKeys: ["helpline"] },
  ),
];

// ------------------------------------------------------------- Passport -----

const ppCtx: Ctx = {
  serviceId: "passport",
  jurisdictionId: "federal",
  sourceId: "dgip.ordinary-passport",
  status: "official_source",
  basis: "DGI&P ordinary-passport page and FAQ, read 7 Oct 2026.",
  checked: "2026-10-07",
};
const pp = stepper(ppCtx);

const PASSPORT_STEPS: ProcedureStep[] = [
  pp(
    "confirm",
    "confirm",
    {
      en: "Make sure your CNIC is valid",
      ur: "یقینی بنائیں کہ آپ کا شناختی کارڈ درست ہے",
      roman: "Yaqeeni banayein ke aap ka CNIC valid hai",
    },
    {
      en: "DGI&P asks for an original valid CNIC/NICOP. If yours has expired, renew it first.",
      ur: "ڈی جی آئی اینڈ پی اصل درست شناختی کارڈ/نائیکوپ مانگتا ہے۔ اگر آپ کا ختم ہو چکا ہے تو پہلے اسے renew کروائیں۔",
      roman:
        "DGI&P asal valid CNIC/NICOP maangta hai. Agar aap ka expire ho chuka hai to pehle renew karwayein.",
    },
  ),
  pp(
    "prepare",
    "prepare",
    {
      en: "Prepare your documents",
      ur: "اپنی دستاویزات تیار کریں",
      roman: "Apne documents tayyar karein",
    },
    {
      en: "Original CNIC and previous passport with photocopies. Government employees may also need an NOC.",
      ur: "اصل شناختی کارڈ اور سابقہ پاسپورٹ فوٹو کاپیوں کے ساتھ۔ سرکاری ملازمین کو این او سی بھی درکار ہو سکتا ہے۔",
      roman:
        "Asal CNIC aur sabqa passport photocopies ke saath. Sarkari mulazimeen ko NOC bhi darkaar ho sakta hai.",
    },
  ),
  pp(
    "verify",
    "verify",
    {
      en: "Choose pages, validity and speed",
      ur: "صفحات، مدت اور رفتار منتخب کریں",
      roman: "Pages, muddat aur raftaar chunein",
    },
    {
      en: "Fees depend on the booklet (36, 72 or 100 pages), validity (5 or 10 years) and speed (normal, urgent or fast track).",
      ur: "فیس کتابچے (36، 72 یا 100 صفحات)، مدت (5 یا 10 سال) اور رفتار (عام، فوری یا فاسٹ ٹریک) پر منحصر ہے۔",
      roman:
        "Fee booklet (36, 72 ya 100 pages), muddat (5 ya 10 saal) aur raftaar (normal, urgent ya fast track) par munhasir hai.",
    },
  ),
  pp(
    "act",
    "act",
    {
      en: "Apply online or at a passport office",
      ur: "آن لائن یا پاسپورٹ آفس میں درخواست دیں",
      roman: "Online ya passport office mein darkhwast dein",
    },
    {
      en: "DGI&P offers online renewal for inland and overseas Pakistanis, but not every passport category can be handled online. Pay the fee, then follow the portal or office instructions.",
      ur: "ڈی جی آئی اینڈ پی ملک کے اندر اور بیرون ملک پاکستانیوں کے لیے آن لائن تجدید فراہم کرتا ہے، مگر ہر پاسپورٹ کیٹیگری آن لائن نہیں ہو سکتی۔ فیس ادا کریں، پھر پورٹل یا دفتر کی ہدایات پر عمل کریں۔",
      roman:
        "DGI&P inland aur overseas Pakistanion ke liye online renewal deta hai, magar har passport category online nahi ho sakti. Fee ada karein, phir portal ya office ki hidayat par amal karein.",
    },
    { actionKeys: ["online-renewal", "fees-page", "helpline"] },
  ),
  pp(
    "track",
    "track",
    {
      en: "Collect or receive your passport",
      ur: "اپنا پاسپورٹ وصول کریں",
      roman: "Apna passport wasool karein",
    },
    {
      en: "Published processing targets are working days and do not include courier delivery. Collect it from the office where you applied.",
      ur: "شائع شدہ مدت کام کے دنوں میں ہے اور کوریئر ڈیلیوری شامل نہیں۔ اسی دفتر سے وصول کریں جہاں درخواست دی تھی۔",
      roman:
        "Shaya shuda muddat kaam ke dino mein hai aur courier delivery shamil nahi. Usi office se wasool karein jahan darkhwast di thi.",
    },
    { sourceId: "dgip.faq", basis: "DGI&P FAQ, read 7 Oct 2026." },
  ),
];

// ----------------------------------------------- Lightweight legacy services --

function legacySteps(
  serviceId: string,
  jurisdictionId: JurisdictionId,
  sourceId: string,
  steps: Array<[string, string]>,
): ProcedureStep[] {
  const make = stepper({
    serviceId,
    jurisdictionId,
    sourceId,
    status: "needs_confirmation",
    basis: "Compiled in the Raasta research pass of 30 Aug 2026; confirm with the department.",
    checked: "2026-08-30",
  });
  return [
    make(
      "prepare",
      "prepare",
      { en: "Gather your documents" },
      { en: "Collect everything on the checklist before you set out." },
      { guidance: true },
    ),
    ...steps.map(([title, detail], i) =>
      make(`s${i + 1}`, i === steps.length - 1 ? "track" : "act", { en: title }, { en: detail }),
    ),
  ];
}

const LEGACY_STEPS: ProcedureStep[] = [
  ...legacySteps("birth-certificate", "federal", "nadra.site", [
    [
      "Register the birth at the union council",
      "Registration is a local-government step, not a NADRA counter step.",
    ],
    ["Apply for the computerised certificate", "Once registered, NADRA can issue the CRC."],
    ["Collect the certificate", "Check the spelling of every name before you leave."],
  ]),
  ...legacySteps("ntn-tax-filing", "federal", "fbr.site", [
    ["Create an IRIS account", "Register on the FBR IRIS portal with your CNIC."],
    ["Complete registration", "Your CNIC number becomes your NTN for individuals."],
    ["File the return and wealth statement", "Both are required for individuals."],
    ["Check the Active Taxpayer List", "Filer status updates on the weekly list."],
  ]),
  ...legacySteps("police-character-certificate", "ict", "ict-police.site", [
    [
      "Apply at the district police office or online portal",
      "Submit the form with your documents.",
    ],
    ["Police verification", "Your local station verifies address and record."],
    ["Collect the certificate", "Check the validity period printed on it."],
  ]),
  ...legacySteps("domicile", "ict", "ict-admin.site", [
    ["Collect and submit the form", "Available at the Deputy Commissioner's office."],
    ["Attach residence proof", "Utility bills, school records or property papers."],
    ["Verification", "The office verifies residence before issuing."],
    ["Collect the domicile", "Keep attested copies — most employers ask for them."],
  ]),
];

export const PROCEDURE_STEPS: ProcedureStep[] = [
  ...VEHICLE_STEPS,
  ...CNIC_STEPS,
  ...PASSPORT_STEPS,
  ...LEGACY_STEPS,
];

// ------------------------------------------------------------- Warnings -----

export const WARNINGS: WarningRecord[] = [
  {
    id: "vehicle-transfer.ict.warning.advance-tax",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    tone: "caution",
    text: {
      en: "Advance tax applies to vehicles less than five years from their first registration in Pakistan, with 10% depreciation per year. The official page does not publish the amount.",
      ur: "پاکستان میں پہلی رجسٹریشن سے پانچ سال سے کم پرانی گاڑیوں پر ایڈوانس ٹیکس لگتا ہے، اور ہر سال 10 فیصد فرسودگی دی جاتی ہے۔ سرکاری صفحے پر رقم شائع نہیں۔",
      roman:
        "Pakistan mein pehli registration se paanch saal se kam purani gaariyon par advance tax lagta hai, aur har saal 10 percent depreciation di jaati hai. Official page par raqam shaya nahi.",
    },
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    lastVerifiedAt: null,
    basis: "Note on the official ICT Administration vehicle transfer page, read 7 Oct 2026.",
  },
  {
    id: "vehicle-transfer.ict.warning.older-fee-page",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    tone: "info",
    text: {
      en: "The ICT Administration service page still shows an older fee range of PKR 1,200–3,000. Raasta uses the revised fees notified effective 14 April 2025 instead.",
      ur: "آئی سی ٹی انتظامیہ کے سروس صفحے پر اب بھی پرانی فیس (1,200 سے 3,000 روپے) درج ہے۔ راستہ 14 اپریل 2025 سے نافذ نئی فیس استعمال کرتا ہے۔",
      roman:
        "ICT Administration ke service page par ab bhi purani fee (1,200 se 3,000 rupay) darj hai. Raasta 14 April 2025 se nafiz nayi fee istemal karta hai.",
    },
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    lastVerifiedAt: null,
    basis:
      "Conflict between the service page and the newer notification; the newer notification wins.",
  },
  {
    id: "vehicle-transfer.ict.warning.other-district",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    tone: "caution",
    text: {
      en: "If the vehicle was registered in another district, you need extra documents, including an NOC from the previous Excise department. They are listed under “If this applies to you”.",
      ur: "اگر گاڑی کسی اور ضلع میں رجسٹرڈ تھی تو اضافی دستاویزات درکار ہیں، بشمول سابقہ ایکسائز محکمے کا این او سی۔ وہ ”اگر یہ آپ پر لاگو ہو“ میں درج ہیں۔",
      roman:
        "Agar gaari kisi aur zile mein registered thi to additional documents darkaar hain, jin mein pichle Excise mehkame ka NOC shamil hai. Woh “Agar yeh aap par lagu ho” mein darj hain.",
    },
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    lastVerifiedAt: null,
    basis: "Official ICT Administration page, read 7 Oct 2026.",
  },
  {
    id: "passport.federal.warning.online-categories",
    serviceId: "passport",
    jurisdictionId: "federal",
    tone: "info",
    text: {
      en: "Online renewal is available for inland and overseas Pakistanis, but not every passport category can be handled online. The portal or office will tell you if yours cannot.",
      ur: "آن لائن تجدید ملک کے اندر اور بیرون ملک پاکستانیوں کے لیے دستیاب ہے، مگر ہر پاسپورٹ کیٹیگری آن لائن نہیں ہو سکتی۔ اگر آپ کی نہیں ہو سکتی تو پورٹل یا دفتر بتا دے گا۔",
      roman:
        "Online renewal inland aur overseas Pakistanion ke liye dastiyab hai, magar har passport category online nahi ho sakti. Agar aap ki nahi ho sakti to portal ya office bata dega.",
    },
    sourceId: "dgip.faq",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    lastVerifiedAt: null,
    basis: "DGI&P FAQ, read 7 Oct 2026, and the owner's brief.",
  },
  {
    id: "cnic.federal.warning.remote-limits",
    serviceId: "cnic",
    jurisdictionId: "federal",
    tone: "info",
    text: {
      en: "Not every CNIC renewal can be finished remotely. Depending on your case, biometric verification or a photograph may need a NADRA Registration Centre.",
      ur: "ہر شناختی کارڈ کی تجدید گھر بیٹھے مکمل نہیں ہو سکتی۔ آپ کے کیس کے مطابق بائیومیٹرک تصدیق یا تصویر کے لیے نادرا رجسٹریشن سینٹر جانا پڑ سکتا ہے۔",
      roman:
        "Har CNIC renewal ghar baithe mukammal nahi ho sakti. Aap ke case ke mutabiq biometric tasdeeq ya tasweer ke liye NADRA Registration Centre jaana par sakta hai.",
    },
    sourceId: "nadra.site",
    verificationStatus: "official_source",
    lastCheckedAt: null,
    lastVerifiedAt: null,
    basis: "NADRA's renewal flow as described in the owner's brief.",
  },
];

// ------------------------------------------------------------ Timelines -----

export const TIMELINES: TimelineRecord[] = [
  {
    id: "vehicle-transfer.ict.timeline.official-page",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    text: {
      en: "The official ICT Administration page lists a processing time of 4 weeks.",
      ur: "آئی سی ٹی انتظامیہ کے سرکاری صفحے پر پروسیسنگ کا وقت 4 ہفتے درج ہے۔",
      roman: "ICT Administration ke official page par processing ka waqt 4 hafte darj hai.",
    },
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    lastVerifiedAt: null,
    basis:
      "Listed on the official page; confirm at the counter, as the page also still shows an outdated fee line.",
  },
];
