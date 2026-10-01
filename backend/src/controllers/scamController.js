import mongoose from "mongoose";
import { ScamCheck } from "../models/ScamCheck.js";
import { analyzeScam, redactSensitiveInput } from "../services/scamDetectionService.js";

export async function analyze(req, res) {
  const { type, content, displayType } = req.body;
  const result = analyzeScam(content, type, displayType || type);
  const safeInput = redactSensitiveInput(content).slice(0, 5000);
  const check = await ScamCheck.create({
    userId: req.user.id,
    type,
    displayType: displayType || type,
    input: safeInput,
    ...result,
  });

  return res.status(201).json({
    success: true,
    id: check._id.toString(),
    type,
    displayType: displayType || type,
    input: safeInput,
    createdAt: check.createdAt,
    ...result,
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
      reasons: check.reasons,
      recommendedActions: check.recommendedActions,
      matchedSignals: check.matchedSignals,
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