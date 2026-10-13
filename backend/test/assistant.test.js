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

test("assistant returns a safe fallback when AI configuration is missing", async (t) => {
  withAiEnvironment(t, {});

  const answer = await answerAssistantQuestion({
    question: "Explain domain squatting with examples.",
    language: "en",
  });

  assert.match(answer, /I’m having trouble connecting|ScamShield/);
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
      question: "i want to check a msg",
      language: "en",
      expected: /Open Check, choose Message/,
    },
    {
      question: "i want to check a link",
      language: "en",
      expected: /Open Check and choose Link/,
    },
    {
      question: "i want to check a UPI ID",
      language: "en",
      expected: /Open Check and choose the UPI option/,
    },
    {
      question: "i want to check a screenshot",
      language: "en",
      expected: /Open Check and choose Screenshot/,
    },
    {
      question: "check this phone number",
      language: "en",
      expected: /Phone Number/,
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

test("assistant distinguishes trusted contact saving from scam checks", async (t) => {
  withAiEnvironment(t, {});

  const saveContact = await answerAssistantQuestion({
    question: "Save my mom's phone number in ScamShield.",
    language: "en",
  });
  assert.match(saveContact, /Family/);
  assert.doesNotMatch(saveContact, /Open Check and choose Phone Number/i);

  const phoneCheck = await answerAssistantQuestion({
    question: "Is this phone number suspicious?",
    language: "en",
  });
  assert.match(
    phoneCheck,
    /Check and choose Phone Number|check whether a phone number looks suspicious/i,
  );
});

test("assistant answers navigation and learning questions based on the real app screens", async (t) => {
  withAiEnvironment(t, {});

  const historyAnswer = await answerAssistantQuestion({
    question: "Where do I find my previous checks?",
    language: "en",
  });
  assert.match(historyAnswer, /History/i);

  const learnAnswer = await answerAssistantQuestion({
    question: "Teach me how phishing works.",
    language: "en",
  });
  assert.match(learnAnswer, /Learn|phishing|warning signs/i);

  const emergencyAnswer = await answerAssistantQuestion({
    question: "I think I was scammed and lost money.",
    language: "en",
  });
  assert.match(emergencyAnswer, /1930|cybercrime.gov.in|stop replying/i);
});

test("assistant explains when a direct block or delete action is unsupported", async (t) => {
  withAiEnvironment(t, {});

  const answer = await answerAssistantQuestion({
    question: "Block this scam number for me.",
    language: "en",
  });

  assert.match(answer, /does not currently offer|built-in call\/message blocking|Family page/i);
});

test("assistant falls back cleanly on AI configuration and provider errors", async (t) => {
  withAiEnvironment(t, {
    AI_API_KEY: "test-key",
    AI_API_URL: "https://ai.example.test/chat",
    AI_MODEL: "test-model",
  });

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "bad credentials" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  const invalidCredentialsAnswer = await answerAssistantQuestion({
    question: "Tell me how to use ScamShield.",
    language: "en",
  });
  assert.match(invalidCredentialsAnswer, /I’m having trouble connecting|ScamShield/);

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "rate limited" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });

  const rateLimitedAnswer = await answerAssistantQuestion({
    question: "Tell me how to use ScamShield.",
    language: "en",
  });
  assert.match(rateLimitedAnswer, /I’m having trouble connecting|ScamShield/);
});
