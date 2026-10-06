import { ScamCheck } from "../models/ScamCheck.js";
import { redactSensitiveInput } from "../services/scamDetectionService.js";
import {
  analyzeScreenshotText,
  prepareScreenshot,
  recognizeScreenshot,
  ScreenshotProcessingError,
} from "../services/screenshotAnalysis.js";

const DATABASE_RISK_LEVELS = {
  "LOW RISK": "low",
  SUSPICIOUS: "suspicious",
  "HIGH RISK": "high",
};

export async function analyzeScreenshot(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please upload one screenshot image." });
  }

  try {
    const imageBuffer = await prepareScreenshot(req.file.buffer, req.file.mimetype);
    const language = ["en", "hi", "bn"].includes(req.body.language) ? req.body.language : "en";
    const { text, confidence: ocrConfidence } = await recognizeScreenshot(imageBuffer, language);
    const analysis = await analyzeScreenshotText(text, ocrConfidence, language);
    const signals = analysis.indicators.map((indicator) => ({
      type: indicator.type,
      severity: indicator.severity === "high" ? "high" : indicator.severity === "medium" ? "medium" : "low",
      explanation: indicator.description,
    }));
    const check = await ScamCheck.create({
      userId: req.user.id,
      type: "message",
      displayType: "screenshot",
      input: redactSensitiveInput(text).slice(0, 5000),
      riskScore: analysis.riskScore,
      riskLevel: DATABASE_RISK_LEVELS[analysis.riskLevel],
      riskLabel: analysis.riskLevel,
      verdict: analysis.riskLevel === "HIGH RISK" ? "Likely scam" : analysis.riskLevel === "SUSPICIOUS" ? "Needs caution" : "No strong warning signs found",
      summary: analysis.summary,
      reasons: signals.map((signal) => signal.explanation),
      recommendedActions: analysis.recommendations,
      matchedSignals: signals.map((signal) => signal.type),
      signals,
      urlAnalysis: analysis.extracted.urls.map((url) => ({
        url,
        domain: new URL(url.startsWith("http") ? url : `https://${url}`).hostname,
        suspicious: analysis.indicators.some((indicator) => indicator.type === "suspicious_url"),
        reasons: [],
      })),
      shouldClick: analysis.riskScore < 30,
      shouldShareSensitiveInformation: false,
      shouldContactTrustedPerson: analysis.riskScore >= 60,
      verificationSteps: analysis.recommendations,
      limitations: [analysis.disclaimer],
      analysisMethod: analysis.analysisMethod,
      confidence: Math.round(analysis.confidence * 100),
    });

    return res.status(201).json({
      ...analysis,
      id: check._id.toString(),
      createdAt: check.createdAt,
    });
  } catch (error) {
    if (error instanceof ScreenshotProcessingError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    throw error;
  }
}
