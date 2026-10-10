import type { JurisdictionId, Localized, RequirementRecord, VerificationStatus } from "./types";

type Ctx = {
  serviceId: string;
  jurisdictionId: JurisdictionId;
  sourceId: string;
  status: VerificationStatus;
  basis: string;
  checked?: string | null;
};

function req(
  c: Ctx,
  r: {
    key: string;
    kind: RequirementRecord["kind"];
    label: Localized;
    detail?: Localized;
    required?: boolean;
    group?: RequirementRecord["group"];
    stepKey: string;
    actionKey?: string;
    status?: VerificationStatus;
    sourceId?: string;
    basis?: string;
  },
): RequirementRecord {
  const prefix = `${c.serviceId}.${c.jurisdictionId}`;
  return {
    id: `${prefix}.req.${r.key}`,
    serviceId: c.serviceId,
    jurisdictionId: c.jurisdictionId,
    kind: r.kind,
    label: r.label,
    ...(r.detail ? { detail: r.detail } : {}),
    required: r.required ?? true,
    ...(r.group ? { group: r.group } : {}),
    stepId: `${prefix}.step.${r.stepKey}`,
    ...(r.actionKey ? { actionId: `${prefix}.action.${r.actionKey}` } : {}),
    sourceId: r.sourceId ?? c.sourceId,
    verificationStatus: r.status ?? c.status,
    lastCheckedAt: c.checked ?? null,
    lastVerifiedAt: null,
    basis: r.basis ?? c.basis,
  };
}

// ------------------------------------------------- Vehicle transfer (ICT) ----

const vt: Ctx = {
  serviceId: "vehicle-transfer",
  jurisdictionId: "ict",
  sourceId: "ict-admin.vehicle-transfer",
  status: "official_source",
  basis: "Listed on the official ICT Administration vehicle transfer page, read on 7 Oct 2026.",
  checked: "2026-10-07",
};

const teamCompiled = {
  status: "needs_confirmation" as const,
  basis:
    "Compiled by the Raasta team; not listed on the official page. Confirm with Islamabad Excise.",
};

