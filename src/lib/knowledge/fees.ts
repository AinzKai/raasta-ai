import type { FeeRecord, JurisdictionId, Localized, VerificationStatus } from "./types";

/**
 * Structured fee records. Amounts are numbers, never strings, and `null`
 * means "no confirmed amount" — the UI renders NOT CURRENTLY VERIFIED and the
 * model is never asked to fill it in.
 */

type Base = {
  serviceId: string;
  jurisdictionId: JurisdictionId;
  sourceId: string;
  verificationStatus: VerificationStatus;
  basis: string;
  effectiveFrom?: string | null;
  lastCheckedAt?: string | null;
};

function fee(
  base: Base,
  rest: {
    id: string;
    category: string;
    label: Localized;
    amount: number | null;
    processingDays?: number | null;
    processingUnit?: "days" | "working_days";
    processingVerification?: VerificationStatus;
    match?: Record<string, string>;
    primary?: boolean;
    historical?: boolean;
    supersededBy?: string;
    caveat?: Localized;
    effectiveUntil?: string | null;
    notes?: string;
  },
): FeeRecord {
  return {
    serviceId: base.serviceId,
    jurisdictionId: base.jurisdictionId,
    sourceId: base.sourceId,
    verificationStatus: base.verificationStatus,
    basis: base.basis,
    effectiveFrom: base.effectiveFrom ?? null,
    effectiveUntil: rest.effectiveUntil ?? null,
    lastCheckedAt: base.lastCheckedAt ?? null,
    lastVerifiedAt: null,
    currency: "PKR",
    processingDays: rest.processingDays ?? null,
    match: rest.match ?? {},
    ...rest,
  };
}

// ---------------------------------------------------------------- CNIC ------

const cnicBase: Base = {
  serviceId: "cnic",
  jurisdictionId: "federal",
  sourceId: "nadra.fee-structure",
  verificationStatus: "official_source",
  basis:
    "Amounts from NADRA's fee structure as supplied in the owner's brief; corroborated by news reports on 7 Oct 2026.",
};

const PROCESSING_CAVEAT: Localized = {
  en: "Published processing times differ between sources, so treat the number of days as an estimate.",
  ur: "مختلف ذرائع میں پروسیسنگ کے دن مختلف ہیں، اس لیے دنوں کی تعداد کو اندازہ سمجھیں۔",
  roman:
    "Mukhtalif zaraye mein processing ke din alag hain, is liye dino ki tadaad ko andaza samjhein.",
};

const speeds = [
  { key: "normal", label: { en: "Normal", ur: "عام", roman: "Normal" } },
  { key: "urgent", label: { en: "Urgent", ur: "فوری", roman: "Urgent" } },
  { key: "executive", label: { en: "Executive", ur: "ایگزیکٹو", roman: "Executive" } },
] as const;

const cnicAmounts = { normal: 400, urgent: 1150, executive: 2150 };
const cnicDays = { normal: 15, urgent: 12, executive: 6 };
const smartAmounts = { normal: 750, urgent: 1500, executive: 2500 };
const smartDays = { normal: 31, urgent: 23, executive: 9 };

const cnicFees: FeeRecord[] = [
  ...speeds.map((s) =>
    fee(cnicBase, {
      id: `cnic.federal.fee.renewal-${s.key}`,
      category: "cnic-renewal",
      label: {
        en: `CNIC renewal — ${s.label.en}`,
        ur: `شناختی کارڈ کی تجدید — ${s.label.ur}`,
        roman: `CNIC renewal — ${s.label.roman}`,
      },
      amount: cnicAmounts[s.key],
      processingDays: cnicDays[s.key],
      processingUnit: "days",
      processingVerification: "needs_confirmation",
      match: { situation: "renew" },
      primary: true,
      caveat: PROCESSING_CAVEAT,
    }),
  ),
  ...speeds.map((s) =>
    fee(cnicBase, {
      id: `cnic.federal.fee.smart-renewal-${s.key}`,
      category: "smart-cnic-renewal",
      label: {
        en: `Smart CNIC renewal — ${s.label.en}`,
        ur: `اسمارٹ شناختی کارڈ کی تجدید — ${s.label.ur}`,
        roman: `Smart CNIC renewal — ${s.label.roman}`,
      },
      amount: smartAmounts[s.key],
      processingDays: smartDays[s.key],
      processingUnit: "days",
      processingVerification: "needs_confirmation",
      match: { situation: "renew" },
      primary: true,
      caveat: PROCESSING_CAVEAT,
    }),
  ),
  // Situations for which Raasta holds NO confirmed fee. Shown as not verified.
  ...(
    [
      ["first", "First-time CNIC", "پہلا شناختی کارڈ", "Pehla CNIC"],
      [
        "lost",
        "Replacing a lost CNIC",
        "گمشدہ شناختی کارڈ کی تبدیلی",
        "Gum shuda CNIC ki replacement",
      ],
      [
        "modify",
        "Changing details on a CNIC",
        "کارڈ میں تفصیلات کی تبدیلی",
        "CNIC mein details ki tabdeeli",
      ],
    ] as const
  ).map(([key, en, ur, roman]) =>
    fee(
      {
        ...cnicBase,
        verificationStatus: "not_verified",
        basis: "No confirmed fee for this situation is on file; Raasta will not guess.",
      },
      {
        id: `cnic.federal.fee.${key}`,
        category: `cnic-${key}`,
        label: { en, ur, roman },
        amount: null,
        match: { situation: key },
        primary: false,
      },
    ),
  ),
];

