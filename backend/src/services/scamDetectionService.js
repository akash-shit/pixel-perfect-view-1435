export const DETECTION_CONFIG = Object.freeze({
  thresholds: Object.freeze({ lowMax: 29, suspiciousMax: 59, highMax: 79 }),
  weights: Object.freeze({
    urgency: 18,
    credential_request: 28,
    payment_request: 18,
    threat: 22,
    lottery: 20,
    job_scam: 18,
    remote_access: 25,
    suspicious_link: 18,
    qr_payment: 28,
    reported_phone_suspicious: 48,
    reported_phone_high: 84,
  }),
});

const RULES = [
  {
    id: "urgency",
    phrases: ["urgent", "immediately", "today", "act now", "last warning", "within 24 hours", "expires today", "right away"],
    reason: "Urgent language pressures you to act quickly.",
  },
  {
    id: "credential_request",
    phrases: ["otp", "one-time password", "verification code", "password", "pin", "cvv", "card number", "aadhaar", "bank details", "account number", "kyc"],
    reason: "Sensitive information or account verification is mentioned.",
  },
  {
    id: "payment_request",
    phrases: ["pay now", "processing fee", "refund fee", "deposit", "transfer money", "upi", "qr code", "collect request", "send money"],
    reason: "A payment, transfer, or payment request is mentioned.",
  },
  {
    id: "threat",
    phrases: ["arrest", "police case", "legal action", "account will be blocked", "account blocked", "account suspended", "electricity disconnected", "will be disconnected"],
    reason: "Threatening consequences may be used to frighten you into acting.",
  },
  {
    id: "lottery",
    phrases: ["you won", "lottery", "prize", "congratulations", "processing fee", "claim your reward"],
    reason: "An unexpected prize or reward is mentioned.",
  },
  {
    id: "job_scam",
    phrases: ["earn money", "work from home", "daily income", "pay to start", "investment required", "easy earnings"],
    reason: "The message describes unusually easy earnings or asks for money to start work.",
  },
  {
    id: "remote_access",
    phrases: ["anydesk", "teamviewer", "remote access", "screen sharing", "install this app", "share your screen"],
    reason: "Remote-access or screen-sharing software is mentioned.",
  },
];

