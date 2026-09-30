/**
 * Mock, rule-based analysis service.
 * Replace the exported functions with real backend calls later — the UI only
 * depends on the returned AnalysisResult shape.
 */
import { levelFromScore } from "@/lib/risk";
import type {
  AnalysisResult,
  CheckKind,
  Highlight,
  Signal,
  UiLanguage,
} from "@/lib/types";

const URGENCY = [
  "urgent",
  "immediately",
  "today",
  "expire",
  "expires",
  "blocked",
  "block",
  "suspend",
  "last chance",
  "within 24 hours",
  "आज",
  "तुरंत",
  "আজই",
  "বন্ধ",
];
const CREDENTIAL = [
  "otp",
  "pin",
  "cvv",
  "password",
  "netbanking",
  "aadhaar",
  "pan number",
  "kyc",
  "account number",
  "debit card",
  "upi pin",
];
const REWARD = ["won", "winner", "prize", "lottery", "reward", "cashback", "lucky", "जीत", "পুরস্কার"];
const MONEY = ["pay", "payment", "transfer", "fee", "deposit", "₹", "rs.", "rupees", "upi"];
const BRANDS = ["sbi", "hdfc", "icici", "paytm", "phonepe", "amazon", "flipkart", "irctc", "bank"];
const SHORTENERS = ["bit.ly", "tinyurl", "t.co", "rb.gy", "cutt.ly", "is.gd", "shorturl"];

const URL_RE = /\bhttps?:\/\/[^\s]+|\b[a-z0-9-]+\.(com|in|net|org|xyz|top|info|co)[^\s]*/gi;

const id = () => Math.random().toString(36).slice(2, 10);

function has(text: string, list: string[]) {
  const t = text.toLowerCase();
  return list.filter((w) => t.includes(w));
}

