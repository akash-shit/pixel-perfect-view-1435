import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LANGUAGE_CODES = new Set(["en", "hi", "bn"]);
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_PENDING_REQUESTS = 4;
const DEFAULT_MODEL_INIT_TIMEOUT_MS = 45 * 60 * 1000;
const TRANSCRIPTION_TIMEOUT_MS = 2 * 60 * 1000;
const SERVICE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const WORKER_SCRIPT = join(SERVICE_DIRECTORY, "localWhisperWorker.py");
const BACKEND_DIRECTORY = join(SERVICE_DIRECTORY, "../..");
const VENV_PYTHON = join(BACKEND_DIRECTORY, ".venv", "bin", "python3");

let workerProcess;
let workerStartup;
let nextRequestId = 1;
const pendingRequests = new Map();
let outputBuffer = "";
let activeRequests = 0;
let workerState = "not_started";
let loadedModel;
let requestedModel;
let workerFailureCode;

export function getSpeechTranscriptionStatus() {
  if (workerProcess?.exitCode === null && loadedModel) {
    return {
      state: "ready",
      model: loadedModel,
      requestedModel,
      fallback: loadedModel !== requestedModel,
    };
  }
  if (workerState === "unavailable") {
    return {
      state: "unavailable",
      requestedModel,
      code: workerFailureCode,
    };
  }
  if (workerStartup && workerProcess?.exitCode === null) {
    return { state: "initializing", requestedModel };
  }
  return { state: "not_started", requestedModel: configuredModel() };
}

function publicError(status, code, publicMessage) {
  const error = new Error("Local speech transcription failed.");
  error.status = status;
  error.publicCode = code;
  error.publicMessage = publicMessage;
  return error;
}

export async function transcribeAssistantAudio({ audio, mimeType, language }) {
  if (!LANGUAGE_CODES.has(language)) {
    throw publicError(
      400,
      "STT_INVALID_LANGUAGE",
      "Choose English, Hindi, or Bengali.",
    );
  }
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    throw publicError(
      400,
      "STT_EMPTY_AUDIO",
      "No audio was received. Please record your question again.",
    );
  }
  if (audio.length > MAX_AUDIO_BYTES) {
    throw publicError(
      413,
      "STT_AUDIO_TOO_LARGE",
      "Audio must be 10 MB or smaller.",
    );
  }
  if (activeRequests >= MAX_PENDING_REQUESTS) {
    throw publicError(
      503,
      "STT_QUEUE_FULL",
      "Local speech transcription is processing other recordings. Please wait and try again.",
    );
  }

  activeRequests += 1;
  try {
    console.info(
      `[assistant-transcription] forwarding bytes=${audio.length} mime=${mimeType.split(";")[0].toLowerCase()} language=${language}`,
    );
    await ensureWorker();
    return await sendAudioToWorker({ audio, mimeType, language });
  } finally {
    activeRequests -= 1;
  }
}

