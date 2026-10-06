import { analyzeUrlsInText } from "./urlAnalyzer.js";

const DEFAULT_TIMEOUT_MS = 15000;
const GOAL_PROMPT = `You are ScamShield’s AI-powered scam safety analyst.
Your job is to analyze suspicious messages and URLs and determine whether they contain signs commonly associated with scams, phishing, fraud, impersonation, credential theft, payment fraud, or social engineering.
Prioritize user safety.
Never tell the user that something is definitely safe merely because you found no obvious scam indicators.
Judge intent from the surrounding sentence and message, not keyword presence. Distinguish an instruction to share an OTP from a warning that says never to share it. Treat normal OTP notices, payment receipts, delivery updates, security education, and routine support messages as legitimate unless other evidence changes that interpretation.
Use independent evidence groups: requested credentials, requested money or collect approval, threats/urgency, suspicious URL structure, mismatched brand domains, impersonation, and remote-access instructions. A single generic word, an unfamiliar phone number, or an unknown domain is not proof of fraud.
Look for Indian patterns such as fake KYC/account blocking, UPI collect/refund requests, utility disconnection threats, courier/customs fees, police/government threats, fake jobs/loans/investments, QR payment instructions, and screen-sharing requests. Require an actual request, pressure, or other supporting context before treating these as suspicious.
For brands, compare a claimed organization with the actual URL/email domain. Only report impersonation when the available sender details conflict with the claimed brand; do not assume a brand mention alone is suspicious.
For URLs, inspect the URL string and surrounding message for shorteners, IP hosts, punycode/lookalikes, deceptive subdomains, redirects, and sensitive paths. Do not claim an unfamiliar domain is malicious by itself or that an HTTPS URL is safe. If evidence is insufficient, say the destination cannot be fully verified.
Assign a score that reflects the evidence actually present; do not inflate the score or confidence to appear decisive. When evidence is weak, contradictory, or incomplete, lower confidence and explain what remains unknown.
When uncertain, recommend independent verification through the organization’s official website/app/phone number rather than clicking the supplied link or calling the supplied number.
Never ask the user to provide an OTP, password, PIN, CVV, bank credentials, recovery code, or secret information.
Return only a JSON object matching the requested schema.
`;

function sanitizeForLogging(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/\b\d{4,}\b/g, "[digits]").slice(0, 200);
}

function parseJsonText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRiskLevel(score) {
  if (score >= 80) return "very_high";
  if (score >= 60) return "high";
  if (score >= 30) return "suspicious";
  return "low";
}

function normalizeSeverity(value) {
  const normalized = String(value || "low").toLowerCase();
  if (normalized === "critical") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "warn") return "medium";
  if (normalized === "high") return "high";
  return "low";
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAiResult(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  const score = clamp(Number(payload.riskScore ?? payload.score ?? 0), 0, 100);
  const riskLevel = normalizeRiskLevel(score);
  const confidence = clamp(Number(payload.confidence ?? 50), 0, 100);

  const signals = ensureArray(payload.signals).map((signal) => ({
    type: String(signal?.type || "general_signal"),
    severity: normalizeSeverity(signal?.severity),
    explanation: String(signal?.explanation || "The message contains a scam-related warning signal."),
  }));

  const urlAnalysis = ensureArray(payload.urlAnalysis).map((entry) => ({
    url: String(entry?.url || ""),
    domain: String(entry?.domain || ""),
    suspicious: coerceBoolean(entry?.suspicious, false),
    reasons: ensureArray(entry?.reasons).map((reason) => String(reason)),
  }));

  return {
    riskScore: score,
    riskLevel,
    riskLabel: riskLevel === "low" ? "Low" : riskLevel === "suspicious" ? "Suspicious" : riskLevel === "high" ? "High" : "Very High",
    verdict: String(payload.verdict || "Unable to fully verify"),
    confidence,
    summary: String(payload.summary || "The message contains scam-related risk indicators and should be verified carefully."),
    signals,
    urlAnalysis,
    recommendedActions: ensureArray(payload.recommendedActions).map((item) => String(item)),
    shouldClick: coerceBoolean(payload.shouldClick, false),
    shouldShareSensitiveInformation: coerceBoolean(payload.shouldShareSensitiveInformation, false),
    shouldContactTrustedPerson: coerceBoolean(payload.shouldContactTrustedPerson, false),
    verificationSteps: ensureArray(payload.verificationSteps).map((item) => String(item)),
    limitations: ensureArray(payload.limitations).map((item) => String(item)),
    analysisMethod: "ai",
  };
}

export async function analyzeWithAi({ content, type, displayType, language = "en" }) {
  if (!process.env.AI_API_KEY || !process.env.AI_API_URL || !process.env.AI_MODEL) {
    throw new Error("AI provider is not configured.");
  }

  const text = typeof content === "string" ? content.trim() : "";
  const requestType = type === "url" ? "url" : type || "message";
  const validText = text.slice(0, 3000);
  const extractedUrls = analyzeUrlsInText(validText);
  const payload = {
    model: process.env.AI_MODEL,
    messages: [
      { role: "system", content: GOAL_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          language,
          type: requestType,
          displayType: displayType || requestType,
          content: validText,
          extractedUrls,
        }),
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(process.env.AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const json = await response.json();
    const textContent =
      json?.choices?.[0]?.message?.content ||
      json?.output_text ||
      json?.content ||
      json?.result ||
      JSON.stringify(json);

    const parsed = parseJsonText(textContent);
    if (!parsed) {
      throw new Error("AI provider returned an invalid JSON response.");
    }

    const normalized = normalizeAiResult(parsed);
    if (!normalized.summary || !normalized.verdict) {
      throw new Error("AI provider response was missing required fields.");
    }
    return normalized;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown AI error";
    console.warn("AI scam analysis failed:", sanitizeForLogging(reason));
    throw new Error(reason);
  } finally {
    clearTimeout(timeout);
  }
}