// ------------------------------------------------------------- Passport -----

const passportBase = (effectiveFrom: string): Base => ({
  serviceId: "passport",
  jurisdictionId: "federal",
  sourceId: "dgip.ordinary-passport",
  verificationStatus: "official_source",
  basis:
    "MRP fee schedule on the official DGI&P ordinary-passport page; 36-page rows read 7 Oct 2026, full matrix from the owner's brief.",
  effectiveFrom,
  lastCheckedAt: "2026-10-07",
});

const PASSPORT_MATRIX: Record<
  number,
  Record<number, { normal: number; urgent: number; fasttrack: number }>
> = {
  36: {
    5: { normal: 4500, urgent: 7500, fasttrack: 12500 },
    10: { normal: 6700, urgent: 11200, fasttrack: 16200 },
  },
  72: {
    5: { normal: 8200, urgent: 13500, fasttrack: 18500 },
    10: { normal: 12400, urgent: 20200, fasttrack: 25200 },
  },
  100: {
    5: { normal: 9000, urgent: 18000, fasttrack: 23000 },
    10: { normal: 13500, urgent: 27000, fasttrack: 32000 },
  },
};

const PASSPORT_SPEEDS = [
  { key: "normal", en: "Normal", ur: "عام", roman: "Normal", days: 21, from: "2024-03-07" },
  { key: "urgent", en: "Urgent", ur: "فوری", roman: "Urgent", days: 5, from: "2024-03-07" },
  {
    key: "fasttrack",
    en: "Fast track",
    ur: "فاسٹ ٹریک",
    roman: "Fast track",
    days: 2,
    from: "2024-05-08",
  },
] as const;

const DELIVERY_CAVEAT: Localized = {
  en: "Published processing targets are working days and do not include courier delivery.",
  ur: "شائع شدہ مدت کام کے دنوں میں ہے اور کوریئر ڈیلیوری شامل نہیں۔",
  roman: "Shaya shuda muddat kaam ke dino mein hai aur courier delivery shamil nahi.",
};

const passportFees: FeeRecord[] = [];
for (const pages of [36, 72, 100]) {
  for (const years of [5, 10]) {
    for (const s of PASSPORT_SPEEDS) {
      passportFees.push(
        fee(passportBase(s.from), {
          id: `passport.federal.fee.${pages}p-${years}y-${s.key}`,
          category: `passport-${pages}p-${years}y`,
          label: {
            en: `${s.en} — ${pages} pages, ${years} years`,
            ur: `${s.ur} — ${pages} صفحات، ${years} سال`,
            roman: `${s.roman} — ${pages} pages, ${years} saal`,
          },
          amount: PASSPORT_MATRIX[pages]![years]![s.key],
          processingDays: s.days,
          processingUnit: "working_days",
          match: { pages: String(pages), validity: String(years), speed: s.key },
          primary: pages === 36 && years === 5,
          caveat: DELIVERY_CAVEAT,
        }),
      );
    }
  }
}

// ------------------------------------------------------ Vehicle transfer ----

const NOTIFICATION_BASE: Base = {
  serviceId: "vehicle-transfer",
  jurisdictionId: "ict",
  sourceId: "ict-excise.transfer-fee-notification",
  verificationStatus: "official_source",
  basis:
    "Revised transfer fees under the ICT notification effective 14-04-2025, as supplied in the owner's brief and corroborated by news reports on 7 Oct 2026.",
  effectiveFrom: "2025-04-14",
};

const BIKE_BASE: Base = {
  ...NOTIFICATION_BASE,
  verificationStatus: "needs_confirmation",
  basis:
    "Amounts from the same 14-04-2025 notification, but a one-month motorcycle transfer-fee waiver was announced on 7 Apr 2026. Whether it has ended or been extended is not confirmed.",
};

