import type { UiLanguage } from "./types";

type Key =
  | "tagline"
  | "dashboard"
  | "check"
  | "history"
  | "insights"
  | "learn"
  | "quiz"
  | "family"
  | "report"
  | "privacy"
  | "alerts"
  | "assistant"
  | "settings"
  | "checkMessage"
  | "checkLink"
  | "checkPhone"
  | "checkQr"
  | "checkEmail"
  | "checkScreenshot"
  | "analyze"
  | "clear"
  | "example"
  | "whatToCheck"
  | "greeting"
  | "greetingSub"
  | "disclaimer";

const en: Record<Key, string> = {
  tagline: "Pause. Check. Stay Safe.",
  dashboard: "Home",
  check: "Check",
  history: "History",
  insights: "Insights",
  learn: "Learn",
  quiz: "Quiz",
  family: "Family",
  report: "Report",
  privacy: "Privacy",
  alerts: "Alerts",
  assistant: "Assistant",
  settings: "Settings",
  checkMessage: "Check Message",
  checkLink: "Check Link",
  checkPhone: "Check Phone Number",
  checkQr: "Check QR Code",
  checkEmail: "Check Email",
  checkScreenshot: "Check Screenshot",
  analyze: "Analyze",
  clear: "Clear",
  example: "Example",
  whatToCheck: "What would you like to check?",
  greeting: "Hello 👋",
  greetingSub: "Stay safe, one message at a time.",
  disclaimer: "AI-assisted analysis. Always verify important information independently.",
};

const hi: Record<Key, string> = {
  tagline: "रुकें। जाँचें। सुरक्षित रहें।",
  dashboard: "होम",
  check: "जाँच",
  history: "इतिहास",
  insights: "जानकारी",
  learn: "सीखें",
  quiz: "प्रश्नोत्तरी",
  family: "परिवार",
  report: "रिपोर्ट",
  privacy: "निजता",
  alerts: "चेतावनी",
  assistant: "सहायक",
  settings: "सेटिंग्स",
  checkMessage: "संदेश जाँचें",
  checkLink: "लिंक जाँचें",
  checkPhone: "फ़ोन नंबर जाँचें",
  checkQr: "QR कोड जाँचें",
  checkEmail: "ईमेल जाँचें",
  checkScreenshot: "स्क्रीनशॉट जाँचें",
  analyze: "जाँच करें",
  clear: "मिटाएँ",
  example: "उदाहरण",
  whatToCheck: "आप क्या जाँचना चाहते हैं?",
  greeting: "नमस्ते 👋",
  greetingSub: "एक-एक संदेश जाँचकर सुरक्षित रहें।",
  disclaimer: "AI-सहायित विश्लेषण। महत्वपूर्ण जानकारी स्वयं भी सत्यापित करें।",
};

const bn: Record<Key, string> = {
  tagline: "থামুন। যাচাই করুন। নিরাপদ থাকুন।",
  dashboard: "হোম",
  check: "যাচাই",
  history: "ইতিহাস",
  insights: "বিশ্লেষণ",
  learn: "শিখুন",
  quiz: "কুইজ",
  family: "পরিবার",
  report: "রিপোর্ট",
  privacy: "গোপনীয়তা",
  alerts: "সতর্কতা",
  assistant: "সহায়ক",
  settings: "সেটিংস",
  checkMessage: "মেসেজ যাচাই",
  checkLink: "লিংক যাচাই",
  checkPhone: "ফোন নম্বর যাচাই",
  checkQr: "QR কোড যাচাই",
  checkEmail: "ইমেল যাচাই",
  checkScreenshot: "স্ক্রিনশট যাচাই",
  analyze: "যাচাই করুন",
  clear: "মুছুন",
  example: "উদাহরণ",
  whatToCheck: "আপনি কী যাচাই করতে চান?",
  greeting: "নমস্কার 👋",
  greetingSub: "একটি একটি মেসেজ যাচাই করে নিরাপদ থাকুন।",
  disclaimer: "AI-সহায়ক বিশ্লেষণ। গুরুত্বপূর্ণ তথ্য নিজেও যাচাই করুন।",
};

const DICT: Record<UiLanguage, Record<Key, string>> = { en, hi, bn };

export function t(lang: UiLanguage, key: Key) {
  return DICT[lang][key] ?? en[key];
}

export const LANGUAGES: { code: UiLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
];