export function analyseText(
  input: string,
  kind: CheckKind = "message",
  language: UiLanguage = "en",
): AnalysisResult {
  const text = input.trim();
  const signals: Signal[] = [];
  const highlights: Highlight[] = [];
  const reasons: string[] = [];
  const actions: string[] = [];
  let score = 6;

  const urls = text.match(URL_RE) ?? [];
  const urgency = has(text, URGENCY);
  const credentials = has(text, CREDENTIAL);
  const rewards = has(text, REWARD);
  const money = has(text, MONEY);
  const brands = has(text, BRANDS);
  const shortened = urls.filter((u) => SHORTENERS.some((s) => u.toLowerCase().includes(s)));

  // Language ---------------------------------------------------------
  if (urgency.length) {
    score += 22;
    reasons.push("Urgent language pressures you to act fast");
    highlights.push(...urgency.slice(0, 3).map((p) => ({
      phrase: p,
      why: "Scammers create urgency so you act before you verify.",
    })));
    signals.push({
      category: "Language",
      severity: urgency.length > 1 ? "critical" : "warn",
      title: "Creates urgency or fear",
      explanation:
        "The wording pushes for an immediate decision — often by threatening that something will be blocked or expire.",
    });
  } else {
    signals.push({
      category: "Language",
      severity: "ok",
      title: "Tone reads normally",
      explanation: "No deadline pressure or threats were detected in the wording.",
    });
  }

  // Request ----------------------------------------------------------
  if (credentials.length) {
    score += 34;
    reasons.push("Asks for personal, OTP or banking details");
    highlights.push(...credentials.slice(0, 3).map((p) => ({
      phrase: p,
      why: "No genuine bank or company asks for an OTP, PIN or password in a message.",
    })));
    signals.push({
      category: "Request",
      severity: "critical",
      title: "Requests sensitive information",
      explanation:
        "Sharing an OTP, PIN, card number or KYC detail is enough for someone to empty an account.",
    });
    actions.push("Never share your OTP, PIN or password — not even with 'bank staff'.");
  }

  if (money.length && (urgency.length || rewards.length)) {
    score += 12;
    reasons.push("Involves a payment or money transfer");
    signals.push({
      category: "Behavior",
      severity: "warn",
      title: "Money is involved",
      explanation: "A payment, fee or transfer is mentioned alongside pressure to hurry.",
    });
    actions.push("Verify the recipient through an official app before paying anything.");
  }

  // URL --------------------------------------------------------------
  if (shortened.length) {
    score += 20;
    reasons.push("Shortened link hides its real destination");
    signals.push({
      category: "URL",
      severity: "critical",
      title: "Shortened link",
      explanation: `${shortened[0]} hides where it actually leads. You cannot tell the real website until you have already opened it.`,
    });
    actions.push("Do not open the link. Type the official website address yourself.");
  } else if (urls.length) {
    const brandInUrl = brands.some((b) => urls.join(" ").toLowerCase().includes(b));
    score += brandInUrl ? 18 : 8;
    signals.push({
      category: "URL",
      severity: brandInUrl ? "warn" : "ok",
      title: brandInUrl ? "Brand name inside an unofficial address" : "Link present",
      explanation: brandInUrl
        ? "The address contains a well-known brand name but is not the organisation's official domain."
        : "A link was found. Check the exact spelling of the domain before opening it.",
    });
    if (brandInUrl) reasons.push("Web address imitates a known brand");
  } else {
    signals.push({
      category: "URL",
      severity: "ok",
      title: "No links found",
      explanation: "Nothing to open, so there is no link risk in this text.",
    });
  }

  // Reward / lottery -------------------------------------------------
  if (rewards.length) {
    score += 24;
    reasons.push("Promises a prize, reward or easy money");
    highlights.push({
      phrase: rewards[0],
      why: "Unexpected winnings are one of the most common scam hooks.",
    });
    signals.push({
      category: "Context",
      severity: "critical",
      title: "Unexpected reward",
      explanation:
        "You cannot win a lottery or prize you never entered. The 'claim' step exists to collect money or details.",
    });
  }

  // Sender -----------------------------------------------------------
  if (brands.length) {
    signals.push({
      category: "Sender",
      severity: urgency.length || credentials.length ? "warn" : "ok",
      title: `Claims to be ${brands[0].toUpperCase()}`,
      explanation:
        "Organisation names are easy to fake. Contact them using the number printed on their official app or website instead.",
    });
    if (urgency.length || credentials.length) {
      reasons.push("Possible impersonation of a known organisation");
      actions.push("Open your bank's official app directly instead of replying here.");
    }
  } else {
    signals.push({
      category: "Sender",
      severity: "warn",
      title: "Sender cannot be verified",
      explanation: "We have no way to confirm who sent this. Treat unknown senders with care.",
    });
    score += 6;
  }

  if (text.length < 12) {
    score = 0;
  }

  score = Math.max(0, Math.min(97, score));
  const level = text.length < 12 ? "unknown" : levelFromScore(score);

  if (level === "high") {
    actions.unshift("Do not reply, click or call back.");
    actions.push("Report this message so others are warned.");
  }
  if (level === "safe") {
    actions.push("Still confirm anything money-related through an official channel.");
  }
  actions.push("Ask someone you trust for a second opinion if you are unsure.");

  const headline =
    level === "high"
      ? "Don't trust this message"
      : level === "suspicious"
        ? "Potential scam"
        : level === "safe"
          ? "Looks okay"
          : "Not enough to check";

  const summary =
    level === "high"
      ? "This shows several signs commonly associated with scams. Please do not click the link or send money."
      : level === "suspicious"
        ? "Some warning signs were found. Verify with the organisation before you act."
        : level === "safe"
          ? "We found no strong warning signs. Stay alert anyway."
          : "Paste a bit more of the message so we can read it properly.";

  return {
    id: id(),
    kind,
    input: text,
    createdAt: new Date().toISOString(),
    level,
    score,
    headline,
    summary,
    reasons: reasons.length ? reasons : ["No strong warning signs found"],
    signals,
    highlights,
    actions: Array.from(new Set(actions)),
    language,
  };
}

