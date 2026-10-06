import { analyzeUrlsInText, findBrandDomainMismatch } from "./urlAnalyzer.js";

export const DETECTION_CONFIG = Object.freeze({
  thresholds: Object.freeze({ lowMax: 29, suspiciousMax: 59, highMax: 79 }),
});

const DEMO_REPORTED_NUMBERS = new Map([
  ["9812345678", "reported_phone_high"],
  ["9000000001", "reported_phone_high"],
  ["8800112233", "reported_phone_suspicious"],
]);
export function extractUrls(text = "") {
  if (!text || typeof text !== "string") return [];
  return analyzeUrlsInText(text).map((entry) => entry.url);
}

export function getRiskLevel(score) {
  const { lowMax, suspiciousMax, highMax } = DETECTION_CONFIG.thresholds;
  if (score <= lowMax) return "low";
  if (score <= suspiciousMax) return "suspicious";
  if (score <= highMax) return "high";
  return "very_high";
}

const SENSITIVE_INFORMATION = /\b(?:otp|o\s*t\s*p|one[- ]time password|verification code|pin|upi pin|password|passcode|cvv|cvc|card details|bank details|credentials|aadhaar|aadhar)\b|ओटीपी|पिन/i;
const PROTECTIVE_LANGUAGE = /\b(?:never|do not|don't|does not|doesn't|will not|won't|should not|shouldn't|avoid|beware|warning|stay alert|scam alert|protect yourself|never ask)\b|न मांगें|न बताएं|मत बताएं|साझा न करें/i;
const PROTECTIVE_ACTION = /\b(?:do not|don't|never|should not|shouldn't|avoid)\b.{0,60}\b(?:pay|transfer|send money|approve|accept|scan|click|share|provide|enter|install|download)\b/i;
const CREDENTIAL_ACTION = /\b(?:send|share|provide|give|tell|enter|type|submit|forward|reply with|confirm|verify|upload|disclose|reveal|read out|ask for|send us|message us)\b|भेजें|बताएं|दर्ज करें|साझा करें/i;
const GENERAL_ACTION = /\b(?:click|open|visit|tap|verify|update|confirm|reply|call|contact|transfer|send|pay|scan|approve|accept|install|download|share|enter|submit|claim|register)\b|क्लिक|भेजें|भुगतान|जमा करें|स्कैन|साझा करें/i;
const PAYMENT_ACTION = /\b(?:send|transfer|pay|deposit|purchase|scan|approve|accept|authorize|collect|payable|make (?:a )?payment|processing fee|registration fee|release fee|customs duty)\b|भुगतान|जमा करें|भेजें|स्वीकार करें/i;
const PAYMENT_CONTEXT = /\b(?:money|payment|fee|refund|upi|bank transfer|bank account|prize|reward|lottery|loan|investment|deposit|account|collect request|dues?|bill|customs|duty|rupees?)\b|(?:₹|\b(?:inr|rs\.?)\s*)[\d,]+|रिफंड|बिजली बिल|यूपीआई/i;
const URGENCY_LANGUAGE = /\b(?:urgent|immediately|right now|act now|today only|within \d+ hours?|last warning|final notice|expires? (?:today|soon)|before \d|limited time|today)\b|तुरंत|अभी|आज ही/i;
const THREAT_LANGUAGE = /\b(?:account (?:will be|is|has been) blocked|account suspended|account terminated|kyc (?:expired|blocked)|sim (?:will be )?blocked|electricity (?:will be )?disconnected|connection (?:will be )?cut|arrest|police case|legal action|court notice|customs has held|parcel (?:will be )?cancelled|service will stop)\b|खाता बंद|बिजली कनेक्शन कट|गिरफ्तार|पुलिस केस/i;
const JOB_OFFER = /\b(?:job|work from home|employment|daily income|earn (?:₹|rs|inr)?\s?\d|salary offer)\b/i;
const LOAN_OFFER = /\b(?:loan|credit approval|loan approved|instant credit)\b/i;
const INVESTMENT_OFFER = /\b(?:investment|returns?|crypto|cryptocurrency|trading)\b/i;
const PRIZE_OFFER = /\b(?:you (?:have )?won|winner|lottery|prize|reward|cashback)\b/i;
const REMOTE_ACCESS = /\b(?:install|download|open|use|connect through|give access to).{0,45}\b(?:anydesk|teamviewer|quick.?support|screen.?share|remote access|remote desktop)\b|\b(?:share|show|give access to).{0,35}\b(?:your )?screen\b/i;
const DELIVERY_CLAIM = /\b(?:courier|parcel|package|customs|delivery|shipment)\b/i;
const AUTHORITY_CLAIM = /\b(?:police|cbi|court|government|income tax|rbi|bank|customer support|customer care|support team|official department)\b/i;
const AUTHORITY_THREAT = /\b(?:police|cbi|court|cyber crime|law enforcement|government)\b/i;
const AUTHORITY_ALLEGATION = /\b(?:illegal activity|case (?:is )?filed|arrest|offense|offence|violation|notice|detected suspicious activity)\b/i;
const ACCOUNT_INFORMATION_REQUEST = /\b(?:review|confirm|verify|update|enter|provide|submit)\b.{0,90}\b(?:account information|account details|banking details|personal information|identity details|login details|credentials)\b|\b(?:account information|account details|banking details|personal information|identity details|login details|credentials)\b.{0,60}\b(?:review|confirm|verify|update|enter|provide|submit)\b/i;
const ROUTINE_FINANCIAL_NOTICE = /\b(?:processing your recent transaction|payment has not been completed|payment received|transaction (?:was|has been) (?:completed|processed)|review your transaction details|transaction details are ready|statement is ready)\b/i;
const PHONE_IN_TEXT = /(?<!\w)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\w)|(?<!\w)0[6-9]\d{9}(?!\w)/g;

