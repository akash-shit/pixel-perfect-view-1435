import mongoose from "mongoose";

const scamCheckSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, enum: ["message", "link", "phone"] },
    displayType: { type: String, enum: ["message", "link", "phone", "email", "qr", "screenshot"] },
    input: { type: String, required: true, maxlength: 5000 },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, required: true, enum: ["low", "suspicious", "high", "very_high"] },
    reasons: { type: [String], default: [] },
    recommendedActions: { type: [String], default: [] },
    matchedSignals: { type: [String], default: [] },
  },
  { timestamps: true },
);

scamCheckSchema.index({ userId: 1, createdAt: -1 });

export const ScamCheck = mongoose.model("ScamCheck", scamCheckSchema);