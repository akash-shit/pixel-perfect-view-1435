import mongoose from "mongoose";

export const RELATIONSHIPS = ["Son", "Daughter", "Brother", "Sister", "Friend", "Doctor", "Other"];

const trustedContactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    relationship: { type: String, required: true, enum: RELATIONSHIPS },
  },
  { timestamps: true },
);

trustedContactSchema.index({ userId: 1, createdAt: -1 });

export const TrustedContact = mongoose.model("TrustedContact", trustedContactSchema);