import { SCAM_NUMBERS } from "../data/scamNumbers.js";

const SUSPICIOUS_NUMBER_PATTERNS = [
  /(\d)\1{5,}/,
  /^(?:0123456789|1234567890|0987654321|9876543210)$/,
];

const LOOKUP_DIGITS = new Set(
  SCAM_NUMBERS.flatMap((value) => {
    const clean = value.replace(/\D/g, "");
    return [value, clean, `+${clean}`, `0${clean.slice(2)}`];
  }),
);

export function normalizePhoneNumber(rawPhone) {
  if (typeof rawPhone !== "string") return null;

  const value = rawPhone.trim();
  if (!value || !/^\+?[\d\s()-]+$/.test(value)) return null;

  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return null;

  let normalizedDigits = digitsOnly;
  if (digitsOnly.length === 10 && !value.startsWith("+")) {
    normalizedDigits = `91${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0") && !value.startsWith("+")) {
    normalizedDigits = `91${digitsOnly.slice(1)}`;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    normalizedDigits = digitsOnly;
  } else if (!value.startsWith("+")) {
    return null;
  }

  return `+${normalizedDigits}`;
}

function getStatus(score) {
  if (score <= 29) return "LOW RISK";
  if (score <= 69) return "SUSPICIOUS";
  return "HIGH RISK";
}

export function assessPhoneNumber(rawPhone) {
  const phone = normalizePhoneNumber(rawPhone);

  if (!phone) {
    return {
      success: false,
      phone: "",
      riskScore: 0,
      status: "LOW RISK",
      reasons: ["Phone number is missing or malformed."],
      summary: "The number format could not be validated.",
      valid: false,
    };
  }

  const digits = phone.replace(/\D/g, "");
  const reasons = [];
  let riskScore = 5;

  const normalizedVariant = [phone, digits, `0${digits.slice(2)}`];
  const isKnownScam = normalizedVariant.some((value) => LOOKUP_DIGITS.has(value));
  if (isKnownScam) {
    riskScore += 75;
    reasons.push("Known scam report found in the local development database.");
  } else {
    reasons.push("No known scam reports found.");
  }

  const lastTenDigits = digits.slice(-10);
  const hasSuspiciousPattern = SUSPICIOUS_NUMBER_PATTERNS.some((pattern) => pattern.test(lastTenDigits));
  if (hasSuspiciousPattern) {
    riskScore += 35;
    reasons.push("The number contains an unusual repeated-digit or sequential pattern.");
  } else {
    reasons.push("No suspicious patterns detected.");
  }
  reasons.push("This does not guarantee that the number is safe.");

  riskScore = Math.min(100, Math.max(0, riskScore));
  const status = getStatus(riskScore);
  const summary =
    status === "HIGH RISK"
      ? "This number has serious warning signs and should be treated cautiously."
      : status === "SUSPICIOUS"
        ? "This number shows suspicious patterns and needs extra caution."
        : "No strong warning signs were found in these checks; this is not a guarantee of safety.";

  return {
    success: true,
    phone,
    riskScore,
    status,
    reasons: [...new Set(reasons)],
    summary,
    valid: true,
  };
}