const SHORTENER_HOSTS = new Set(["bit.ly", "tinyurl.com", "t.co", "rb.gy", "cutt.ly", "is.gd", "shorturl.at"]);
const DOMAIN_TERMS = ["verify", "claim", "refund", "kyc", "login", "secure", "update"];
const DEMO_REPORTED_NUMBERS = new Map([
  ["9812345678", "reported_phone_high"],
  ["9000000001", "reported_phone_high"],
  ["8800112233", "reported_phone_suspicious"],
]);
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9][a-z0-9.-]*\.(?:com|in|net|org|xyz|top|info|co|io)(?:\/[^\s<>"']*)?/gi;

function extractUrls(text) {
  return text.match(URL_PATTERN) || [];
}

function hasSuspiciousLink(urls) {
  return urls.some((rawUrl) => {
    try {
      const normalized = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`;
      const host = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
      if (SHORTENER_HOSTS.has(host)) return true;

      const labels = host.split(".");
      const hyphenCount = (host.match(/-/g) || []).length;
      const suspiciousTerm = DOMAIN_TERMS.some((term) => host.includes(term));
      const unusualStructure = labels.length >= 4 || hyphenCount >= 2 || host.startsWith("xn--");

      return unusualStructure || (suspiciousTerm && hyphenCount >= 1);
    } catch {
      return false;
    }
  });
}

export function getRiskLevel(score) {
  const { lowMax, suspiciousMax, highMax } = DETECTION_CONFIG.thresholds;
  if (score <= lowMax) return "low";
  if (score <= suspiciousMax) return "suspicious";
  if (score <= highMax) return "high";
  return "very_high";
}

export function analyzeScam(content, type = "message", displayType = type) {
  const text = content.trim();
  const lower = text.toLowerCase();
  const matchedSignals = RULES.filter((rule) => rule.phrases.some((phrase) => lower.includes(phrase))).map((rule) => rule.id);
  const urls = extractUrls(text);
  if ((type === "link" && hasSuspiciousLink([text])) || hasSuspiciousLink(urls)) {
    matchedSignals.push("suspicious_link");
  }
  if (displayType === "qr" && /upi:\/\/|qr code|collect request/i.test(text)) {
    matchedSignals.push("qr_payment");
  }
  if (type === "phone") {
    matchedSignals.push("caller_identity_unverified");
    const digits = text.replace(/\D/g, "").slice(-10);
    const reportedSignal = DEMO_REPORTED_NUMBERS.get(digits);
    if (reportedSignal) matchedSignals.push(reportedSignal);
  }

  const uniqueSignals = [...new Set(matchedSignals)];
  const total = uniqueSignals.reduce((score, signal) => score + (DETECTION_CONFIG.weights[signal] || 0), 0);
  const hasKnownPhoneReport = uniqueSignals.some((signal) => signal.startsWith("reported_phone_"));
  const riskScore = Math.min(100, type === "phone" && !hasKnownPhoneReport ? Math.min(29, total || 10) : total);
  const riskLevel = getRiskLevel(riskScore);
  const reasons = uniqueSignals
    .map((signal) => RULES.find((rule) => rule.id === signal)?.reason)
    .filter(Boolean);
  if (uniqueSignals.includes("suspicious_link")) reasons.push("The web address has an unusual structure or hides its destination.");
  if (uniqueSignals.includes("caller_identity_unverified")) reasons.push("A phone number alone cannot confirm who is calling.");
  if (uniqueSignals.includes("qr_payment")) reasons.push("This QR or UPI detail may start a payment instead of sending money to you.");
  if (uniqueSignals.some((signal) => signal.startsWith("reported_phone_"))) {
    reasons.push("This number appears in the app's demo report list; community reports are indicators, not proof.");
  }

  const recommendedActions = [
    "Verify using the organization's official app or website, not a message link.",
    "Do not share an OTP, PIN, password, or banking details.",
    "Ask a trusted family member before sending money or acting under pressure.",
  ];
  if (uniqueSignals.includes("suspicious_link")) recommendedActions.unshift("Do not click the link; open the official website yourself.");
  if (type === "phone") recommendedActions.unshift("Hang up and call back using a number from an official source.");
  if (uniqueSignals.includes("qr_payment")) {
    recommendedActions.unshift("Never scan a QR code to receive money; check the payee before confirming a payment.");
  }

  return {
    riskScore,
    riskLevel,
    reasons: reasons.length ? reasons : ["No strong warning signals were found by these rules."],
    recommendedActions: [...new Set(recommendedActions)],
    matchedSignals: uniqueSignals,
  };
}

export function redactSensitiveInput(input) {
  return input
    .replace(/\b(?:one[- ]time password|verification code|otp)\s*(?:is|:|=)?\s*\d{4,8}\b/gi, (value) => value.replace(/\d{4,8}$/, "[REDACTED]"))
    .replace(/\b(?:password|passcode|pin)\s*(?:is|:|=)?\s*[A-Za-z0-9!@#$%^&*._-]{4,72}\b/gi, (value) => value.replace(/[A-Za-z0-9!@#$%^&*._-]{4,72}$/i, "[REDACTED]"))
    .replace(/\b(?:cvv|cvc)\s*(?:is|:|=)?\s*\d{3,4}\b/gi, (value) => value.replace(/\d{3,4}$/, "[REDACTED]"))
    .replace(/\b(?:aadhaar|aadhar|account number|bank account)\s*(?:is|:|=)?\s*\d[\d -]{7,18}\b/gi, (value) => value.replace(/\d[\d -]{7,18}$/, "[REDACTED]"))
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED CARD NUMBER]");
}