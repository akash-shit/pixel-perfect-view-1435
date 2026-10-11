import assert from "node:assert/strict";
import { test } from "node:test";
import { transcribeAssistantAudio } from "../src/services/speechTranscriptionService.js";

test("local Whisper transcription rejects invalid languages without starting a worker", async () => {
  await assert.rejects(
    transcribeAssistantAudio({
      audio: Buffer.from("audio"),
      mimeType: "audio/webm",
      language: "fr",
    }),
    (error) => error.status === 400 && error.publicCode === "STT_INVALID_LANGUAGE",
  );
});

test("local Whisper transcription rejects empty and oversized recordings", async () => {
  await assert.rejects(
    transcribeAssistantAudio({
      audio: Buffer.alloc(0),
      mimeType: "audio/webm",
      language: "en",
    }),
    (error) => error.status === 400 && error.publicCode === "STT_EMPTY_AUDIO",
  );
  await assert.rejects(
    transcribeAssistantAudio({
      audio: Buffer.alloc(10 * 1024 * 1024 + 1),
      mimeType: "audio/webm",
      language: "bn",
    }),
    (error) => error.status === 413 && error.publicCode === "STT_AUDIO_TOO_LARGE",
  );
});
