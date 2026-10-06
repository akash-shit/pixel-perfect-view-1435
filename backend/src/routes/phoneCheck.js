import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/authMiddleware.js";
import { analysisRateLimit } from "../middleware/rateLimitMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { assessPhoneNumber } from "../services/phoneScamDetector.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/check",
  analysisRateLimit,
  body("phone").isString().withMessage("Phone number is required.").bail().trim().notEmpty().withMessage("Phone number is required."),
  validateRequest,
  (req, res) => {
    try {
      const result = assessPhoneNumber(req.body.phone);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: "Phone number is invalid.",
        });
      }

      return res.json({
        success: true,
        phone: result.phone,
        riskScore: result.riskScore,
        status: result.status,
        reasons: result.reasons,
        summary: result.summary,
        verdict: result.status === "HIGH RISK" ? "Likely risk" : result.status === "SUSPICIOUS" ? "Needs verification" : "No strong scam indicators found",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Could not evaluate this phone number right now.",
      });
    }
  },
);

export default router;