const BIKE_CAVEAT: Localized = {
  en: "A one-month waiver of motorcycle transfer fees was announced on 7 April 2026. Ask the Excise counter whether the standard fee applies today.",
  ur: "7 اپریل 2026 کو موٹر سائیکل ٹرانسفر فیس ایک ماہ کے لیے معاف کرنے کا اعلان ہوا تھا۔ ایکسائز کاؤنٹر سے پوچھیں کہ آج معمول کی فیس لاگو ہے یا نہیں۔",
  roman:
    "7 April 2026 ko motorcycle transfer fee aik maah ke liye maaf karne ka elaan hua tha. Excise counter se poochein ke aaj normal fee lagu hai ya nahi.",
};

const vehicleBands: Array<{
  type: "car" | "ev" | "bike";
  band: string;
  amount: number;
  en: string;
  ur: string;
  roman: string;
}> = [
  {
    type: "car",
    band: "1000",
    amount: 2750,
    en: "Car — up to 1000 cc",
    ur: "گاڑی — 1000 سی سی تک",
    roman: "Car — 1000 cc tak",
  },
  {
    type: "car",
    band: "1800",
    amount: 5500,
    en: "Car — over 1000 cc, up to 1800 cc",
    ur: "گاڑی — 1000 سے 1800 سی سی",
    roman: "Car — 1000 se 1800 cc",
  },
  {
    type: "car",
    band: "above",
    amount: 11000,
    en: "Car — over 1800 cc",
    ur: "گاڑی — 1800 سی سی سے اوپر",
    roman: "Car — 1800 cc se ooper",
  },
  {
    type: "ev",
    band: "50",
    amount: 2500,
    en: "Electric — up to 50 kW",
    ur: "الیکٹرک — 50 کلو واٹ تک",
    roman: "Electric — 50 kW tak",
  },
  {
    type: "ev",
    band: "100",
    amount: 5500,
    en: "Electric — over 50 kW, up to 100 kW",
    ur: "الیکٹرک — 50 سے 100 کلو واٹ",
    roman: "Electric — 50 se 100 kW",
  },
  {
    type: "ev",
    band: "above",
    amount: 10000,
    en: "Electric — over 100 kW",
    ur: "الیکٹرک — 100 کلو واٹ سے اوپر",
    roman: "Electric — 100 kW se ooper",
  },
  {
    type: "bike",
    band: "200",
    amount: 550,
    en: "Motorbike — up to 200 cc",
    ur: "موٹر سائیکل — 200 سی سی تک",
    roman: "Motorbike — 200 cc tak",
  },
  {
    type: "bike",
    band: "400",
    amount: 1000,
    en: "Motorbike — over 200 cc, up to 400 cc",
    ur: "موٹر سائیکل — 200 سے 400 سی سی",
    roman: "Motorbike — 200 se 400 cc",
  },
  {
    type: "bike",
    band: "above",
    amount: 1500,
    en: "Motorbike — over 400 cc",
    ur: "موٹر سائیکل — 400 سی سی سے اوپر",
    roman: "Motorbike — 400 cc se ooper",
  },
];

