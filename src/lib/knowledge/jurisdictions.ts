import type { JurisdictionId, JurisdictionRecord } from "./types";

export const JURISDICTIONS: JurisdictionRecord[] = [
  {
    id: "federal",
    name: {
      en: "Federal (all Pakistan)",
      ur: "وفاقی (پورا پاکستان)",
      roman: "Federal (poora Pakistan)",
    },
    keywords: ["federal"],
  },
  {
    id: "ict",
    name: {
      en: "Islamabad Capital Territory",
      ur: "اسلام آباد کیپیٹل ٹیریٹری",
      roman: "Islamabad Capital Territory",
    },
    keywords: [
      "islamabad",
      "ict",
      "isb",
      "اسلام آباد",
      "اسلام اباد",
      "i-8",
      "g-11",
      "f-10",
      "h-9",
      "e-8",
    ],
  },
  {
    id: "punjab",
    name: { en: "Punjab", ur: "پنجاب", roman: "Punjab" },
    keywords: [
      "punjab",
      "lahore",
      "rawalpindi",
      "faisalabad",
      "multan",
      "پنجاب",
      "لاہور",
      "راولپنڈی",
    ],
  },
  {
    id: "sindh",
    name: { en: "Sindh", ur: "سندھ", roman: "Sindh" },
    keywords: ["sindh", "karachi", "hyderabad", "sukkur", "سندھ", "کراچی"],
  },
  {
    id: "kp",
    name: { en: "Khyber Pakhtunkhwa", ur: "خیبر پختونخوا", roman: "Khyber Pakhtunkhwa" },
    keywords: ["khyber", "pakhtunkhwa", "kpk", "peshawar", "abbottabad", "mardan", "پشاور", "خیبر"],
  },
  {
    id: "balochistan",
    name: { en: "Balochistan", ur: "بلوچستان", roman: "Balochistan" },
    keywords: ["balochistan", "quetta", "بلوچستان", "کوئٹہ"],
  },
];

export function getJurisdiction(id: string | null | undefined): JurisdictionRecord | undefined {
  return JURISDICTIONS.find((j) => j.id === id);
}

export function isJurisdictionId(value: string): value is JurisdictionId {
  return JURISDICTIONS.some((j) => j.id === value);
}
