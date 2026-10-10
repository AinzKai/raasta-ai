import { useSyncExternalStore } from "react";
import { COPY, tf as tfCopy, type CopyKey } from "./copy";
import type { Lang } from "./knowledge/types";

export type { Lang };
export const LANGS: Lang[] = ["en", "ur", "roman"];

const KEY = "raasta.lang";
const listeners = new Set<() => void>();
let current: Lang = "en";
let hydrated = false;

function readStored(): Lang {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(KEY);
  return v === "ur" || v === "roman" ? v : "en";
}

function subscribe(fn: () => void) {
  if (!hydrated) {
    hydrated = true;
    current = readStored();
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLang(next: Lang) {
  current = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, next);
    document.documentElement.lang = next === "ur" ? "ur" : "en";
    document.documentElement.dir = next === "ur" ? "rtl" : "ltr";
  }
  listeners.forEach((fn) => fn());
}

/** Language is UI-chrome only; answers always come back in the language you asked in. */
export function useLang(): [Lang, (next: Lang) => void] {
  const lang = useSyncExternalStore(
    subscribe,
    () => current,
    () => "en" as Lang,
  );
  return [lang, setLang];
}

type Dict = Record<string, { en: string; ur: string; roman?: string }>;

const STRINGS: Dict = {
  navServices: { en: "Services", ur: "خدمات" },
  navAssistant: { en: "Assistant", ur: "معاون" },
  navComplaints: { en: "Complaints", ur: "شکایات" },
  navAbout: { en: "About", ur: "تعارف" },
  signIn: { en: "Sign in", ur: "سائن اِن" },
  account: { en: "Account", ur: "اکاؤنٹ" },
  askPlaceholder: {
    en: "Describe your problem — Urdu, Roman Urdu or English",
    ur: "اپنا مسئلہ لکھیں — اردو، رومن اردو یا انگریزی میں",
  },
  heroTitle: { en: "Your path through Pakistani paperwork", ur: "سرکاری کاغذات کا سیدھا راستہ" },
  heroSub: {
    en: "Ask in the language you think in. Get a numbered checklist with documents, fees and the office to visit — every number backed by a source, or clearly marked as unconfirmed.",
    ur: "جس زبان میں سوچتے ہیں اسی میں پوچھیں۔ دستاویزات، فیس اور دفتر کی مکمل فہرست حاصل کریں — ہر عدد کے ساتھ حوالہ، ورنہ واضح طور پر غیر مصدقہ۔",
  },
  ask: { en: "Ask Raasta", ur: "راستہ سے پوچھیں" },

  // Account page
  myRequests: { en: "My requests", ur: "میری درخواستیں" },
  myRequestsSub: {
    en: "Everything you've asked Raasta AI, saved to your account.",
    ur: "آپ نے راستہ AI سے جو بھی پوچھا، آپ کے اکاؤنٹ میں محفوظ ہے۔",
  },
  noRequests: { en: "No saved requests yet.", ur: "ابھی تک کوئی درخواست محفوظ نہیں۔" },
  startNewRequest: { en: "Start a new request", ur: "نئی درخواست شروع کریں" },
  deleteRequestConfirm: {
    en: "Delete this request? This can't be undone.",
    ur: "یہ درخواست حذف کریں؟ یہ واپس نہیں ہو سکتی۔",
  },
  deleteRequestError: {
    en: "Could not delete this request.",
    ur: "یہ درخواست حذف نہیں ہو سکی۔",
  },
  loadingRequests: { en: "Loading...", ur: "لوڈ ہو رہا ہے..." },
  generalService: { en: "General", ur: "عمومی" },
  loadingError: {
    en: "Could not load your requests.",
    ur: "آپ کی درخواستیں لوڈ نہیں ہو سکیں۔",
  },
  conversationLoadError: {
    en: "Could not load this conversation.",
    ur: "یہ گفتگو لوڈ نہیں ہو سکی۔",
  },

  // Status page
  systemStatus: { en: "System status", ur: "سسٹم کی حالت" },
  systemStatusSub: {
    en: "Check this before a live demo — a red row here means the demo will fail, not just look wrong.",
    ur: "لائیو ڈیمو سے پہلے یہ چیک کریں — یہاں سرخ قطار کا مطلب ہے ڈیمو ناکام ہوگا۔",
  },
  database: { en: "Database", ur: "ڈیٹابیس" },
  aiProvider: { en: "AI provider", ur: "AI فراہم کنندہ" },
  notConfigured: { en: "not configured", ur: "ترتیب نہیں دی گئی" },
  lastChecked: { en: "Checked", ur: "چیک کیا گیا" },
  serverUnreachable: {
    en: "Could not reach the server at all.",
    ur: "سرور تک بالکل نہیں پہنچا جا سکا۔",
  },
  recheck: { en: "Re-check", ur: "دوبارہ چیک کریں" },
  checking: { en: "Checking...", ur: "چیک ہو رہا ہے..." },

  // Complaints
  complaintsLog: { en: "Complaints log", ur: "شکایات کا ریکارڈ" },
  complaintsLogSub: {
    en: "Write down what happened while it is fresh: the office, the date, the person, the delay.",
    ur: "جो ہوا اسے تازہ میں لکھیں: دفتر، تاریخ، شخص، تاخیر۔",
  },

  // Common
  loading: { en: "Loading...", ur: "لوڈ ہو رہا ہے..." },
};

export function t(key: CopyKey | keyof typeof STRINGS | string, lang: Lang): string {
  const fresh = (COPY as Record<string, { en: string; ur: string; roman: string }>)[key];
  if (fresh) return fresh[lang];
  const entry = STRINGS[key];
  if (!entry) return String(key);
  return lang === "roman" ? (entry.roman ?? entry.en) : entry[lang];
}

/** Bound translator for components: const { T, tf } = useLocale(). */
export function useLocale() {
  const [lang, setLangFn] = useLang();
  return {
    lang,
    setLang: setLangFn,
    T: (key: CopyKey) => COPY[key][lang],
    tf: (key: CopyKey, vars: Record<string, string | number>) => tfCopy(key, lang, vars),
    dir: lang === "ur" ? ("rtl" as const) : ("ltr" as const),
  };
}