async function ensureWorker() {
  if (workerProcess?.exitCode === null && workerStartup) return workerStartup;
  if (workerStartup) return workerStartup;

  const pythonExecutable =
    process.env.WHISPER_PYTHON || (existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3");
  requestedModel = configuredModel();
  workerState = "initializing";
  workerFailureCode = undefined;
  loadedModel = undefined;
  const child = spawn(pythonExecutable, ["-u", WORKER_SCRIPT], {
    cwd: BACKEND_DIRECTORY,
    env: {
      ...process.env,
      WHISPER_MODEL: process.env.WHISPER_MODEL || "tiny",
      WHISPER_DEVICE: process.env.WHISPER_DEVICE || "cpu",
      WHISPER_COMPUTE_TYPE: process.env.WHISPER_COMPUTE_TYPE || "int8",
      WHISPER_DOWNLOAD_ROOT:
        process.env.WHISPER_DOWNLOAD_ROOT ||
        join(process.env.HOME || BACKEND_DIRECTORY, ".cache", "scamshield", "whisper"),
      WHISPER_MODEL_INIT_TIMEOUT_MS:
        process.env.WHISPER_MODEL_INIT_TIMEOUT_MS || String(DEFAULT_MODEL_INIT_TIMEOUT_MS),
      HF_HUB_DISABLE_XET: process.env.HF_HUB_DISABLE_XET || "1",
      HF_HUB_DOWNLOAD_TIMEOUT: process.env.HF_HUB_DOWNLOAD_TIMEOUT || "120",
      HF_HUB_ETAG_TIMEOUT: process.env.HF_HUB_ETAG_TIMEOUT || "20",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  workerProcess = child;

  workerStartup = new Promise((resolve, reject) => {
    let ready = false;
    const configuredTimeout = Number(process.env.WHISPER_MODEL_INIT_TIMEOUT_MS);
    const startupTimeout =
      Number.isFinite(configuredTimeout) && configuredTimeout >= 30_000
        ? Math.min(configuredTimeout, 60 * 60 * 1000)
        : DEFAULT_MODEL_INIT_TIMEOUT_MS;
    const startupTimer = setTimeout(() => {
      if (ready) return;
      const error = publicError(
        503,
        "STT_MODEL_DOWNLOAD_FAILED",
        "Local Whisper could not download and load a model before the configured timeout. Check network access to huggingface.co or increase WHISPER_MODEL_INIT_TIMEOUT_MS.",
      );
      workerState = "unavailable";
      workerFailureCode = error.publicCode;
      child.kill();
      reject(error);
    }, startupTimeout);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      outputBuffer += chunk;
      let newline = outputBuffer.indexOf("\n");
      while (newline !== -1) {
        const line = outputBuffer.slice(0, newline);
        outputBuffer = outputBuffer.slice(newline + 1);
        handleWorkerMessage(line, child, (startupMessage) => {
          if (ready) return;
          ready = true;
          clearTimeout(startupTimer);
          if (startupMessage.error) {
            workerState = "unavailable";
            workerFailureCode = startupMessage.code || "STT_MODEL_INIT";
            reject(
              publicError(
                503,
                workerFailureCode,
                startupMessage.code === "STT_MODEL_DOWNLOAD_FAILED"
                  ? "The local Whisper models could not be downloaded. Check your connection to huggingface.co; partial cached downloads are kept for retry."
                  : "The local Whisper model could not start. Install the speech requirements and check the backend logs.",
              ),
            );
            child.kill();
            return;
          }
          resolve();
        });
        newline = outputBuffer.indexOf("\n");
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (text) console.error("Local Whisper worker:", text.slice(0, 500));
    });
    child.once("error", () => {
      clearTimeout(startupTimer);
      const error = publicError(
        503,
        "STT_PYTHON_UNAVAILABLE",
        "Python could not start the local Whisper worker. Install the speech requirements and try again.",
      );
      workerState = "unavailable";
      workerFailureCode = error.publicCode;
      failWorker(child, error);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(startupTimer);
      const error = publicError(
        503,
        "STT_WORKER_EXITED",
        "The local Whisper worker stopped unexpectedly. Restart the backend and try again.",
      );
      if (!ready) {
        workerState = "unavailable";
        workerFailureCode = error.publicCode;
      }
      failWorker(child, error);
      if (!ready) reject(error);
      if (code !== 0) console.error(`Local Whisper worker exited with code ${code}.`);
    });
  }).finally(() => {
    if (workerProcess === child && child.exitCode !== null) {
      workerProcess = undefined;
    }
    if (workerProcess !== child) workerStartup = undefined;
  });

  return workerStartup;
}

function handleWorkerMessage(line, child, onStartupMessage) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    console.error("Local Whisper worker returned invalid protocol data.");
    return;
  }

  if (message.type === "ready" || message.type === "startup_error") {
    onStartupMessage({
      error: message.type === "startup_error",
      code: message.code,
      model: message.model,
      requestedModel: message.requested_model,
    });
    if (message.type === "ready") {
      loadedModel = message.model;
      requestedModel = message.requested_model;
      workerState = "ready";
    }
    return;
  }

  const pending = pendingRequests.get(message.id);
  if (!pending || pending.child !== child) return;
  pendingRequests.delete(message.id);
  clearTimeout(pending.timer);

  if (message.error) {
    const messageText =
      message.code === "STT_SILENCE"
        ? "No microphone audio was detected. Check the selected input and its volume, then try again."
        : message.code === "STT_NO_SPEECH"
          ? "Audio was received, but speech could not be understood. Check the selected language, speak clearly, and record a little longer."
          : "The local Whisper model could not transcribe this recording. Try a clearer recording or type your question.";
    pending.reject(
      publicError(
        message.status || 502,
        message.code || "STT_TRANSCRIPTION_FAILED",
        messageText,
      ),
    );
  } else if (typeof message.transcript !== "string" || !message.transcript.trim()) {
    pending.reject(
      publicError(
        422,
        "STT_NO_SPEECH",
        "Audio was received, but speech could not be understood. Check the selected language, speak clearly, and record a little longer.",
      ),
    );
  } else if (message.transcript.length > 1200) {
    pending.reject(
      publicError(
        422,
        "STT_TRANSCRIPT_TOO_LONG",
        "The recognized text is too long. Please record a shorter question.",
      ),
    );
  } else {
    pending.resolve(message.transcript.trim());
  }
}

function sendAudioToWorker({ audio, mimeType, language }) {
  const child = workerProcess;
  if (!child || child.exitCode !== null || !child.stdin.writable) {
    return Promise.reject(
      publicError(
        503,
        "STT_WORKER_UNAVAILABLE",
        "The local Whisper worker is unavailable. Restart the backend and try again.",
      ),
    );
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(
        publicError(
          504,
          "STT_TIMEOUT",
          "Local speech transcription took too long. Please try again.",
        ),
      );
    }, TRANSCRIPTION_TIMEOUT_MS);

    pendingRequests.set(id, { child, resolve, reject, timer });
    child.stdin.write(
      `${JSON.stringify({
        id,
        language,
        mimeType: mimeType.split(";")[0].toLowerCase(),
        extension: audioExtension(mimeType),
        audio: audio.toString("base64"),
      })}\n`,
      (error) => {
        if (!error) return;
        const pending = pendingRequests.get(id);
        if (!pending) return;
        pendingRequests.delete(id);
        clearTimeout(pending.timer);
        reject(
          publicError(
            503,
            "STT_WORKER_UNAVAILABLE",
            "The local Whisper worker could not receive the recording. Restart the backend and try again.",
          ),
        );
      },
    );
  });
}

function failWorker(child, error) {
  if (workerProcess === child) {
    workerProcess = undefined;
    workerStartup = undefined;
    outputBuffer = "";
  }
  for (const [id, pending] of pendingRequests) {
    if (pending.child !== child) continue;
    pendingRequests.delete(id);
    clearTimeout(pending.timer);
    pending.reject(error);
  }
}

function audioExtension(mimeType) {
  const mediaType = mimeType.split(";")[0].toLowerCase();
  if (mediaType === "audio/ogg") return "ogg";
  if (mediaType === "audio/mp4" || mediaType === "audio/x-m4a") return "m4a";
  if (mediaType === "audio/mpeg" || mediaType === "audio/mp3") return "mp3";
  if (mediaType === "audio/wav" || mediaType === "audio/x-wav") return "wav";
  if (mediaType === "audio/flac") return "flac";
  return "webm";
}

function configuredModel() {
  return process.env.WHISPER_MODEL || "tiny";
}