export function analyseLink(url: string, language: UiLanguage = "en"): AnalysisResult {
  const clean = url.trim();
  const base = analyseText(clean, "link", language);
  const lower = clean.toLowerCase();
  const isHttps = lower.startsWith("https://");
  const host = lower.replace(/^https?:\/\//, "").split("/")[0] ?? lower;
  const hyphens = (host.match(/-/g) ?? []).length;

  const signals: Signal[] = [
    {
      category: "URL",
      severity: isHttps ? "ok" : "warn",
      title: isHttps ? "Uses a secure connection (https)" : "No secure connection (http)",
      explanation: isHttps
        ? "The padlock only means the connection is encrypted — it does not mean the site is honest."
        : "This address is not encrypted. Never type personal details into it.",
    },
    {
      category: "Context",
      severity: hyphens >= 2 ? "warn" : "ok",
      title: hyphens >= 2 ? "Unusual domain structure" : "Domain structure looks ordinary",
      explanation:
        hyphens >= 2
          ? "Lots of hyphens and extra words like 'secure-login' are typical of copycat pages."
          : "The domain does not use the extra words copycat pages usually add.",
    },
    {
      category: "Behavior",
      severity: "warn",
      title: "Domain age unknown (demo data)",
      explanation:
        "Very new domains are riskier. A real check would look this up with a domain registry.",
    },
    ...base.signals.filter((s) => s.category === "URL" && s.title !== "No links found"),
  ];

  let score = base.score + (isHttps ? 0 : 14) + (hyphens >= 2 ? 16 : 0);
  score = Math.min(97, score);
  const level = clean.length < 5 ? "unknown" : levelFromScore(score);

  return {
    ...base,
    kind: "link",
    score,
    level,
    signals,
    headline:
      level === "high"
        ? "Don't open this link"
        : level === "suspicious"
          ? "Suspicious domain"
          : level === "safe"
            ? "No strong warning signs"
            : "Paste a full web address",
    summary:
      level === "safe"
        ? "We found no strong warning signs, but always check the spelling of the address."
        : "This address has warning signs. Open the organisation's official app instead of this link.",
    reasons: [
      ...(isHttps ? [] : ["No secure (https) connection"]),
      ...(hyphens >= 2 ? ["Domain uses copycat-style extra words"] : []),
      ...base.reasons.filter((r) => r !== "No strong warning signs found"),
    ].slice(0, 6) || base.reasons,
    actions: [
      "Never open a link you did not expect.",
      "Type the official address yourself instead of tapping.",
      ...base.actions,
    ],
  };
}

const REPORTED_NUMBERS: Record<string, { level: "suspicious" | "high"; note: string }> = {
  "9812345678": { level: "high", note: "Reported 214 times for fake KYC calls (demo data)." },
  "9000000001": { level: "high", note: "Reported for fake courier delivery calls (demo data)." },
  "8800112233": { level: "suspicious", note: "A few reports for job-offer spam (demo data)." },
};

export function analysePhone(raw: string, language: UiLanguage = "en"): AnalysisResult {
  const digits = raw.replace(/\D/g, "").slice(-10);
  const match = REPORTED_NUMBERS[digits];
  const known = Boolean(match);
  const score = match ? (match.level === "high" ? 84 : 48) : digits.length === 10 ? 22 : 0;
  const level = digits.length !== 10 ? "unknown" : match ? match.level : "safe";

  return {
    id: id(),
    kind: "phone",
    input: raw,
    createdAt: new Date().toISOString(),
    level,
    score,
    headline:
      level === "high"
        ? "This number is widely reported"
        : level === "suspicious"
          ? "A few reports exist"
          : level === "safe"
            ? "No reports found"
            : "Enter a 10-digit number",
    summary: known
      ? match!.note
      : "Number reputation is an indicator, not proof of fraud. Judge the call by what it asks for.",
    reasons: known
      ? [match!.note, "Possible impersonation of a bank or courier"]
      : ["No community reports in our demo directory"],
    signals: [
      {
        category: "Sender",
        severity: known ? "critical" : "ok",
        title: known ? "Reported by other people" : "Not in our report list",
        explanation: known
          ? match!.note
          : "That does not make it genuine — new numbers are used every day.",
      },
      {
        category: "Behavior",
        severity: "warn",
        title: "Caller ID can be faked",
        explanation:
          "A call can be made to look like it comes from a bank. Hang up and call back on the official number.",
      },
      {
        category: "Request",
        severity: "warn",
        title: "Watch what they ask for",
        explanation: "Any request for an OTP, PIN, remote access or payment is a scam, whoever calls.",
      },
    ],
    highlights: [],
    actions: [
      "Hang up and call the organisation on its official number.",
      "Never share an OTP or PIN over a call.",
      "Block and report the number if it calls again.",
    ],
    language,
  };
}

export function analyseUpi(payload: string, language: UiLanguage = "en"): AnalysisResult {
  const lower = payload.toLowerCase();
  const isUpi = lower.includes("upi://") || lower.includes("@");
  if (!isUpi) return analyseLink(payload, language);

  const amountMatch = payload.match(/am=(\d+(\.\d+)?)/i);
  const amount = amountMatch ? Number(amountMatch[1]) : null;
  const payee = payload.match(/pa=([^&\s]+)/i)?.[1] ?? payload.match(/[\w.-]+@[\w]+/)?.[0] ?? "unknown";
  let score = 46;
  const reasons = ["QR asks you to send money, not receive it", `Payee ID is unfamiliar: ${payee}`];
  if (amount && amount > 0) {
    score += 18;
    reasons.push(`A fixed amount of ₹${amount} is pre-filled`);
  }
  const level = levelFromScore(score);

  return {
    id: id(),
    kind: "qr",
    input: payload,
    createdAt: new Date().toISOString(),
    level,
    score,
    headline: "Before you pay",
    summary:
      "A QR code can only send money from you. If someone says scanning will 'receive' a refund or prize, it is a scam.",
    reasons,
    signals: [
      {
        category: "Request",
        severity: "critical",
        title: "This QR sends money out of your account",
        explanation: "Scanning a code never credits money to you, whatever the caller claims.",
      },
      {
        category: "Sender",
        severity: "warn",
        title: `Unverified payee (${payee})`,
        explanation: "The name shown in your payment app is the only thing you should trust.",
      },
      {
        category: "Context",
        severity: amount ? "warn" : "ok",
        title: amount ? `Pre-filled amount ₹${amount}` : "No pre-filled amount",
        explanation: amount
          ? "A pre-filled amount means the sender decided how much you pay."
          : "You will be asked to enter the amount yourself.",
      },
    ],
    highlights: [],
    actions: [
      "Never scan a QR code to receive money — it does not work that way.",
      "Check the payee name in your payment app before confirming.",
      "Cancel if the merchant name does not match who you are paying.",
    ],
    language,
  };
}

export const EXAMPLES: Record<CheckKind, string> = {
  message:
    "Congratulations! You have won ₹25,000 in the KBC lucky draw. Click here to claim your prize today before it expires: bit.ly/claim-25k. Share your OTP to verify.",
  email:
    "From: alerts@sbi-securehelp.com\nSubject: Your account will be BLOCKED today\n\nDear customer, your KYC is incomplete. Update immediately at http://sbi-kyc-verify-online.com or your netbanking will be suspended. Keep your debit card and OTP ready.",
  link: "https://paytm-secure-login-verify.com/kyc",
  phone: "+91 98123 45678",
  qr: "upi://pay?pa=quickrefund@okaxis&pn=Refund%20Desk&am=4999&cu=INR",
  screenshot:
    "Your parcel is held at customs. Pay ₹49 delivery fee within 24 hours at bit.ly/parcel-fee or it will be returned.",
};

export const SCAN_STAGES = [
  "Reading the message…",
  "Checking language patterns…",
  "Checking suspicious requests…",
  "Checking links…",
  "Comparing known scam patterns…",
  "Writing a plain explanation…",
];