export const VEHICLE_TRANSFER_REQUIREMENTS: RequirementRecord[] = [
  req(vt, {
    key: "application",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Application for transfer of ownership, addressed to the Motor Registration Authority / Excise & Taxation Officer, Islamabad",
      ur: "ملکیت کی منتقلی کی درخواست، بنام موٹر رجسٹریشن اتھارٹی / ایکسائز اینڈ ٹیکسیشن آفیسر، اسلام آباد",
      roman:
        "Malkiyat ki muntaqili ki darkhwast, banam Motor Registration Authority / Excise & Taxation Officer, Islamabad",
    },
  }),
  req(vt, {
    key: "buyer-cnic",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Photocopy of your CNIC (the buyer)",
      ur: "آپ (خریدار) کے شناختی کارڈ کی فوٹو کاپی",
      roman: "Aap (khareedar) ke CNIC ki photocopy",
    },
  }),
  req(vt, {
    key: "seller-cnic",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Photocopy of the seller's CNIC",
      ur: "فروخت کنندہ کے شناختی کارڈ کی فوٹو کاپی",
      roman: "Farokht karne wale ke CNIC ki photocopy",
    },
  }),
  req(vt, {
    key: "form-f",
    kind: "form",
    stepKey: "prepare",
    label: {
      en: "Form 'F', filled in and signed",
      ur: "فارم 'ایف'، مکمل بھرا ہوا اور دستخط شدہ",
      roman: "Form 'F', poora bhara hua aur dastakhat shuda",
    },
  }),
  req(vt, {
    key: "transfer-letter",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Computerised transfer letter",
      ur: "کمپیوٹرائزڈ ٹرانسفر لیٹر",
      roman: "Computerised transfer letter",
    },
  }),
  req(vt, {
    key: "transfer-form",
    kind: "form",
    stepKey: "prepare",
    actionKey: "transfer-form",
    label: {
      en: "Transfer of Ownership form",
      ur: "ملکیت کی منتقلی کا فارم",
      roman: "Malkiyat ki muntaqili ka form",
    },
    detail: {
      en: "Print it on legal-size paper.",
      ur: "اسے لیگل سائز کاغذ پر پرنٹ کریں۔",
      roman: "Isay legal-size kaghaz par print karein.",
    },
  }),
  req(vt, {
    key: "affidavit",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Affidavit that the vehicle is neither stolen nor wanted in any other case",
      ur: "حلف نامہ کہ گاڑی نہ چوری شدہ ہے اور نہ کسی اور مقدمے میں مطلوب",
      roman: "Halaf nama ke gaari na chori shuda hai aur na kisi aur muqadme mein matloob",
    },
  }),
  req(vt, {
    key: "seller-present",
    kind: "condition",
    stepKey: "prepare",
    label: {
      en: "Seller attends in person — or their documents are attested by a Class-I officer",
      ur: "فروخت کنندہ خود حاضر ہو — یا اس کے کاغذات کلاس-I افسر سے تصدیق شدہ ہوں",
      roman: "Seller khud hazir ho — ya us ke kaghazat Class-I officer se tasdeeq shuda hon",
    },
    detail: {
      en: "If the registered owner does not appear, the official page asks for the CNIC copy and official phone number of the attesting officer.",
      ur: "اگر رجسٹرڈ مالک حاضر نہ ہو تو سرکاری صفحے کے مطابق تصدیق کرنے والے افسر کے شناختی کارڈ کی کاپی اور سرکاری فون نمبر درکار ہیں۔",
      roman:
        "Agar registered malik hazir na ho to official page ke mutabiq tasdeeq karne wale officer ke CNIC ki copy aur official phone number darkaar hain.",
    },
  }),
  req(vt, {
    key: "registration-book",
    kind: "document",
    stepKey: "prepare",
    ...teamCompiled,
    label: {
      en: "Original registration book",
      ur: "اصل رجسٹریشن بک",
      roman: "Asal registration book",
    },
  }),
  req(vt, {
    key: "token-tax",
    kind: "condition",
    stepKey: "verify",
    ...teamCompiled,
    label: {
      en: "Token tax and any dues checked before you pay the seller",
      ur: "فروخت کنندہ کو ادائیگی سے پہلے ٹوکن ٹیکس اور بقایاجات کی جانچ",
      roman: "Seller ko payment se pehle token tax aur baqayajaat ki jaanch",
    },
  }),
  // ---- Only if they apply --------------------------------------------------
  req(vt, {
    key: "leasing-noc",
    kind: "document",
    stepKey: "prepare",
    required: false,
    group: "leased",
    label: {
      en: "NOC / transfer letter from the bank or leasing company (if the vehicle is leased)",
      ur: "بینک یا لیزنگ کمپنی کا این او سی / ٹرانسفر لیٹر (اگر گاڑی لیز پر ہے)",
      roman: "Bank ya leasing company ka NOC / transfer letter (agar gaari lease par hai)",
    },
  }),
  ...(
    [
      [
        "residence-proof",
        "Proof of residence in Islamabad (utility bill, CNIC, lease agreement, driving licence, property deed, allotment or appointment letter)",
        "اسلام آباد میں رہائش کا ثبوت (بل، شناختی کارڈ، کرایہ نامہ، ڈرائیونگ لائسنس، جائیداد کی دستاویز، الاٹمنٹ یا تقرری کا خط)",
        "Islamabad mein rihaish ka saboot (bill, CNIC, kiraya nama, driving licence, jaidad ki dastawez, allotment ya taqarruri ka khat)",
      ],
      [
        "registration-book-copy",
        "Photocopy of the registration book",
        "رجسٹریشن بک کی فوٹو کاپی",
        "Registration book ki photocopy",
      ],
      [
        "registration-file-copy",
        "Photocopy of the complete vehicle registration file",
        "گاڑی کی مکمل رجسٹریشن فائل کی فوٹو کاپی",
        "Gaari ki mukammal registration file ki photocopy",
      ],
      [
        "original-file",
        "Original file, if the previous Excise office has returned it",
        "اصل فائل، اگر سابقہ ایکسائز دفتر نے واپس کی ہو",
        "Asal file, agar pichle Excise office ne wapas ki ho",
      ],
      [
        "previous-noc",
        "NOC for transfer from the previous Excise & Taxation department",
        "سابقہ ایکسائز اینڈ ٹیکسیشن محکمے کا ٹرانسفر این او سی",
        "Pichle Excise & Taxation mehkame ka transfer NOC",
      ],
    ] as const
  ).map(([key, en, ur, roman]) =>
    req(vt, {
      key,
      kind: "document",
      stepKey: "prepare",
      required: false,
      group: "other-district",
      label: { en, ur, roman },
    }),
  ),
];

// ----------------------------------------------------------------- CNIC -----

const cn: Ctx = {
  serviceId: "cnic",
  jurisdictionId: "federal",
  sourceId: "nadra.site",
  status: "needs_confirmation",
  basis: "Compiled in the Raasta research pass of 30 Aug 2026; confirm with NADRA.",
  checked: "2026-08-30",
};

export const CNIC_REQUIREMENTS: RequirementRecord[] = [
  req(cn, {
    key: "existing-cnic",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Your existing CNIC (or its number if it is lost)",
      ur: "آپ کا موجودہ شناختی کارڈ (گم ہو تو اس کا نمبر)",
      roman: "Aap ka maujooda CNIC (gum ho to us ka number)",
    },
  }),
  req(cn, {
    key: "family-cnic",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "A family member's CNIC number for verification",
      ur: "تصدیق کے لیے خاندان کے کسی فرد کا شناختی کارڈ نمبر",
      roman: "Tasdeeq ke liye khandan ke kisi fard ka CNIC number",
    },
  }),
  req(cn, {
    key: "address-proof",
    kind: "document",
    stepKey: "prepare",
    required: false,
    label: {
      en: "Proof of your current address (only if the address is changing)",
      ur: "موجودہ پتے کا ثبوت (صرف اگر پتہ تبدیل ہو رہا ہے)",
      roman: "Maujooda pate ka saboot (sirf agar pata tabdeel ho raha hai)",
    },
  }),
];

