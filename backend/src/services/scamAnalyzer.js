import { analyzeWithAi } from "./aiScamAnalyzer.js";
import { analyzeScam, getRiskLevel } from "./scamDetectionService.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function titleCase(value) {
  return String(value || "").replace(/(^\w|\s\w)/g, (letter) => letter.toUpperCase());
}

function finalizeResult(result) {
  result.riskScore = clamp(Number(result.riskScore) || 0, 0, 100);
  result.riskLevel = getRiskLevel(result.riskScore);
  result.riskLabel = titleCase(result.riskLevel.replace(/_/g, " "));
  result.verdict = result.riskScore >= 80
    ? "Likely Scam"
    : result.riskScore >= 60
      ? "High risk warning signs found"
      : result.riskScore >= 30
        ? "Needs verification"
        : "No strong scam indicators found";
  result.confidence = clamp(Number(result.confidence ?? 50), 0, 90);
  result.reasons = [...new Set(result.reasons || [])];
  result.recommendedActions = [...new Set(result.recommendedActions || [])];
  result.signals = [...(result.signals || [])];
  result.shouldClick = Boolean(result.shouldClick && result.riskScore < 30);
  result.shouldContactTrustedPerson = Boolean(result.shouldContactTrustedPerson || result.riskScore >= 60);

  if (!result.limitations || result.limitations.length === 0) {
    result.limitations = [
      "AI and rule-based checks can make mistakes, especially with new scam tactics.",
      "If the message is important, verify through the official app, website, or customer service number.",
    ];
  }
  return result;
}

export async function analyzeScamRequest({ content, type, displayType, language = "en" }) {
  const requestType = type === "url" ? "link" : type || "message";
  const baseResult = analyzeScam(content, requestType, displayType || requestType);

  try {
    const aiResult = await analyzeWithAi({ content, type: requestType, displayType: displayType || requestType, language });
    const ruleScore = clamp(Number(baseResult.riskScore) || 0, 0, 100);
    const aiScore = clamp(Number(aiResult.riskScore) || 0, 0, 100);
    const disagreement = Math.abs(ruleScore - aiScore);
    const ruleWeight = baseResult.matchedSignals?.some((signal) =>
      signal === "protective_context" || signal === "routine_financial_notice",
    ) ? 0.9 : 0.65;
    const riskScore = Math.round(ruleScore * ruleWeight + aiScore * (1 - ruleWeight));
    const signalMap = new Map();
    const severityWeight = { low: 0, medium: 1, high: 2 };
    for (const signal of [...(baseResult.signals || []), ...(aiResult.signals || [])]) {
      const previous = signalMap.get(signal.type);
      if (!previous || severityWeight[signal.severity] > severityWeight[previous.severity]) signalMap.set(signal.type, signal);
    }
    const signals = [...signalMap.values()];
    const riskLevel = getRiskLevel(riskScore);
    const confidence = clamp(
      Math.round((Number(baseResult.confidence || 50) + Number(aiResult.confidence || 50)) / 2) - Math.min(30, Math.round(disagreement * 0.35)),
      25,
      90,
    );
    const merged = {
      ...baseResult,
      ...aiResult,
      riskScore,
      riskLevel,
      riskLabel: titleCase(riskLevel.replace(/_/g, " ")),
      confidence,
      verdict: riskScore >= 80 ? "Likely Scam" : riskScore >= 60 ? "High risk warning signs found" : riskScore >= 30 ? "Needs verification" : "No strong scam indicators found",
      summary: disagreement >= 35
        ? "The AI and rule-based checks found mixed evidence. Verify this message through an official source before acting."
        : aiResult.summary || baseResult.summary || "The message contains warning signs that need careful verification.",
      reasons: [...new Set([
        ...(baseResult.reasons || []),
        ...signals.map((signal) => signal.explanation).filter(Boolean),
      ])],
      recommendedActions: [...new Set([...(baseResult.recommendedActions || []), ...(aiResult.recommendedActions || [])])],
      matchedSignals: [...new Set([...(baseResult.matchedSignals || []), ...(aiResult.signals || []).map((signal) => signal.type)])],
      signals,
      shouldClick: Boolean(baseResult.shouldClick && aiResult.shouldClick && riskScore < 30),
      shouldShareSensitiveInformation: Boolean(baseResult.shouldShareSensitiveInformation || aiResult.shouldShareSensitiveInformation),
      shouldContactTrustedPerson: Boolean(baseResult.shouldContactTrustedPerson || aiResult.shouldContactTrustedPerson || riskScore >= 60),
      limitations: [...new Set([
        ...(baseResult.limitations || []),
        ...(aiResult.limitations || []),
        ...(disagreement >= 35 ? ["The AI and rule-based checks disagreed, so this score is less certain."] : []),
      ])],
      analysisMethod: "ai",
    };
    return finalizeResult(merged);
  } catch (error) {
    const fallback = {
      ...baseResult,
      summary: baseResult.summary || "This uses the built-in scam safety checks because the AI service is unavailable.",
      verdict: baseResult.verdict || "Unable to fully verify",
      analysisMethod: "rule-based-fallback",
      riskLabel: titleCase(baseResult.riskLevel.replace(/_/g, " ")),
      shouldClick: baseResult.shouldClick ?? false,
      shouldShareSensitiveInformation: baseResult.shouldShareSensitiveInformation ?? false,
      shouldContactTrustedPerson: baseResult.shouldContactTrustedPerson ?? false,
      verificationSteps: baseResult.verificationSteps || [
        "Open the official app or website yourself rather than using the received link.",
        "Do not share OTP, PIN, password or banking information.",
      ],
      limitations: [
        "The AI service is unavailable or timed out, so the app used the built-in safety rules.",
      ],
    };
    return finalizeResult(fallback);
  }
}
