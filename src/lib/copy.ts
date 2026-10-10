import type { Lang } from "./knowledge/types";

export type Trio = { en: string; ur: string; roman: string };
const c = (en: string, ur: string, roman: string): Trio => ({ en, ur, roman });

/**
 * Product copy. Every key MUST have all three languages (enforced by types and
 * a test). Roman Urdu is written the way people actually text, not
 * transliterated word-for-word. {braces} are filled by tf().
 */
export const COPY = {
  // ---- Brand & navigation -------------------------------------------------
  brandTagline: c(
    "Your path through Pakistan's civic services",
    "پاکستان کی سرکاری خدمات میں آپ کا راستہ",
    "Pakistan ki sarkari khidmaat mein aapka raasta",
  ),
  navStart: c("Start a journey", "سفر شروع کریں", "Journey shuru karein"),
  navJourneys: c("My journeys", "میرے سفر", "Meri journeys"),
  navServices: c("Services", "خدمات", "Services"),
  navExplain: c("Explain this", "یہ سمجھائیں", "Yeh samjhayein"),
  navCases: c("Case tracker", "کیس ٹریکر", "Case tracker"),
  navAbout: c("About", "تعارف", "About"),
  navHome: c("Home", "ہوم", "Home"),
  signIn: c("Sign in", "سائن اِن", "Sign in"),
  account: c("Account", "اکاؤنٹ", "Account"),
  skipToContent: c("Skip to content", "مواد پر جائیں", "Content par jayein"),
  language: c("Language", "زبان", "Zubaan"),

  // ---- Landing --------------------------------------------------------------
  heroKicker: c("Raasta", "راستہ", "Raasta"),
  heroTitle: c(
    "What are you trying to get done?",
    "آپ کیا کروانا چاہتے ہیں؟",
    "Aap kya karwana chahte hain?",
  ),
  heroSub: c(
    "Say it in your own words. Raasta maps your route, shows what an official source backs and what it can't confirm, and tells you the next step.",
    "اپنے الفاظ میں بتائیں۔ راستہ آپ کا راستہ بناتا ہے، بتاتا ہے کہ کیا سرکاری ماخذ سے ثابت ہے اور کیا نہیں، اور اگلا قدم بتاتا ہے۔",
    "Apne alfaz mein bataein. Raasta aapka raasta banata hai, batata hai kya official source se sabit hai aur kya nahi, aur agla qadam batata hai.",
  ),
  goalLabel: c("Describe what you need", "بتائیں آپ کو کیا چاہیے", "Bataein aapko kya chahiye"),
  goalPlaceholder: c(
    "e.g. Transfer a used car in Islamabad",
    "مثلاً: اسلام آباد میں استعمال شدہ گاڑی اپنے نام کروانی ہے",
    "Masalan: Islamabad mein used gaari apne naam karwani hai",
  ),
  startJourney: c("Start my journey", "میرا سفر شروع کریں", "Meri journey shuru karein"),
  seeExample: c("See a live example", "ایک مثال دیکھیں", "Aik misaal dekhein"),
  exampleCnic: c("Renew my CNIC", "شناختی کارڈ کی تجدید", "CNIC renew karna hai"),
  exampleCar: c(
    "Transfer a used car in Islamabad",
    "اسلام آباد میں گاڑی اپنے نام کروانی ہے",
    "Islamabad mein gaari apne naam karwani hai",
  ),
  examplePassport: c("Apply for a passport", "پاسپورٹ بنوانا ہے", "Passport banwana hai"),
  exampleLost: c(
    "Replace my lost CNIC",
    "گم شدہ شناختی کارڈ کی تبدیلی",
    "Gum shuda CNIC replace karna hai",
  ),
  howTitle: c("From confusion to done", "الجھن سے مکمل تک", "Uljhan se mukammal tak"),
  howUnderstand: c("Understand", "سمجھیں", "Samjhein"),
  howUnderstandBody: c(
    "Tell us the goal. We ask only what changes the path.",
    "اپنا مقصد بتائیں۔ ہم صرف وہی پوچھتے ہیں جو راستہ بدلے۔",
    "Apna maqsad bataein. Hum sirf wohi poochte hain jo raasta badle.",
  ),
  howPrepare: c("Prepare", "تیاری کریں", "Tayyari karein"),
  howPrepareBody: c(
    "A checklist that shows how ready you are — a real number, not a guess.",
    "ایک چیک لسٹ جو بتاتی ہے آپ کتنے تیار ہیں — اندازہ نہیں، اصل عدد۔",
    "Aik checklist jo batati hai aap kitne tayyar hain — andaza nahi, asal adad.",
  ),
  howAct: c("Act", "عمل کریں", "Amal karein"),
  howActBody: c(
    "Official links, forms and the office to visit — all sourced.",
    "سرکاری لنکس، فارم اور دفتر — سب حوالوں کے ساتھ۔",
    "Official links, forms aur office — sab hawalon ke saath.",
  ),
  trustTitle: c(
    "AI decides what's relevant. Verified sources decide what's true.",
    "AI طے کرتا ہے کیا متعلقہ ہے۔ تصدیق شدہ ماخذ طے کرتے ہیں کیا سچ ہے۔",
    "AI tay karta hai kya relevant hai. Verified sources tay karte hain kya sach hai.",
  ),
  trustBody: c(
    "Every fee, form and link on Raasta comes from a source we can show you. When we can't confirm something, we say so instead of guessing.",
    "راستہ پر ہر فیس، فارم اور لنک ایک ایسے ماخذ سے آتا ہے جو ہم دکھا سکتے ہیں۔ جب تصدیق نہ ہو سکے تو ہم اندازہ لگانے کے بجائے صاف بتاتے ہیں۔",
    "Raasta par har fee, form aur link aise source se aata hai jo hum dikha sakte hain. Jab tasdeeq na ho sake to hum andaza lagane ke bajaye saaf bata dete hain.",
  ),
  trustPoint1: c(
    "Fees come from structured official records",
    "فیس سرکاری ریکارڈ سے آتی ہے",
    "Fee official records se aati hai",
  ),
  trustPoint2: c(
    "Jurisdiction is never silently mixed",
    "دائرہ اختیار کبھی خاموشی سے نہیں ملایا جاتا",
    "Jurisdiction kabhi chupke se mix nahi hoti",
  ),
  trustPoint3: c(
    "Unverified means unverified — shown clearly",
    "غیر مصدقہ کا مطلب غیر مصدقہ — صاف دکھایا جاتا ہے",
    "Unverified ka matlab unverified — saaf dikhaya jata hai",
  ),
  popularTitle: c(
    "Start from a common journey",
    "عام سفر سے شروع کریں",
    "Aam journey se shuru karein",
  ),
  previewLabel: c("Live preview", "براہ راست نمونہ", "Live preview"),

  // ---- Journey ----------------------------------------------------------------
  yourRoute: c("Your route", "آپ کا راستہ", "Aapka raasta"),
  mappedRoute: c(
    "I've mapped your route.",
    "میں نے آپ کا راستہ بنا دیا ہے۔",
    "Maine aapka raasta bana diya hai.",
  ),
  nextStep: c("Next step", "اگلا قدم", "Agla qadam"),
  youAreHere: c("You are here", "آپ یہاں ہیں", "Aap yahan hain"),
  stepOf: c("Step {n} of {total}", "قدم {n} از {total}", "Qadam {n} / {total}"),
  stepsDone: c(
    "{done} of {total} steps",
    "{total} میں سے {done} قدم",
    "{total} mein se {done} qadam",
  ),
  journeyDone: c("Journey complete", "سفر مکمل", "Journey mukammal"),
  journeyDoneBody: c(
    "All steps are marked complete. Keep your receipts and records.",
    "تمام قدم مکمل ہیں۔ اپنی رسیدیں اور ریکارڈ سنبھال کر رکھیں۔",
    "Tamam qadam mukammal hain. Apni raseedein aur record sambhal kar rakhein.",
  ),
  statusCompleted: c("Done", "مکمل", "Mukammal"),
  statusCurrent: c("Current", "جاری", "Jaari"),
  statusLocked: c("Up next", "آگے", "Agay"),
  statusAttention: c("Needs attention", "توجہ درکار", "Tawajjuh darkaar"),
  statusBlocked: c("Blocked", "رکاوٹ", "Rukawat"),
  statusSkipped: c("Skipped", "چھوڑا گیا", "Chora gaya"),
  statusNotVerified: c("Not verified", "غیر مصدقہ", "Unverified"),
  markStepDone: c("Mark step complete", "قدم مکمل کریں", "Qadam mukammal karein"),
  undoStep: c("Undo", "واپس کریں", "Undo karein"),
  stepNote: c("Your note for this step", "اس قدم کے لیے آپ کا نوٹ", "Is qadam ke liye aapka note"),
  stepNotePlaceholder: c(
    "Queue number, who you spoke to…",
    "قطار نمبر، کس سے بات ہوئی…",
    "Queue number, kis se baat hui…",
  ),
  showDetails: c("Details", "تفصیل", "Tafseel"),
  hideDetails: c("Hide details", "تفصیل چھپائیں", "Tafseel chhupayein"),
  oneQuickQuestion: c("One quick question", "ایک مختصر سوال", "Aik mukhtasar sawal"),
  refineFees: c(
    "Tell us more to see your exact fee",
    "اپنی درست فیس دیکھنے کے لیے مزید بتائیں",
    "Apni durust fee dekhne ke liye mazeed bataein",
  ),

  // ---- Readiness -------------------------------------------------------------------
  yourReadiness: c("Your readiness", "آپ کی تیاری", "Aapki tayyari"),
  readyPct: c("You're {pct}% ready", "آپ {pct}% تیار ہیں", "Aap {pct}% tayyar hain"),
  remainingOne: c("1 thing remaining", "1 چیز باقی ہے", "1 cheez baqi hai"),
  remainingMany: c("{n} things remaining", "{n} چیزیں باقی ہیں", "{n} cheezein baqi hain"),
  allReady: c(
    "You are ready for the next step.",
    "آپ اگلے قدم کے لیے تیار ہیں۔",
    "Aap agle qadam ke liye tayyar hain.",
  ),
  readyFormula: c(
    "{ready} of {total} required items ready",
    "{total} میں سے {ready} ضروری چیزیں تیار",
    "{total} mein se {ready} zaroori cheezein tayyar",
  ),
  readyNote: c(
    "Calculated from your checklist — not an AI estimate.",
    "آپ کی چیک لسٹ سے حساب کیا گیا — AI کا اندازہ نہیں۔",
    "Aapki checklist se hisaab kiya gaya — AI ka andaza nahi.",
  ),
  completePrep: c(
    "Complete my preparation",
    "میری تیاری مکمل کریں",
    "Meri tayyari mukammal karein",
  ),
  needsWorkOne: c("1 needs attention", "1 پر توجہ درکار", "1 par tawajjuh darkaar"),
  needsWorkMany: c("{n} need attention", "{n} پر توجہ درکار", "{n} par tawajjuh darkaar"),
  requiredDocs: c("What you need", "آپ کو کیا چاہیے", "Aapko kya chahiye"),
  ifApplies: c("If this applies to you", "اگر یہ آپ پر لاگو ہو", "Agar yeh aap par lagu ho"),
  appliesToMe: c("This applies to me", "یہ مجھ پر لاگو ہے", "Yeh mujh par lagu hai"),
  markReady: c("Ready", "تیار", "Tayyar"),
  markAttention: c("Needs attention", "توجہ درکار", "Tawajjuh darkaar"),
  markUnavailable: c("Not available", "دستیاب نہیں", "Dastiyab nahi"),
  notChecked: c("Not checked yet", "ابھی چیک نہیں کیا", "Abhi check nahi kiya"),
  setStatusFor: c("Set status for {item}", "{item} کی حالت منتخب کریں", "{item} ki halat chunein"),

  // ---- Fees / timeline / warnings -------------------------------------------------
  feesTitle: c("Fees", "فیس", "Fee"),
  feeFor: c("Fee for you", "آپ کے لیے فیس", "Aapke liye fee"),
  processing: c("Processing", "پروسیسنگ", "Processing"),
  daysShort: c("{n} days", "{n} دن", "{n} din"),
  workingDaysShort: c("{n} working days", "{n} کام کے دن", "{n} kaam ke din"),
  showAllOptions: c(
    "Show all {n} options",
    "تمام {n} اختیارات دکھائیں",
    "Tamam {n} options dekhein",
  ),
  hideOptions: c("Show fewer", "کم دکھائیں", "Kam dekhein"),
  notVerifiedTitle: c(
    "Not currently verified",
    "فی الحال تصدیق شدہ نہیں",
    "Filhaal tasdeeq shuda nahi",
  ),
  notVerifiedFee: c(
    "I couldn't confirm the current fee from an official source, so I won't guess.",
    "میں سرکاری ماخذ سے موجودہ فیس کی تصدیق نہیں کر سکا، اس لیے اندازہ نہیں لگاؤں گا۔",
    "Main official source se maujooda fee ki tasdeeq nahi kar saka, is liye andaza nahi lagaunga.",
  ),
  notVerifiedDocs: c(
    "I couldn't confirm the current document list from an official source, so I won't guess.",
    "میں سرکاری ماخذ سے موجودہ دستاویزات کی فہرست کی تصدیق نہیں کر سکا، اس لیے اندازہ نہیں لگاؤں گا۔",
    "Main official source se maujooda documents ki list ki tasdeeq nahi kar saka, is liye andaza nahi lagaunga.",
  ),
  notVerifiedOther: c(
    "I couldn't confirm that from an official source, so I won't guess.",
    "میں سرکاری ماخذ سے اس کی تصدیق نہیں کر سکا، اس لیے اندازہ نہیں لگاؤں گا۔",
    "Main official source se iski tasdeeq nahi kar saka, is liye andaza nahi lagaunga.",
  ),
  notVerifiedHint: c(
    "Check with the department directly, or ask me about a service I have verified information for.",
    "محکمے سے براہ راست پوچھیں، یا مجھ سے ایسی خدمت کے بارے میں پوچھیں جس کی تصدیق شدہ معلومات میرے پاس ہیں۔",
    "Mehkame se seedha poochein, ya mujh se aisi service ke baare mein poochein jis ki verified maloomat mere paas hain.",
  ),
  feeUpcoming: c(
    "Approved upcoming change",
    "منظور شدہ آنے والی تبدیلی",
    "Manzoor shuda aane wali tabdeeli",
  ),
  staleConfirm: c(
    "Last read {n} days ago — please confirm with the official source.",
    "آخری بار {n} دن پہلے پڑھا گیا — براہ کرم سرکاری ماخذ سے تصدیق کریں۔",
    "Aakhri baar {n} din pehle parha gaya — meherbani karke official source se tasdeeq karein.",
  ),
  amountMissing: c(
    "No confirmed amount",
    "تصدیق شدہ رقم موجود نہیں",
    "Tasdeeq shuda raqam mojood nahi",
  ),
  timelineTitle: c("How long it takes", "کتنا وقت لگتا ہے", "Kitna waqt lagta hai"),
  warningsTitle: c("Good to know", "جاننا ضروری ہے", "Jaanna zaroori hai"),
  sourcesTitle: c("Official sources", "سرکاری ماخذ", "Official sources"),
  sourcesSub: c(
    "Where each fact on this page comes from.",
    "اس صفحے کی ہر معلومات کہاں سے آئی ہے۔",
    "Is page ki har maloomat kahan se aayi hai.",
  ),

  // ---- Actions ---------------------------------------------------------------------
  officialActions: c("Official actions", "سرکاری اقدامات", "Official actions"),
  officialSource: c("Official source", "سرکاری ماخذ", "Official source"),
  govSite: c("Government site", "سرکاری سائٹ", "Sarkari site"),
  thirdPartyTool: c("Third-party tool", "تھرڈ پارٹی ٹول", "Third-party tool"),
  thirdPartyActions: c(
    "Helpful tools outside government",
    "حکومت سے باہر کے مددگار ٹولز",
    "Hukumat se bahar ke madadgar tools",
  ),
  thirdPartyNote: c(
    "Opens {name}. This is not a government site; the address itself comes from the official page.",
    "{name} کھلتا ہے۔ یہ سرکاری سائٹ نہیں؛ پتہ سرکاری صفحے سے لیا گیا ہے۔",
    "{name} khulta hai. Yeh sarkari site nahi; address official page se liya gaya hai.",
  ),
  copyFailed: c(
    "Couldn't copy on this browser. Nothing was copied.",
    "اس براؤزر میں کاپی نہیں ہو سکا۔ کچھ کاپی نہیں ہوا۔",
    "Is browser mein copy nahi ho saka. Kuch copy nahi hua.",
  ),
  feesTrustNote: c(
    "These amounts follow an official notification. No dated check by a person is on file yet, so confirm at the counter before you pay.",
    "یہ رقوم سرکاری نوٹیفکیشن کے مطابق ہیں۔ کسی فرد کی تاریخ وار جانچ ابھی درج نہیں، اس لیے ادائیگی سے پہلے کاؤنٹر پر تصدیق کر لیں۔",
    "Yeh raqam official notification ke mutabiq hain. Kisi fard ki dated jaanch abhi darj nahi, is liye payment se pehle counter par tasdeeq kar lein.",
  ),
  openLink: c("Opens the official site", "سرکاری سائٹ کھلتی ہے", "Official site khulti hai"),
  copyNumber: c("Copy number", "نمبر کاپی کریں", "Number copy karein"),
  copied: c("Copied", "کاپی ہو گیا", "Copy ho gaya"),
  copyChecklist: c("Copy checklist", "چیک لسٹ کاپی کریں", "Checklist copy karein"),
  shareJourney: c("Share", "شیئر کریں", "Share karein"),
  saveJourney: c("Save journey", "سفر محفوظ کریں", "Journey save karein"),
  savedJourney: c("Saved", "محفوظ ہو گیا", "Save ho gaya"),
  saveFailed: c(
    "Couldn't save. Your progress is still on screen — try again.",
    "محفوظ نہیں ہو سکا۔ آپ کی پیش رفت اسکرین پر موجود ہے — دوبارہ کوشش کریں۔",
    "Save nahi ho saka. Aapki progress screen par maujood hai — dobara koshish karein.",
  ),
  savedLocal: c("Saved on this device", "اس ڈیوائس پر محفوظ", "Is device par save"),
  savedAccount: c("Saved to your account", "آپ کے اکاؤنٹ میں محفوظ", "Aapke account mein save"),
  restartJourney: c("Start over", "دوبارہ شروع کریں", "Dobara shuru karein"),
  restartConfirm: c(
    "Clear your checklist and notes for this journey?",
    "اس سفر کی چیک لسٹ اور نوٹس صاف کریں؟",
    "Is journey ki checklist aur notes saaf karein?",
  ),
  archiveJourney: c("Archive", "آرکائیو", "Archive"),
  deleteJourney: c("Delete", "حذف کریں", "Delete karein"),
  deleteJourneyConfirm: c(
    "Delete this journey? This can't be undone.",
    "یہ سفر حذف کریں؟ یہ واپس نہیں ہو سکتا۔",
    "Yeh journey delete karein? Yeh wapas nahi ho sakta.",
  ),
  knowledgeUpdated: c(
    "Official information was updated since you saved this journey.",
    "آپ کے سفر محفوظ کرنے کے بعد سرکاری معلومات اپ ڈیٹ ہوئی ہیں۔",
    "Aapke journey save karne ke baad official maloomat update hui hain.",
  ),

  // ---- Offices -----------------------------------------------------------------------
  officeTitle: c("Where to go", "کہاں جانا ہے", "Kahan jaana hai"),
  getDirections: c("Get directions", "راستہ دیکھیں", "Raasta dekhein"),
  hoursNotVerified: c(
    "Hours not currently verified.",
    "اوقاتِ کار فی الحال تصدیق شدہ نہیں۔",
    "Auqaat-e-kaar filhaal tasdeeq shuda nahi.",
  ),
  phoneNotVerified: c(
    "Phone number not currently verified.",
    "فون نمبر فی الحال تصدیق شدہ نہیں۔",
    "Phone number filhaal tasdeeq shuda nahi.",
  ),
  hoursLabel: c("Hours", "اوقاتِ کار", "Auqaat-e-kaar"),
  addressLabel: c("Address", "پتہ", "Pata"),
  phoneLabel: c("Phone", "فون", "Phone"),

  // ---- Trust popover ---------------------------------------------------------------------
  trustSource: c("Source", "ماخذ", "Source"),
  trustAgency: c("Agency", "ادارہ", "Idara"),
  trustStatus: c("Status", "حیثیت", "Haisiyat"),
  trustBasis: c("How we know", "ہمیں کیسے معلوم", "Hamein kaise maloom"),
  trustChecked: c("Last read by Raasta", "راستہ نے آخری بار پڑھا", "Raasta ne aakhri baar parha"),
  trustVerified: c("Last human verification", "آخری انسانی تصدیق", "Aakhri insani tasdeeq"),
  trustNone: c("No date on file", "کوئی تاریخ درج نہیں", "Koi tareekh darj nahi"),
  trustOpen: c("Open official source", "سرکاری ماخذ کھولیں", "Official source kholein"),
  trustAria: c(
    "Verification details: {status}",
    "تصدیق کی تفصیل: {status}",
    "Tasdeeq ki tafseel: {status}",
  ),

  // ---- Intake states ---------------------------------------------------------------------
  mapping: c(
    "Mapping your route…",
    "آپ کا راستہ بنایا جا رہا ہے…",
    "Aapka raasta banaya ja raha hai…",
  ),
  mappingSub: c(
    "Matching your goal to verified records.",
    "آپ کے مقصد کو تصدیق شدہ ریکارڈ سے ملایا جا رہا ہے۔",
    "Aapke maqsad ko verified records se milaya ja raha hai.",
  ),
  tryAgain: c("Try again", "دوبارہ کوشش کریں", "Dobara koshish karein"),
  errorTitle: c("That didn't work", "یہ نہیں ہو سکا", "Yeh nahi ho saka"),
  errorBody: c(
    "Something went wrong on our side. Your goal is still here — try again.",
    "ہماری طرف سے کوئی مسئلہ ہوا۔ آپ کا مقصد یہیں موجود ہے — دوبارہ کوشش کریں۔",
    "Hamari taraf se koi masla hua. Aapka maqsad yahin maujood hai — dobara koshish karein.",
  ),
  offlineBanner: c(
    "You're offline. Saved journeys still open; new questions need a connection.",
    "آپ آف لائن ہیں۔ محفوظ سفر کھلتے ہیں؛ نئے سوالات کے لیے انٹرنیٹ چاہیے۔",
    "Aap offline hain. Saved journeys khulti hain; naye sawalon ke liye internet chahiye.",
  ),
  engineFallback: c(
    "Answered by Raasta's built-in router (AI unavailable). Facts are unchanged.",
    "راستہ کے اپنے روٹر نے جواب دیا (AI دستیاب نہیں)۔ معلومات وہی ہیں۔",
    "Raasta ke apne router ne jawab diya (AI dastiyab nahi). Maloomat wohi hain.",
  ),
  rateLimited: c(
    "You're asking too fast. Please wait a moment.",
    "آپ بہت تیزی سے پوچھ رہے ہیں۔ تھوڑا انتظار کریں۔",
    "Aap bohat tezi se pooch rahe hain. Thora intezar karein.",
  ),
  unsupportedTitle: c("Not covered yet", "ابھی شامل نہیں", "Abhi shamil nahi"),
  unsupportedBody: c(
    "Raasta only has verified information for {places} for this service. The process differs elsewhere, so I won't guess.",
    "اس خدمت کے لیے راستہ کے پاس صرف {places} کی تصدیق شدہ معلومات ہیں۔ دوسری جگہ طریقہ مختلف ہوتا ہے، اس لیے اندازہ نہیں لگاؤں گا۔",
    "Is service ke liye Raasta ke paas sirf {places} ki verified maloomat hain. Doosri jagah tareeqa mukhtalif hota hai, is liye andaza nahi lagaunga.",
  ),
  chooseServiceTitle: c(
    "Which service do you need?",
    "آپ کو کون سی خدمت چاہیے؟",
    "Aapko kaun si service chahiye?",
  ),
  chooseServiceBody: c(
    "I couldn't tell which service you mean. Pick one, or describe it differently.",
    "میں سمجھ نہیں سکا کہ آپ کون سی خدمت چاہتے ہیں۔ ایک منتخب کریں، یا مختلف انداز میں بتائیں۔",
    "Main samajh nahi saka ke aap kaun si service chahte hain. Aik chunein, ya mukhtalif andaaz mein bataein.",
  ),
  offTopic: c(
    "I help with Pakistani civic services — CNIC, passports, vehicle transfers and more. What are you trying to get done?",
    "میں پاکستانی سرکاری خدمات میں مدد کرتا ہوں — شناختی کارڈ، پاسپورٹ، گاڑی کی منتقلی وغیرہ۔ آپ کیا کروانا چاہتے ہیں؟",
    "Main Pakistani sarkari khidmaat mein madad karta hoon — CNIC, passport, gaari ki muntaqili waghaira. Aap kya karwana chahte hain?",
  ),
  complaintRedirect: c(
    "Raasta can't file complaints with the government. You can keep a personal record in the Case Tracker and find the official portal there.",
    "راستہ حکومت میں شکایت درج نہیں کر سکتا۔ آپ کیس ٹریکر میں ذاتی ریکارڈ رکھ سکتے ہیں اور وہاں سے سرکاری پورٹل تلاش کر سکتے ہیں۔",
    "Raasta hukumat mein shikayat darj nahi kar sakta. Aap Case Tracker mein zaati record rakh sakte hain aur wahan se official portal dhoond sakte hain.",
  ),
  openCaseTracker: c("Open Case Tracker", "کیس ٹریکر کھولیں", "Case Tracker kholein"),
  askAnother: c("Ask something else", "کچھ اور پوچھیں", "Kuch aur poochein"),
  yourGoal: c("Your goal", "آپ کا مقصد", "Aapka maqsad"),
  followups: c("What next?", "اب کیا؟", "Ab kya?"),
  followFees: c("What are the fees?", "فیس کتنی ہے؟", "Fee kitni hai?"),
  followDocs: c("What do I need to bring?", "کیا ساتھ لانا ہے؟", "Saath kya lana hai?"),
  followOffice: c("Where do I go?", "کہاں جانا ہے؟", "Kahan jaana hai?"),
  focusFees: c("Showing fees", "فیس دکھائی جا رہی ہے", "Fee dikhayi ja rahi hai"),

  // ---- My journeys / demo --------------------------------------------------------------------
  myJourneysTitle: c("My civic tasks", "میرے سرکاری کام", "Mere sarkari kaam"),
  myJourneysSub: c(
    "Pick up where you left off.",
    "جہاں چھوڑا تھا وہیں سے شروع کریں۔",
    "Jahan chora tha wahin se shuru karein.",
  ),
  continueJourney: c("Continue", "جاری رکھیں", "Jaari rakhein"),
  activeJourneys: c("In progress", "جاری", "Jaari"),
  completedJourneys: c("Completed", "مکمل", "Mukammal"),
  archivedJourneys: c("Archived", "آرکائیو شدہ", "Archived"),
  noJourneys: c("No journeys yet", "ابھی کوئی سفر نہیں", "Abhi koi journey nahi"),
  noJourneysBody: c(
    "Start one and save it — it'll show up here with your progress.",
    "ایک شروع کریں اور محفوظ کریں — یہ آپ کی پیش رفت کے ساتھ یہاں نظر آئے گا۔",
    "Aik shuru karein aur save karein — yeh aapki progress ke saath yahan nazar aayegi.",
  ),
  guestStorage: c(
    "These are saved on this device only. Sign in to keep them across devices.",
    "یہ صرف اس ڈیوائس پر محفوظ ہیں۔ تمام ڈیوائسز پر رکھنے کے لیے سائن اِن کریں۔",
    "Yeh sirf is device par save hain. Tamam devices par rakhne ke liye sign in karein.",
  ),
  syncedNote: c(
    "Imported journeys from this device into your account.",
    "اس ڈیوائس کے سفر آپ کے اکاؤنٹ میں شامل کر دیے گئے۔",
    "Is device ki journeys aapke account mein shamil kar di gayin.",
  ),
  demoBanner: c(
    "Demo — real sources, every fact labelled by how well it is backed. No account needed. Your changes stay in this browser.",
    "ڈیمو — اصل ماخذ، ہر معلومات پر اس کی حیثیت درج ہے۔ اکاؤنٹ کی ضرورت نہیں۔ آپ کی تبدیلیاں اسی براؤزر میں رہتی ہیں۔",
    "Demo — asal sources, har maloomat par uski haisiyat likhi hai. Account ki zaroorat nahi. Aapki tabdeeliyan isi browser mein rehti hain.",
  ),
  resetDemo: c("Reset demo", "ڈیمو ری سیٹ کریں", "Demo reset karein"),
  demoKeep: c(
    "Save as my journey",
    "اپنے سفر کے طور پر محفوظ کریں",
    "Apni journey ke taur par save karein",
  ),

  // ---- Services -------------------------------------------------------------------------------
  servicesTitle: c("Explore services", "خدمات دیکھیں", "Services dekhein"),
  servicesSub: c(
    "Start a journey for any of these. Each shows its agency and where it applies.",
    "ان میں سے کسی کا سفر شروع کریں۔ ہر ایک کا ادارہ اور دائرہ دکھایا گیا ہے۔",
    "Inmein se kisi ki journey shuru karein. Har aik ka idara aur daira dikhaya gaya hai.",
  ),
  catAll: c("All", "سب", "Sab"),
  catIdentity: c("Identity", "شناخت", "Shanakht"),
  catTravel: c("Travel", "سفر", "Safar"),
  catVehicles: c("Vehicles", "گاڑیاں", "Gaariyan"),
  catLicences: c("Licences", "لائسنس", "Licences"),
  catTaxes: c("Taxes", "ٹیکس", "Tax"),
  catCertificates: c("Certificates", "سرٹیفکیٹ", "Certificates"),
  catOther: c("Other", "دیگر", "Doosray"),
  startThisJourney: c("Start journey", "سفر شروع کریں", "Journey shuru karein"),
  onlineFull: c("Can be done online", "آن لائن ہو سکتا ہے", "Online ho sakta hai"),
  onlinePartial: c("Partly online", "جزوی آن لائن", "Partly online"),
  onlineOffline: c("In person", "بالمشافہ", "Khud ja kar"),
  verifiedLevel: c("Source status", "ماخذ کی حیثیت", "Source ki halat"),

  // ---- Explain this ------------------------------------------------------------------------------
  explainTitle: c("Explain this instruction", "یہ ہدایت سمجھائیں", "Yeh hidayat samjhayein"),
  explainSub: c(
    "Paste text from an official website or letter. Raasta rewrites it in plain words — without adding anything that isn't in your text.",
    "کسی سرکاری ویب سائٹ یا خط کا متن پیسٹ کریں۔ راستہ اسے آسان الفاظ میں لکھتا ہے — آپ کے متن سے باہر کچھ شامل کیے بغیر۔",
    "Kisi official website ya khat ka text paste karein. Raasta usay aasan alfaz mein likhta hai — aapke text se bahar kuch shamil kiye baghair.",
  ),
  pasteHere: c(
    "Paste official text here",
    "سرکاری متن یہاں پیسٹ کریں",
    "Official text yahan paste karein",
  ),
  explainIn: c("Explain in", "اس زبان میں سمجھائیں", "Is zubaan mein samjhayein"),
  langEn: c("English", "انگریزی", "English"),
  langUr: c("اردو", "اردو", "Urdu"),
  langRoman: c("Roman Urdu", "رومن اردو", "Roman Urdu"),
  explainButton: c("Explain", "سمجھائیں", "Samjhayein"),
  inSimpleWords: c("In simple words", "آسان الفاظ میں", "Aasan alfaz mein"),
  explainGrounded: c(
    "Based only on the text you pasted. This is not a verified Raasta fact — check the official source for current rules.",
    "صرف آپ کے پیسٹ کیے گئے متن پر مبنی۔ یہ راستہ کی تصدیق شدہ معلومات نہیں — موجودہ قواعد کے لیے سرکاری ماخذ دیکھیں۔",
    "Sirf aapke paste kiye text par mabni. Yeh Raasta ki verified maloomat nahi — maujooda qawaid ke liye official source dekhein.",
  ),
  explainRejected: c(
    "I couldn't explain this without adding details that aren't in your text, so I won't guess.",
    "میں آپ کے متن سے باہر کی تفصیلات شامل کیے بغیر اسے نہیں سمجھا سکا، اس لیے اندازہ نہیں لگاؤں گا۔",
    "Main aapke text se bahar ki tafseelat shamil kiye baghair isay nahi samjha saka, is liye andaza nahi lagaunga.",
  ),
  explainUnavailable: c(
    "The explainer isn't available right now. Try again in a moment.",
    "وضاحتی سہولت ابھی دستیاب نہیں۔ تھوڑی دیر میں دوبارہ کوشش کریں۔",
    "Wazahati sahulat abhi dastiyab nahi. Thori der mein dobara koshish karein.",
  ),
  explainSource: c(
    "Where did this text come from? (optional)",
    "یہ متن کہاں سے لیا؟ (اختیاری)",
    "Yeh text kahan se liya? (ikhtiyari)",
  ),

  // ---- Document checker ------------------------------------------------------------------------------
  docTitle: c(
    "Check a document photo",
    "دستاویز کی تصویر چیک کریں",
    "Document ki tasweer check karein",
  ),
  docSub: c(
    "A quick visual check before you go: is it readable, cropped, or blurry?",
    "جانے سے پہلے فوری بصری جانچ: کیا یہ پڑھنے کے قابل ہے، کٹی ہوئی ہے، یا دھندلی؟",
    "Jaane se pehle fori basri jaanch: kya yeh parhne ke qabil hai, kati hui hai, ya dhundli?",
  ),
  docPrivacy: c(
    "Your image will be processed by Raasta's AI service for this visual check and is not stored by Raasta. Avoid uploading more sensitive documents than you need to.",
    "آپ کی تصویر اس بصری جانچ کے لیے راستہ کی AI سروس پر پروسیس ہوگی اور راستہ اسے محفوظ نہیں کرتا۔ ضرورت سے زیادہ حساس دستاویزات اپ لوڈ نہ کریں۔",
    "Aapki tasweer is basri jaanch ke liye Raasta ki AI service par process hogi aur Raasta isay save nahi karta. Zaroorat se ziada hassas documents upload na karein.",
  ),
  docBoundary: c(
    "This is a visual check only. Raasta cannot confirm that a document is authentic, valid, or will be accepted.",
    "یہ صرف بصری جانچ ہے۔ راستہ تصدیق نہیں کر سکتا کہ دستاویز اصلی، درست یا قابلِ قبول ہے۔",
    "Yeh sirf basri jaanch hai. Raasta tasdeeq nahi kar sakta ke document asli, durust ya qabil-e-qubool hai.",
  ),
  docChoose: c("Choose a photo", "تصویر منتخب کریں", "Tasweer chunein"),
  docConsent: c("Check this photo", "اس تصویر کو چیک کریں", "Is tasweer ko check karein"),
  docChecking: c("Checking the photo…", "تصویر چیک ہو رہی ہے…", "Tasweer check ho rahi hai…"),
  docPreparing: c(
    "Removing location data and resizing…",
    "مقام کا ڈیٹا ہٹایا جا رہا ہے اور سائز کم کیا جا رہا ہے…",
    "Location data hataya ja raha hai aur size kam kiya ja raha hai…",
  ),
  docRemoveImage: c("Remove photo", "تصویر ہٹائیں", "Tasweer hatayein"),
  docReadable: c("Readability", "پڑھنے کی صلاحیت", "Parhne ki salahiyat"),
  docGood: c("Looks clear", "صاف نظر آتی ہے", "Saaf nazar aati hai"),
  docPoor: c("Hard to read", "پڑھنا مشکل", "Parhna mushkil"),
  docUnreadable: c("Unreadable", "پڑھی نہیں جا سکتی", "Parhi nahi ja sakti"),
  docObservations: c("What I can see", "جو مجھے نظر آ رہا ہے", "Jo mujhe nazar aa raha hai"),
  docProblems: c("Possible problems", "ممکنہ مسائل", "Mumkin masail"),
  docNext: c("What to do next", "اب کیا کریں", "Ab kya karein"),
  docError: c(
    "Could not check that photo. Try a clearer or smaller image.",
    "یہ تصویر چیک نہیں ہو سکی۔ زیادہ صاف یا چھوٹی تصویر آزمائیں۔",
    "Yeh tasweer check nahi ho saki. Ziada saaf ya chhoti tasweer aazmayein.",
  ),

  // ---- Case tracker --------------------------------------------------------------------------------------
  caseTitle: c("Raasta Case Tracker", "راستہ کیس ٹریکر", "Raasta Case Tracker"),
  caseSub: c(
    "Keep your own record of a problem with a government service. Raasta does not submit anything to any government system.",
    "سرکاری خدمت کے مسئلے کا اپنا ذاتی ریکارڈ رکھیں۔ راستہ کسی سرکاری نظام میں کچھ جمع نہیں کرتا۔",
    "Sarkari service ke masle ka apna zaati record rakhein. Raasta kisi sarkari nizam mein kuch jama nahi karta.",
  ),
  caseDisclaimer: c(
    "Not connected to any government system. File your complaint on the official portal, then record its reference number here.",
    "کسی سرکاری نظام سے منسلک نہیں۔ شکایت سرکاری پورٹل پر درج کریں، پھر اس کا حوالہ نمبر یہاں لکھیں۔",
    "Kisi sarkari nizam se mansalik nahi. Shikayat official portal par darj karein, phir uska reference number yahan likhein.",
  ),
  newCase: c("Record a case", "کیس درج کریں", "Case record karein"),
  raastaStatus: c("Raasta status", "راستہ کی حیثیت", "Raasta ki halat"),
  officialStatus: c("Official status", "سرکاری حیثیت", "Official halat"),
  notConnected: c("Not connected", "منسلک نہیں", "Connected nahi"),
  officialRef: c("Official reference number", "سرکاری حوالہ نمبر", "Official reference number"),
  officialRefHint: c(
    "From the government portal or office, if you filed there",
    "سرکاری پورٹل یا دفتر سے، اگر وہاں درج کی ہو",
    "Sarkari portal ya office se, agar wahan darj ki ho",
  ),
  caseSubject: c(
    "What happened (short title)",
    "کیا ہوا (مختصر عنوان)",
    "Kya hua (mukhtasar unwan)",
  ),
  caseDetails: c("Details", "تفصیلات", "Tafseelat"),
  caseDepartment: c("Department", "محکمہ", "Mehkama"),
  caseCategory: c("Issue", "مسئلہ", "Masla"),
  caseCity: c("City", "شہر", "Shehar"),
  caseSave: c("Save record", "ریکارڈ محفوظ کریں", "Record save karein"),
  caseSaved: c(
    "Recorded in your Raasta Case Tracker.",
    "آپ کے راستہ کیس ٹریکر میں درج ہو گیا۔",
    "Aapke Raasta Case Tracker mein darj ho gaya.",
  ),
  caseEmpty: c("No cases recorded", "کوئی کیس درج نہیں", "Koi case darj nahi"),
  caseEmptyBody: c(
    "When something goes wrong at a government office, note it here while it's fresh.",
    "سرکاری دفتر میں کچھ غلط ہو تو یہاں تازہ تازہ لکھ لیں۔",
    "Sarkari office mein kuch ghalat ho to yahan taza taza likh lein.",
  ),
  caseTimeline: c("Your timeline", "آپ کی ٹائم لائن", "Aapki timeline"),
  caseAddNote: c("Add a note", "نوٹ شامل کریں", "Note shamil karein"),
  caseOpenPortal: c(
    "Find the official portal",
    "سرکاری پورٹل تلاش کریں",
    "Official portal dhoondein",
  ),
  caseSignIn: c(
    "Sign in to keep a private record. Only you can see it.",
    "نجی ریکارڈ رکھنے کے لیے سائن اِن کریں۔ صرف آپ اسے دیکھ سکتے ہیں۔",
    "Nijji record rakhne ke liye sign in karein. Sirf aap isay dekh sakte hain.",
  ),
  csRecorded: c("Recorded", "درج", "Darj"),
  csFollowUp: c("Follow-up needed", "فالو اپ درکار", "Follow-up darkaar"),
  csWaiting: c("Waiting for a response", "جواب کا انتظار", "Jawab ka intezar"),
  csEscalated: c("Escalated", "اعلیٰ سطح پر بھیجا", "Escalate kiya"),
  csResolved: c("Resolved", "حل ہو گیا", "Hal ho gaya"),
  csClosed: c("Closed", "بند", "Band"),

  // ---- Account & privacy ----------------------------------------------------------------------------------------
  accountTitle: c("Your account", "آپ کا اکاؤنٹ", "Aapka account"),
  privacyTitle: c("Your data", "آپ کا ڈیٹا", "Aapka data"),
  privacyRetention: c(
    "Journeys, notes and cases are stored in your account and visible only to you. Document photos are never stored by Raasta.",
    "سفر، نوٹس اور کیس آپ کے اکاؤنٹ میں محفوظ ہیں اور صرف آپ کو نظر آتے ہیں۔ دستاویز کی تصاویر راستہ کبھی محفوظ نہیں کرتا۔",
    "Journeys, notes aur cases aapke account mein save hain aur sirf aapko nazar aate hain. Document ki tasaweer Raasta kabhi save nahi karta.",
  ),
  deleteMyData: c(
    "Delete my saved data",
    "میرا محفوظ ڈیٹا حذف کریں",
    "Mera saved data delete karein",
  ),
  deleteMyDataConfirm: c(
    "Delete all your journeys, conversations and cases? This can't be undone.",
    "اپنے تمام سفر، گفتگو اور کیس حذف کریں؟ یہ واپس نہیں ہو سکتا۔",
    "Apni tamam journeys, guftagu aur cases delete karein? Yeh wapas nahi ho sakta.",
  ),
  deleteAccount: c("Delete my account", "میرا اکاؤنٹ حذف کریں", "Mera account delete karein"),
  deleteAccountConfirm: c(
    "Permanently delete your account and everything in it? This can't be undone.",
    "اپنا اکاؤنٹ اور اس میں موجود سب کچھ مستقل طور پر حذف کریں؟ یہ واپس نہیں ہو سکتا۔",
    "Apna account aur usmein maujood sab kuch mustaqil taur par delete karein? Yeh wapas nahi ho sakta.",
  ),
  dataDeleted: c(
    "Your saved data was deleted.",
    "آپ کا محفوظ ڈیٹا حذف ہو گیا۔",
    "Aapka saved data delete ho gaya.",
  ),
  cancel: c("Cancel", "منسوخ کریں", "Cancel"),
  confirm: c("Confirm", "تصدیق کریں", "Confirm"),
  loading: c("Loading…", "لوڈ ہو رہا ہے…", "Load ho raha hai…"),
  close: c("Close", "بند کریں", "Band karein"),
  offlineFallbackTitle: c("You're offline", "آپ آف لائن ہیں", "Aap offline hain"),
  offlineFallbackBody: c(
    "Reconnect to ask a new question. Journeys you've opened before are still available.",
    "نیا سوال پوچھنے کے لیے انٹرنیٹ سے جڑیں۔ پہلے کھولے گئے سفر دستیاب ہیں۔",
    "Naya sawal poochne ke liye internet se judein. Pehle khole gaye safar dastiyab hain.",
  ),
} as const satisfies Record<string, Trio>;

export type CopyKey = keyof typeof COPY;

export function copy(key: CopyKey, lang: Lang): string {
  return COPY[key][lang];
}

/** Fill {placeholders}: tf("stepOf", "en", { n: 2, total: 5 }) */
export function tf(key: CopyKey, lang: Lang, vars: Record<string, string | number>): string {
  return COPY[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
