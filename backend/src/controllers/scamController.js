import mongoose from "mongoose";
import { ScamCheck } from "../models/ScamCheck.js";
import { analyzeScamRequest } from "../services/scamAnalyzer.js";
import { redactSensitiveInput } from "../services/scamDetectionService.js";

export async function analyze(req, res) {
  const { type, content, displayType, language } = req.body;
  const requestedType = type === "url" ? "url" : type || "message";
  const result = await analyzeScamRequest({
    content,
    type: requestedType,
    displayType: displayType || requestedType,
    language: language || "en",
  });

  const safeInput = redactSensitiveInput(content).slice(0, 5000);
  const check = await ScamCheck.create({
    userId: req.user.id,
    type: requestedType === "url" ? "link" : requestedType,
    displayType: displayType || requestedType,
    input: safeInput,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    summary: result.summary,
    verdict: result.verdict,
    signals: result.signals,
    urlAnalysis: result.urlAnalysis,
    recommendedActions: result.recommendedActions,
    matchedSignals: result.matchedSignals,
    shouldClick: result.shouldClick,
    shouldShareSensitiveInformation: result.shouldShareSensitiveInformation,
    shouldContactTrustedPerson: result.shouldContactTrustedPerson,
    verificationSteps: result.verificationSteps,
    limitations: result.limitations,
    analysisMethod: result.analysisMethod,
    confidence: result.confidence,
    reasons: result.reasons,
  });

  return res.status(201).json({
    success: true,
    id: check._id.toString(),
    type: requestedType,
    displayType: displayType || requestedType,
    input: safeInput,
    createdAt: check.createdAt,
    ...result,
    riskLevel: result.riskLevel,
    riskLabel: result.riskLabel,
    analysisMethod: result.analysisMethod,
  });
}

export async function getHistory(req, res) {
  const checks = await ScamCheck.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  return res.json({
    success: true,
    checks: checks.map((check) => ({
      id: check._id.toString(),
      type: check.type,
      displayType: check.displayType || check.type,
      input: check.input,
      riskScore: check.riskScore,
      riskLevel: check.riskLevel,
      riskLabel: check.riskLabel,
      verdict: check.verdict,
      summary: check.summary,
      reasons: check.reasons,
      recommendedActions: check.recommendedActions,
      matchedSignals: check.matchedSignals,
      signals: check.signals || [],
      urlAnalysis: check.urlAnalysis || [],
      shouldClick: check.shouldClick,
      shouldShareSensitiveInformation: check.shouldShareSensitiveInformation,
      shouldContactTrustedPerson: check.shouldContactTrustedPerson,
      verificationSteps: check.verificationSteps || [],
      limitations: check.limitations || [],
      analysisMethod: check.analysisMethod,
      confidence: check.confidence,
      createdAt: check.createdAt,
    })),
  });
}

export async function deleteHistoryItem(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "That check could not be found." });
  }
  const result = await ScamCheck.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, message: "That check could not be found." });
  }
  return res.json({ success: true });
}

export async function clearHistory(req, res) {
  await ScamCheck.deleteMany({ userId: req.user.id });
  return res.json({ success: true });
}