import { Router } from "express";
import { body } from "express-validator";
import { analyze, clearHistory, deleteHistoryItem, getHistory } from "../controllers/scamController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { analysisRateLimit } from "../middleware/rateLimitMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/analyze",
  analysisRateLimit,
  body("type").isIn(["message", "link", "phone"]).withMessage("Choose a message, link, or phone check."),
  body("content").isString().trim().notEmpty().withMessage("Enter something to check.").isLength({ max: 5000 }).withMessage("Checks must be 5,000 characters or fewer."),
  body("displayType").optional().isIn(["message", "link", "phone", "email", "qr", "screenshot"]).withMessage("This check type is not supported."),
  validateRequest,
  analyze,
);
router.get("/history", getHistory);
router.delete("/history", clearHistory);
router.delete("/history/:id", deleteHistoryItem);

export default router;