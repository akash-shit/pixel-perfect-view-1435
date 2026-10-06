import mongoose from "mongoose";

const scamCheckSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, enum: ["message", "link", "phone", "url"] },
    displayType: { type: String, enum: ["message", "link", "phone", "email", "qr", "screenshot", "url"] },
    input: { type: String, required: true, maxlength: 5000 },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, required: true, enum: ["low", "suspicious", "high", "very_high"] },
    riskLabel: { type: String },
    verdict: { type: String },
    summary: { type: String },
    reasons: { type: [String], default: [] },
    recommendedActions: { type: [String], default: [] },
    matchedSignals: { type: [String], default: [] },
    signals: [{
      type: { type: String, required: true },
      severity: { type: String, default: "low" },
      explanation: { type: String, default: "" },
    }],
    urlAnalysis: [{
      url: { type: String, default: "" },
      domain: { type: String, default: "" },
      suspicious: { type: Boolean, default: false },
      reasons: { type: [String], default: [] },
    }],
    shouldClick: { type: Boolean, default: false },
    shouldShareSensitiveInformation: { type: Boolean, default: false },
    shouldContactTrustedPerson: { type: Boolean, default: false },
    verificationSteps: { type: [String], default: [] },
    limitations: { type: [String], default: [] },
    analysisMethod: { type: String, enum: ["ai", "rule-based-fallback"], default: "rule-based-fallback" },
    confidence: { type: Number, min: 0, max: 100, default: 50 },
  },
  { timestamps: true },
);

scamCheckSchema.index({ userId: 1, createdAt: -1 });

export const ScamCheck = mongoose.model("ScamCheck", scamCheckSchema);