const vehicleFees: FeeRecord[] = [
  ...vehicleBands.map((v) =>
    fee(v.type === "bike" ? BIKE_BASE : NOTIFICATION_BASE, {
      id: `vehicle-transfer.ict.fee.${v.type}-${v.band}`,
      category: `transfer-${v.type}`,
      label: { en: v.en, ur: v.ur, roman: v.roman },
      amount: v.amount,
      match: { vehicleType: v.type, vehicleBand: v.band },
      primary: v.type === "car",
      ...(v.type === "bike" ? { caveat: BIKE_CAVEAT } : {}),
    }),
  ),
  // Historical (pre-14-04-2025). Kept so conflicts resolve toward the newer notification.
  ...(
    [
      ["car-1000", 1200, "car", "1000"],
      ["car-1800", 2000, "car", "1800"],
      ["car-above", 3000, "car", "above"],
    ] as const
  ).map(([key, amount, type, band]) =>
    fee(
      {
        serviceId: "vehicle-transfer",
        jurisdictionId: "ict",
        sourceId: "ict-admin.vehicle-transfer",
        verificationStatus: "needs_confirmation",
        basis:
          "Pre-April-2025 amount; superseded by the revised notification. Kept only so older sources are not mistaken for current ones.",
      },
      {
        id: `vehicle-transfer.ict.fee.legacy-${key}`,
        category: "legacy-transfer",
        label: { en: `Superseded — ${key}` },
        amount,
        match: { vehicleType: type, vehicleBand: band },
        historical: true,
        supersededBy: `vehicle-transfer.ict.fee.${key}`,
        effectiveUntil: "2025-04-13",
      },
    ),
  ),
  fee(
    {
      serviceId: "vehicle-transfer",
      jurisdictionId: "ict",
      sourceId: "ict-admin.vehicle-transfer",
      verificationStatus: "not_verified",
      basis:
        "The official page says advance tax applies to vehicles under five years from first registration but does not publish an amount.",
    },
    {
      id: "vehicle-transfer.ict.fee.advance-tax",
      category: "advance-tax",
      label: {
        en: "Advance tax (vehicles under 5 years from first registration)",
        ur: "ایڈوانس ٹیکس (پہلی رجسٹریشن سے 5 سال سے کم پرانی گاڑی)",
        roman: "Advance tax (pehli registration se 5 saal se kam purani gaari)",
      },
      amount: null,
      match: {},
      primary: true,
      caveat: {
        en: "The official page adds 10% depreciation per year to this tax but publishes no amount.",
        ur: "سرکاری صفحے کے مطابق اس ٹیکس پر ہر سال 10 فیصد فرسودگی لگتی ہے، لیکن رقم شائع نہیں۔",
        roman:
          "Official page ke mutabiq is tax par har saal 10 percent depreciation lagti hai, lekin raqam shaya nahi.",
      },
    },
  ),
  fee(
    {
      serviceId: "vehicle-transfer",
      jurisdictionId: "ict",
      sourceId: "ict-excise.site",
      verificationStatus: "not_verified",
      basis: "Outstanding token tax and challans depend on the individual vehicle record.",
    },
    {
      id: "vehicle-transfer.ict.fee.token-tax-arrears",
      category: "arrears",
      label: {
        en: "Outstanding token tax / challans",
        ur: "بقایا ٹوکن ٹیکس / چالان",
        roman: "Baqaya token tax / challan",
      },
      amount: null,
      match: {},
      primary: true,
    },
  ),
];

// ------------------------------------------- Lightweight legacy services ----

const legacyUnverified = (
  serviceId: string,
  jurisdictionId: JurisdictionId,
  sourceId: string,
  id: string,
  en: string,
  ur: string,
  basis = "No confirmed amount is on file; charges are not published on a single official page.",
): FeeRecord =>
  fee(
    { serviceId, jurisdictionId, sourceId, verificationStatus: "not_verified", basis },
    { id, category: id.split(".").pop() ?? id, label: { en, ur }, amount: null, primary: true },
  );

const legacyFees: FeeRecord[] = [
  legacyUnverified(
    "birth-certificate",
    "federal",
    "nadra.site",
    "birth-certificate.federal.fee.union-council",
    "Union council registration",
    "یونین کونسل رجسٹریشن",
  ),
  legacyUnverified(
    "birth-certificate",
    "federal",
    "nadra.site",
    "birth-certificate.federal.fee.computerised",
    "Computerised certificate",
    "کمپیوٹرائزڈ سرٹیفکیٹ",
  ),
  fee(
    {
      serviceId: "ntn-tax-filing",
      jurisdictionId: "federal",
      sourceId: "fbr.site",
      verificationStatus: "needs_confirmation",
      basis:
        "Carried from the 30 Aug 2026 research pass (registration on IRIS is free); not re-read since.",
      lastCheckedAt: "2026-08-30",
    },
    {
      id: "ntn-tax-filing.federal.fee.ntn-registration",
      category: "ntn",
      label: { en: "NTN registration", ur: "این ٹی این رجسٹریشن" },
      amount: 0,
      processingDays: 1,
      processingUnit: "days",
      primary: true,
    },
  ),
  legacyUnverified(
    "ntn-tax-filing",
    "federal",
    "fbr.site",
    "ntn-tax-filing.federal.fee.late-surcharge",
    "Late-filing surcharge",
    "تاخیر سے گوشوارہ جمع کرانے کا جرمانہ",
  ),
  legacyUnverified(
    "police-character-certificate",
    "ict",
    "ict-police.site",
    "police-character-certificate.ict.fee.certificate",
    "Certificate fee",
    "سرٹیفکیٹ فیس",
  ),
  legacyUnverified(
    "domicile",
    "ict",
    "ict-admin.site",
    "domicile.ict.fee.domicile",
    "Domicile fee",
    "ڈومیسائل فیس",
  ),
];

export const FEES: FeeRecord[] = [...cnicFees, ...passportFees, ...vehicleFees, ...legacyFees];
