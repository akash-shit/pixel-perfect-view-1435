import { Router } from "express";
import { body } from "express-validator";
import multer from "multer";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  assistantRateLimit,
  assistantTranscriptionRateLimit,
} from "../middleware/rateLimitMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { answerAssistantQuestion } from "../services/assistantService.js";
import { transcribeAssistantAudio } from "../services/speechTranscriptionService.js";

const router = Router();
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const acceptedAudioTypes = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/flac",
]);
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 1, parts: 2 },
});

function receiveAudio(req, res, next) {
  audioUpload.single("audio")(req, res, (error) => {
    if (!error) return next();
    const tooLarge =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge
        ? "Audio must be 10 MB or smaller."
        : "Please record one audio question using the audio field.",
    });
  });
}

router.post(
  "/transcribe",
  requireAuth,
  assistantTranscriptionRateLimit,
  receiveAudio,
  body("language")
    .isIn(["en", "hi", "bn"])
    .withMessage("Choose English, Hindi, or Bengali."),
  validateRequest,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No audio was received. Please record your question again.",
          code: "STT_EMPTY_AUDIO",
        });
      }
      const mimeType = req.file.mimetype.split(";")[0].toLowerCase();
      if (!acceptedAudioTypes.has(mimeType)) {
        return res.status(415).json({
          success: false,
          message:
            "This audio format is not supported. Please try another browser or type your question.",
          code: "STT_UNSUPPORTED_AUDIO",
        });
      }
      console.info(
        `[assistant-transcription] upload received bytes=${req.file.size} mime=${mimeType}`,
      );
      const transcript = await transcribeAssistantAudio({
        audio: req.file.buffer,
        mimeType,
        language: req.body.language,
      });
      return res.json({ success: true, transcript });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  "/respond",
  assistantRateLimit,
  requireAuth,
  body("question")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Please type or say a question.")
    .isLength({ max: 1200 })
    .withMessage("Please keep your question under 1,200 characters."),
  body("language")
    .isIn(["en", "hi", "bn"])
    .withMessage("Choose English, Hindi, or Bengali."),
  validateRequest,
  async (req, res, next) => {
    try {
      const answer = await answerAssistantQuestion({
        question: req.body.question,
        language: req.body.language,
      });
      res.json({ success: true, answer });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
