import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { analyzeScamRequest } from "./scamAnalyzer.js";
import { analyzeUrlsInText } from "./urlAnalyzer.js";
import { assessPhoneNumber, normalizePhoneNumber } from "./phoneScamDetector.js";

const MAX_IMAGE_PIXELS = 12_000_000;
const READ_ERROR = "Unable to confidently read this screenshot. Please upload a clearer image.";
const OCR_LANGUAGES = { en: "eng", hi: "eng+hin", bn: "eng+ben" };
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
let workerLanguage = "";
let workerPromise;
let ocrQueue = Promise.resolve();

export class ScreenshotProcessingError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ScreenshotProcessingError";
    this.statusCode = statusCode;
  }
}

export async function prepareScreenshot(buffer, declaredMimeType) {
  if (!SUPPORTED_IMAGE_TYPES.has(declaredMimeType)) {
    throw new ScreenshotProcessingError("Upload a PNG, JPG, JPEG, or WEBP image.", 415);
  }

  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType || fileType.mime !== declaredMimeType) {
    throw new ScreenshotProcessingError("The uploaded file is not a supported image.", 415);
  }

  try {
    const image = sharp(buffer, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new ScreenshotProcessingError("This image is too large to analyze. Please use a smaller screenshot.", 413);
    }
    return await image.rotate().png().toBuffer();
  } catch (error) {
    if (error instanceof ScreenshotProcessingError) throw error;
    throw new ScreenshotProcessingError("The uploaded image could not be opened. Please try another screenshot.", 415);
  }
}

async function getWorker(language) {
  if (workerPromise && workerLanguage === language) return workerPromise;
  if (workerPromise) {
    const previousWorker = await workerPromise;
    await previousWorker.terminate();
  }
  workerLanguage = language;
  workerPromise = createWorker(language).catch((error) => {
    workerPromise = undefined;
    workerLanguage = "";
    throw error;
  });
  return workerPromise;
}

export async function recognizeScreenshot(imageBuffer, language = "en") {
  const recognition = ocrQueue.then(async () => {
    const worker = await getWorker(OCR_LANGUAGES[language] || OCR_LANGUAGES.en);
    const { data } = await worker.recognize(imageBuffer);
    const text = String(data.text || "").trim();
    const confidence = Math.max(0, Math.min(100, Number(data.confidence) || 0));

    if (text.replace(/\s/g, "").length < 12 || confidence < 30) {
      throw new ScreenshotProcessingError(READ_ERROR, 422);
    }

    return { text: text.slice(0, 12_000), confidence };
  });
  ocrQueue = recognition.then(() => undefined, () => undefined);
  return recognition;
}

export function extractScreenshotInformation(text) {
  const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
  const upiIds = [...new Set((text.match(/\b[A-Z0-9._-]{2,}@[A-Z]{2,}/gi) || []).filter((value) =>
    !emails.some((email) => email.toLowerCase() === value.toLowerCase() || email.toLowerCase().startsWith(`${value.toLowerCase()}.`)),
  ))];
  const phoneNumbers = new Set();
  const phoneCandidates = text.match(/(?<!\w)\+?\d[\d ().-]{7,}\d(?!\w)/g) || [];
  for (const candidate of phoneCandidates) {
    const phone = normalizePhoneNumber(candidate);
    if (phone) phoneNumbers.add(phone);
  }

  const emailHosts = new Set(emails.map((email) => email.split("@")[1].toLowerCase()));
  const urls = analyzeUrlsInText(text).filter((entry) => !emailHosts.has(entry.domain.toLowerCase()));
  return {
    text,
    urls: [...new Set(urls.map((entry) => entry.url))],
    phoneNumbers: [...phoneNumbers],
    emails,
    upiIds,
    urlAnalysis: urls,
  };
}

function riskLevelForScore(score) {
  if (score <= 29) return "LOW RISK";
  if (score <= 69) return "SUSPICIOUS";
  return "HIGH RISK";
}

export async function analyzeScreenshotText(text, ocrConfidence, language = "en") {
  const extracted = extractScreenshotInformation(text);
  const analysis = await analyzeScamRequest({
    content: extracted.text,
    type: "message",
    displayType: "screenshot",
    language,
  });

  const indicators = (analysis.signals || []).map((signal) => ({
    type: signal.type,
    severity: signal.severity,
    description: signal.explanation,
  }));
  let additionalRisk = 0;
  for (const phone of extracted.phoneNumbers) {
    const phoneAssessment = assessPhoneNumber(phone);
    if (phoneAssessment.riskScore >= 30) {
      additionalRisk = Math.max(additionalRisk, 10);
      indicators.push({
        type: "suspicious_phone_number",
        severity: "medium",
        description: "A phone number in the screenshot has suspicious patterns or local reports.",
      });
    }
  }
  for (const url of extracted.urlAnalysis) {
    if (url.suspicious && !indicators.some((indicator) => indicator.type === "suspicious_url")) {
      indicators.push({
        type: "suspicious_url",
        severity: "high",
        description: url.reasons.join(" "),
      });
    }
  }

  const riskScore = Math.min(100, Math.max(0, Math.round(analysis.riskScore + additionalRisk)));
  const confidence = Math.min(ocrConfidence, Number(analysis.confidence) || 58) / 100;
  const recommendations = analysis.recommendedActions.slice(0, 4);

  return {
    success: true,
    riskScore,
    riskLevel: riskLevelForScore(riskScore),
    confidence: Math.round(confidence * 100) / 100,
    summary: analysis.summary,
    extracted: {
      text: extracted.text,
      urls: extracted.urls,
      phoneNumbers: extracted.phoneNumbers,
      emails: extracted.emails,
      upiIds: extracted.upiIds,
    },
    indicators,
    recommendations,
    disclaimer: "This is an automated risk assessment and cannot guarantee that content is safe or fraudulent.",
    analysisMethod: analysis.analysisMethod,
  };
}

export function getScreenshotReadError() {
  return READ_ERROR;
}
