import { Router } from "express";
import multer from "multer";
import { analyzeScreenshot } from "../controllers/screenshotController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { analysisRateLimit } from "../middleware/rateLimitMiddleware.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 1, parts: 2 },
});
const router = Router();
router.use(requireAuth);

function receiveScreenshot(req, res, next) {
  upload.single("screenshot")(req, res, (error) => {
    if (!error) return next();

    const isSizeError = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    return res.status(isSizeError ? 413 : 400).json({
      success: false,
      message: isSizeError
        ? "Screenshot must be 10 MB or smaller."
        : "Please upload one screenshot image using the screenshot field.",
    });
  });
}

router.post("/analyze", analysisRateLimit, receiveScreenshot, analyzeScreenshot);

export default router;