function splitSentences(text) {
  return text.split(/[.!?;\n]+/).map((part) => part.trim()).filter(Boolean);
}

function isProtectiveSentence(sentence) {
  return PROTECTIVE_ACTION.test(sentence)
    || (PROTECTIVE_LANGUAGE.test(sentence) && (SENSITIVE_INFORMATION.test(sentence) || AUTHORITY_CLAIM.test(sentence)));
}

function addEvidence(evidence, type, group, points, explanation, severity = "medium") {
  if (!evidence.has(type)) evidence.set(type, { type, group, points, explanation, severity });
}

function getRiskSummary(riskLevel) {
  if (riskLevel === "very_high") return "Strong signs of a scam were found.";
  if (riskLevel === "high") return "Several warning signs suggest this may be scam-related.";
  if (riskLevel === "suspicious") return "Some warning signs appeared, but the message may still need verification.";
  return "No obvious scam indicators were detected in this message.";
}

export function analyzeScam(content, type = "message", displayType = type) {
  const text = String(content ?? "").trim();
  const lower = text.toLowerCase();
  const evidence = new Map();
  const groupScores = new Map();
  const add = (signalType, group, points, explanation, severity = points >= 24 ? "high" : "medium") => {
    addEvidence(evidence, signalType, group, points, explanation, severity);
    groupScores.set(group, Math.max(groupScores.get(group) || 0, points));
  };
  const urls = type === "link" && !extractUrls(text).length
    ? analyzeUrlsInText(`https://${text}`)
    : analyzeUrlsInText(text);
  const sentences = splitSentences(lower);
  const protectiveSentences = sentences.filter((sentence) => isProtectiveSentence(sentence));
  const activeText = sentences.filter((sentence) => !isProtectiveSentence(sentence)).join(" ");
  if (protectiveSentences.length) {
    addEvidence(evidence, "protective_context", "protective_context", 0, "The message includes a warning against sharing sensitive information or a scam-awareness statement.", "low");
  }

  for (const sentence of sentences) {
    if (isProtectiveSentence(sentence)) continue;

    const hasAction = GENERAL_ACTION.test(sentence);
    const hasPaymentAction = PAYMENT_ACTION.test(sentence) && PAYMENT_CONTEXT.test(sentence);
    const looksLikeReceipt = /\b(?:received|credited|paid successfully|payment successful|transaction complete|receipt|debited)\b/.test(sentence)
      && !/\b(?:send|share|enter|scan|approve|accept|pay now|transfer now|click|verify)\b/.test(sentence);

    if (SENSITIVE_INFORMATION.test(sentence) && CREDENTIAL_ACTION.test(sentence)) {
      add("credential_request", "credentials", 32, "The message asks you to share or enter sensitive information such as an OTP, PIN, password, or bank detail.");
    }
    if (hasPaymentAction && !looksLikeReceipt) {
      add("payment_request", "payment", 30, "The message asks you to send, approve, or pay money.");
    }
    if (REMOTE_ACCESS.test(sentence)) {
      add("remote_access", "remote_access", 32, "The message asks you to install remote-access software or share your screen.");
    }
    if (PRIZE_OFFER.test(sentence) && (hasPaymentAction || /\b(?:claim|collect|redeem)\b/.test(sentence))) {
      add("lottery", "known_pattern", 32, "The message links a prize or reward to a payment or claim action.");
    }
      if (/\b(?:refund|cashback|reimbursement)\b/.test(sentence) && hasAction && /\b(?:approve|accept|scan|click|pay|send|provide|enter|claim)\b/.test(sentence)) {
      add("refund_scam", "known_pattern", 24, "The message uses a refund claim to prompt a payment, approval, or sensitive action.");
    }
  }

  const hasActiveAction = GENERAL_ACTION.test(activeText);
  const hasActiveThreat = THREAT_LANGUAGE.test(activeText);
  if (hasActiveThreat && hasActiveAction) {
    add("threat", "pressure", 20, "The message threatens a consequence and pushes you to take an action.");
  }
  if (URGENCY_LANGUAGE.test(activeText) && hasActiveAction && (!/\btoday\b/i.test(activeText) || hasActiveThreat)) {
    add("urgency", "urgency", 12, "The message pressures you to act quickly instead of taking time to verify.");
  }
  if (AUTHORITY_THREAT.test(activeText) && AUTHORITY_ALLEGATION.test(activeText) && hasActiveAction) {
    add("authority_impersonation", "impersonation", 24, "The message invokes police, court, or government authority and demands an action.");
    add("threat", "pressure", 20, "The message uses a legal or police threat to pressure you into acting.");
  }
  if (/\bkyc\b|know your customer/i.test(activeText) && hasActiveThreat && hasActiveAction) {
    add("kyc_scam", "known_pattern", 28, "A KYC verification demand is paired with an account threat and a requested action.");
  }
  if (PRIZE_OFFER.test(activeText) && groupScores.has("payment")) {
    add("lottery", "known_pattern", 50, "A prize or lottery claim is paired with a request to pay a fee or send money.");
  }

  if (JOB_OFFER.test(lower) && groupScores.has("payment")) {
    add("job_scam", "known_pattern", 32, "The job offer is paired with an upfront payment or registration fee.");
  }
  if ((LOAN_OFFER.test(lower) || INVESTMENT_OFFER.test(lower)) && groupScores.has("payment") && /\b(?:fee|deposit|guaranteed|release|activation|returns?)\b/i.test(text)) {
    add(LOAN_OFFER.test(lower) ? "loan_scam" : "investment_scam", "known_pattern", 32, "The financial offer requires an upfront fee or deposit.");
  }

  const hasDeliveryClaim = DELIVERY_CLAIM.test(lower);
  const hasElectricityThreat = /\b(?:electricity|power|bijli)\b.{0,60}\b(?:disconnect|cut|unpaid|bill|connection)\b|\b(?:disconnect|cut)\b.{0,60}\b(?:electricity|power|bijli)\b/i.test(text);
  if (hasDeliveryClaim && (groupScores.has("payment") || groupScores.has("pressure") || groupScores.has("credentials"))) {
    add("delivery_impersonation", "impersonation", 28, "A courier or customs claim is paired with a payment, sensitive-information request, or threat.");
  }
  if (hasElectricityThreat && (groupScores.has("payment") || groupScores.has("pressure"))) {
    add("utility_scam", "known_pattern", 24, "An electricity or utility threat is paired with a payment or action request.");
  }
  if (REMOTE_ACCESS.test(lower) && /\b(?:bank|support|customer care|reverse|refund|payment)\b/i.test(lower)) {
    add("support_impersonation", "impersonation", 24, "A support or financial-service claim is paired with a remote-access request.");
  }

  if (displayType === "qr" && /upi:\/\/|qr code|collect request/i.test(text)) {
    const points = /\b(?:approve|accept|pay|send|scan)\b/i.test(text) ? 30 : 0;
    add("qr_payment", "payment", points, "A QR or UPI instruction may start a payment; verify the payee before approving it.", points ? "high" : "low");
  }

  const suspiciousUrls = urls.filter((entry) => entry.suspicious);
  if (suspiciousUrls.length) {
    const strongUrlEvidence = suspiciousUrls.some((entry) =>
      entry.signals.some((signal) => ["lookalike_domain", "punycode_domain", "ip_address_host", "url_shortener"].includes(signal)),
    );
    add("suspicious_link", "web", strongUrlEvidence ? 30 : 28, [...new Set(suspiciousUrls.flatMap((entry) => entry.reasons))].join(" "));
  } else if (urls.some((entry) => entry.signals.includes("unencrypted_http") || entry.signals.includes("redirect_parameter"))) {
    add("weak_url_signal", "web", 6, "The URL uses an unencrypted connection or a redirect parameter; verify its destination independently.", "low");
  }

  const brandMismatch = findBrandDomainMismatch(text, urls);
  if (brandMismatch && (GENERAL_ACTION.test(activeText) || [...evidence.keys()].some((signal) => signal !== "protective_context"))) {
    add("brand_impersonation", "impersonation", 36, `The message claims to represent ${brandMismatch.brand}, but links to the mismatched domain ${brandMismatch.domain}.`);
    if (ACCOUNT_INFORMATION_REQUEST.test(activeText) && urls.length > 0) {
      add("credential_request", "credentials", 32, "The email asks you to confirm account information on a domain that does not match the organization in its signature.");
    }
  }
  const lookalike = urls.find((entry) => entry.lookalikeBrand);
  if (lookalike) {
    add("brand_impersonation", "impersonation", 24, `The URL resembles ${lookalike.lookalikeBrand} but does not use its official domain.`);
  }

  const phoneNumbers = text.match(PHONE_IN_TEXT) || [];
  if (phoneNumbers.length > 1 && (groupScores.has("payment") || groupScores.has("credentials"))) {
    add("contact_for_suspicious_request", "contact_context", 8, "The message includes multiple phone numbers alongside a money or sensitive-information request.", "low");
  }

  if (type === "phone") {
    addEvidence(evidence, "caller_identity_unverified", "caller_identity", 0, "A phone number alone cannot confirm who is calling.", "low");
    const digits = text.replace(/\D/g, "").slice(-10);
    const reportedSignal = DEMO_REPORTED_NUMBERS.get(digits);
    if (reportedSignal) {
      const points = reportedSignal === "reported_phone_high" ? 84 : 48;
      add(reportedSignal, "known_report", points, "This number appears in the app's local demo report list; reports are indicators, not proof.");
    }
  }

  if (ROUTINE_FINANCIAL_NOTICE.test(lower) && urls.length === 0
    && !groupScores.has("credentials") && !groupScores.has("payment") && !groupScores.has("pressure")) {
    addEvidence(evidence, "routine_financial_notice", "routine_financial_notice", 0, "The email reads like a routine transaction notice and contains no link or direct request for credentials or payment.", "low");
  }

  const signals = [...evidence.values()];
  const matchedSignals = signals.map(({ type: signalType }) => signalType);
  const riskScore = Math.min(100, [...groupScores.values()].reduce((total, points) => total + points, 0));
  const riskLevel = getRiskLevel(riskScore);
  const reasons = signals.map(({ explanation }) => explanation);
  const recommendedActions = ["Verify using the organization's official app or website, not a message link."];
  if (matchedSignals.includes("suspicious_link") || matchedSignals.includes("brand_impersonation")) recommendedActions.unshift("Do not click the link; open the official website or app yourself.");
  if (matchedSignals.includes("credential_request")) recommendedActions.unshift("Do not share an OTP, PIN, password, or banking details.");
  if (matchedSignals.includes("payment_request") || matchedSignals.includes("refund_scam")) recommendedActions.unshift("Do not transfer money or approve a collect request until you verify it independently.");
  if (matchedSignals.includes("remote_access")) recommendedActions.unshift("Do not install remote-access apps or share your screen with the caller.");
  if (type === "phone") recommendedActions.unshift("Hang up and call back using a number from an official source.");
  if (matchedSignals.includes("qr_payment")) recommendedActions.unshift("Never scan a QR code to receive money; check the payee before confirming a payment.");

  const confidence = Math.min(84, 50 + [...groupScores.values()].filter((points) => points > 0).length * 8 + (groupScores.has("known_report") ? 10 : 0));
  const shouldClick = !(matchedSignals.includes("suspicious_link") || matchedSignals.includes("brand_impersonation") || riskScore >= 30);

  return {
    riskScore,
    riskLevel,
    riskLabel: riskLevel === "low" ? "Low" : riskLevel === "suspicious" ? "Suspicious" : riskLevel === "high" ? "High" : "Very High",
    verdict: riskLevel === "very_high" ? "Likely Scam" : riskLevel === "high" ? "Suspicious" : riskLevel === "suspicious" ? "Needs verification" : "No obvious scam indicators detected",
    summary: getRiskSummary(riskLevel),
    reasons: reasons.length ? reasons : ["No strong warning signals were found by these rules. This does not prove the content is safe."],
    recommendedActions: [...new Set(recommendedActions)],
    matchedSignals,
    shouldClick,
    shouldShareSensitiveInformation: matchedSignals.includes("credential_request"),
    shouldContactTrustedPerson: riskLevel === "high" || riskLevel === "very_high",
    verificationSteps: [
      "Open the official app or website yourself instead of using a link in the message.",
      "Do not share OTP, PIN, password, CVV or banking information.",
      "If the message seems urgent, contact a trusted person before acting.",
    ],
    limitations: ["Rule-based patterns can miss new scams. Verify important claims through an official channel."],
    analysisMethod: "rule-based-fallback",
    confidence,
    signals: signals.map(({ type: signalType, severity, explanation }) => ({ type: signalType, severity, explanation })),
    urlAnalysis: urls,
  };
}

export function redactSensitiveInput(input) {
  return String(input ?? "")
    .replace(/\b(?:one[- ]time password|verification code|otp)\s*(?:is|:|=)?\s*\d{4,8}\b/gi, (value) => value.replace(/\d{4,8}$/, "[REDACTED]"))
    .replace(/\b(?:password|passcode|pin)\s*(?:is|:|=)?\s*[A-Za-z0-9!@#$%^&*._-]{4,72}\b/gi, (value) => value.replace(/[A-Za-z0-9!@#$%^&*._-]{4,72}$/i, "[REDACTED]"))
    .replace(/\b(?:cvv|cvc)\s*(?:is|:|=)?\s*\d{3,4}\b/gi, (value) => value.replace(/\d{3,4}$/, "[REDACTED]"))
    .replace(/\b(?:aadhaar|aadhar|account number|bank account)\s*(?:is|:|=)?\s*\d[\d -]{7,18}\b/gi, (value) => value.replace(/\d[\d -]{7,18}$/, "[REDACTED]"))
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED CARD NUMBER]");
}