// ------------------------------------------------------------- Passport -----

const pp: Ctx = {
  serviceId: "passport",
  jurisdictionId: "federal",
  sourceId: "dgip.ordinary-passport",
  status: "official_source",
  basis:
    "DGI&P requirements for adults (18+) as supplied in the owner's brief; additional documents may apply in some cases.",
};

export const PASSPORT_REQUIREMENTS: RequirementRecord[] = [
  req(pp, {
    key: "cnic",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Original valid CNIC / NICOP, plus a photocopy",
      ur: "اصل درست شناختی کارڈ / نائیکوپ، اور ایک فوٹو کاپی",
      roman: "Asal valid CNIC / NICOP, aur aik photocopy",
    },
  }),
  req(pp, {
    key: "old-passport",
    kind: "document",
    stepKey: "prepare",
    label: {
      en: "Your previous passport, plus a photocopy (if one was issued)",
      ur: "آپ کا سابقہ پاسپورٹ، اور فوٹو کاپی (اگر جاری ہوا تھا)",
      roman: "Aap ka sabqa passport, aur photocopy (agar jaari hua tha)",
    },
  }),
  req(pp, {
    key: "fee-receipt",
    kind: "document",
    stepKey: "act",
    sourceId: "dgip.faq",
    label: {
      en: "Passport fee payment receipt",
      ur: "پاسپورٹ فیس کی ادائیگی کی رسید",
      roman: "Passport fee ki adaigi ki raseed",
    },
    detail: {
      en: "Paid fees can take time to sync from banking channels, which may delay your token.",
      ur: "ادا شدہ فیس بینک چینلز سے سسٹم میں آنے میں وقت لے سکتی ہے، جس سے ٹوکن میں تاخیر ہو سکتی ہے۔",
      roman:
        "Ada shuda fee bank channels se system mein aane mein waqt le sakti hai, jis se token mein takheer ho sakti hai.",
    },
  }),
  req(pp, {
    key: "noc",
    kind: "document",
    stepKey: "prepare",
    required: false,
    label: {
      en: "No-objection certificate (only for government, semi-government or autonomous-body employees)",
      ur: "این او سی (صرف سرکاری، نیم سرکاری یا خودمختار اداروں کے ملازمین کے لیے)",
      roman: "NOC (sirf sarkari, neem sarkari ya khudmukhtar idaron ke mulazimeen ke liye)",
    },
  }),
];

// -------------------------------------- Lightweight legacy services ----------

function legacyReqs(
  serviceId: string,
  jurisdictionId: JurisdictionId,
  sourceId: string,
  items: Array<[string, string?]>,
): RequirementRecord[] {
  const ctx: Ctx = {
    serviceId,
    jurisdictionId,
    sourceId,
    status: "needs_confirmation",
    basis: "Compiled in the Raasta research pass of 30 Aug 2026; confirm with the department.",
    checked: "2026-08-30",
  };
  return items.map(([en, ur], i) =>
    req(ctx, {
      key: `doc-${i + 1}`,
      kind: "document",
      stepKey: "prepare",
      label: ur ? { en, ur } : { en },
    }),
  );
}

export const LEGACY_REQUIREMENTS: RequirementRecord[] = [
  ...legacyReqs("birth-certificate", "federal", "nadra.site", [
    ["Hospital birth record, or an affidavit if the birth was at home"],
    ["Both parents' CNICs"],
    ["Child registration certificate form from the union council"],
  ]),
  ...legacyReqs("ntn-tax-filing", "federal", "fbr.site", [
    ["CNIC"],
    ["A mobile number and email registered in your own name"],
    ["Bank account details and, if employed, your salary certificate"],
  ]),
  ...legacyReqs("police-character-certificate", "ict", "ict-police.site", [
    ["CNIC"],
    ["Passport copy"],
    ["Passport-size photographs"],
    ["Proof of Islamabad residence"],
  ]),
  ...legacyReqs("domicile", "ict", "ict-admin.site", [
    ["CNIC and father's CNIC"],
    ["Proof of residence for the required number of years"],
    ["Educational certificates"],
    ["Affidavit on stamp paper"],
  ]),
];

export const REQUIREMENTS: RequirementRecord[] = [
  ...VEHICLE_TRANSFER_REQUIREMENTS,
  ...CNIC_REQUIREMENTS,
  ...PASSPORT_REQUIREMENTS,
  ...LEGACY_REQUIREMENTS,
];
