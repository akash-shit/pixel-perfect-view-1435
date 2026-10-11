import assert from "node:assert/strict";
import { test } from "node:test";
import { answerAssistantQuestion } from "../src/services/assistantService.js";

const AI_ENV_KEYS = ["AI_API_KEY", "AI_API_URL", "AI_MODEL"];

function withAiEnvironment(t, values) {
  const originalEnvironment = Object.fromEntries(
    AI_ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  for (const key of AI_ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  t.after(() => {
    for (const key of AI_ENV_KEYS) {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    }
    globalThis.fetch = originalFetch;
  });
}

test("assistant uses the configured provider and selected language", async (t) => {
  withAiEnvironment(t, {
    AI_API_KEY: "test-key",
    AI_API_URL: "https://ai.example.test/chat",
    AI_MODEL: "test-model",
  });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({ answer: "নিরাপদে যাচাই করুন।" }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const answer = await answerAssistantQuestion({
    question: "OTP is 123456. Explain domain squatting in simple Bengali.",
    language: "bn",
  });

  assert.equal(answer, "নিরাপদে যাচাই করুন।");
  assert.equal(request.url, "https://ai.example.test/chat");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.model, "test-model");
  assert.deepEqual(JSON.parse(payload.messages[1].content), {
    language: "Bengali",
    question: "OTP is [REDACTED]. Explain domain squatting in simple Bengali.",
  });
});

test("assistant reports missing private AI configuration", async (t) => {
  withAiEnvironment(t, {});

  await assert.rejects(
    answerAssistantQuestion({
      question: "Explain domain squatting with examples.",
      language: "en",
    }),
    (error) =>
      error.status === 503 &&
      error.publicCode === "AI_NOT_CONFIGURED" &&
      /AI_API_KEY, AI_API_URL, and AI_MODEL/.test(error.publicMessage),
  );
});

test("assistant answers common questions in the selected language without AI configuration", async (t) => {
  withAiEnvironment(t, {});

  const cases = [
    {
      question: "hi",
      language: "en",
      expected: /Hi! I’m your ScamShield assistant/,
    },
    {
      question: "Can you help me?",
      language: "en",
      expected: /Hi! I’m your ScamShield assistant/,
    },
    {
      question: "What is ScamShield?",
      language: "en",
      expected: /ScamShield helps you check suspicious messages/,
    },
    {
      question: "How can I check a suspicious message?",
      language: "en",
      expected: /Open Check, choose Message/,
    },
    {
      question: "नमस्ते",
      language: "hi",
      expected: /नमस्ते! मैं ScamShield सहायक हूँ/,
    },
    {
      question: "संदिग्ध संदेश की जाँच कैसे करूँ?",
      language: "hi",
      expected: /जाँचें खोलें, संदेश चुनें/,
    },
    {
      question: "সন্দেহজনক বার্তা কীভাবে পরীক্ষা করব?",
      language: "bn",
      expected: /Check খুলে Message বেছে/,
    },
    {
      question: "নকল UPI ID কীভাবে চিনব?",
      language: "bn",
      expected: /UPI ID\/পেমেন্ট অনুরোধটি পেস্ট করুন/,
    },
  ];

  for (const example of cases) {
    assert.match(
      await answerAssistantQuestion(example),
      example.expected,
      `${example.language} fallback for ${example.question}`,
    );
  }
});
