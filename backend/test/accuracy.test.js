import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeScam, getRiskLevel } from "../src/services/scamDetectionService.js";
import { analyzeScamRequest } from "../src/services/scamAnalyzer.js";
import { extractScreenshotInformation } from "../src/services/screenshotAnalysis.js";
import { analyzeUrlString } from "../src/services/urlAnalyzer.js";

const CASES = [
  { name: "bank notification", scam: false, text: "Your salary was credited to your account today. Thank you for banking with us." },
  { name: "legitimate OTP", scam: false, text: "Your OTP for login is 123456. Never share it with anyone." },
  { name: "delivery update", scam: false, text: "Your parcel is out for delivery today. Track it in the official app." },
  { name: "payment receipt", scam: false, text: "Payment received: Rs 1,250 to your account. Thank you." },
  { name: "scam awareness", scam: false, text: "RBI will never ask you to share your OTP or PIN. Stay alert." },
    { name: "multi-topic scam warning", scam: false, text: "Never share your OTP. Do not transfer money or scan a QR code for a refund; these are common scam tricks." },
  { name: "legitimate support advice", scam: false, text: "For help, call the customer support number printed on your bank card." },
  { name: "official verification link", scam: false, text: "Review your account at https://www.icicibank.com/verify using the official app." },
  { name: "Hindi safety warning", scam: false, text: "अपना OTP किसी को न बताएं। बैंक कभी OTP नहीं मांगता।" },
  { name: "fake KYC and bank block", scam: true, text: "Your SBI account will be blocked today. Verify your KYC and share your OTP at http://sbi-secure-login.example/verify" },
  { name: "fake UPI refund fee", scam: true, text: "Your refund is ready. Pay a Rs 499 processing fee to receive it through UPI." },
  { name: "lottery fee", scam: true, text: "Congratulations, you won a prize. Send Rs 999 processing fee to claim it." },
  { name: "courier customs payment", scam: true, text: "Customs has held your parcel. Pay duty now at http://parcel-release.example/pay or delivery will be cancelled." },
  { name: "government impersonation", scam: true, text: "This is CBI. A case is filed against you. Transfer Rs 50,000 now to avoid arrest." },
  { name: "fake bank support remote access", scam: true, text: "Bank support here. Install AnyDesk and share your screen so we can reverse the payment." },
  { name: "fake job registration fee", scam: true, text: "Earn guaranteed daily income from home. Pay a registration fee to start today." },
  { name: "investment deposit", scam: true, text: "Guaranteed 20% daily investment returns. Pay a deposit today to join." },
  { name: "OTP phishing", scam: true, text: "Send your OTP immediately or your account will be blocked." },
  { name: "UPI collect refund", scam: true, text: "To receive your refund, approve the collect request in your UPI app." },
  { name: "typosquatted payment site", scam: true, text: "Sign in at https://paypa1.com/login to receive your refund." },
  { name: "mixed Hindi-English electricity threat", scam: true, text: "Bijli bill unpaid. Pay now to avoid connection cut. Verify at https://electricity-dues.example/pay" },
];

const EMAIL_CASES = [
  {
    name: "legitimate-looking transaction email",
    scam: false,
    text: `Subject: Regarding Your Recent Bank Transaction

Dear Customer,

We noticed an issue while processing your recent transaction. The payment has not been completed yet and may require some additional verification.

Please review your transaction details and confirm the information associated with your account so we can complete the process.

Thank you for your cooperation.

Regards,

Customer Support Team

ABC Bank`,
  },
  {
    name: "bank impersonation with mismatched verification domain",
    scam: true,
    text: `Subject: Regarding Your Recent Account Activity

Dear Customer,

We noticed unusual activity associated with your bank account during a recent security review.

To prevent any interruption to your online banking services, please review and confirm your account information using the secure verification page below:

https://account-security.example/verify

Please complete the verification at your earliest convenience.

Regards,

Online Banking Support

ABC Bank Security Team`,
  },
];

test("scam detection separates legitimate content from multi-signal scams", () => {
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  const errors = [];

  for (const example of CASES) {
    const result = analyzeScam(example.text, "message");
    const predictedScam = result.riskScore >= 30;
    if (example.scam && predictedScam) truePositives += 1;
    else if (!example.scam && !predictedScam) trueNegatives += 1;
    else if (predictedScam) {
      falsePositives += 1;
      errors.push(`${example.name}: false positive (${result.riskScore})`);
    } else {
      falseNegatives += 1;
      errors.push(`${example.name}: false negative (${result.riskScore})`);
    }
  }

  const accuracy = (truePositives + trueNegatives) / CASES.length;
  console.info(JSON.stringify({
    total: CASES.length,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    accuracy: Number(accuracy.toFixed(2)),
    errors,
  }));
  assert.ok(falsePositives <= 1, errors.join("\n"));
  assert.ok(falseNegatives <= 2, errors.join("\n"));
  assert.ok(accuracy >= 0.85, `Detection accuracy was ${accuracy.toFixed(2)}`);
});

test("provided bank emails distinguish normal account language from mismatched verification links", () => {
  const results = EMAIL_CASES.map((email) => ({
    name: email.name,
    expectedScam: email.scam,
    ...analyzeScam(email.text, "message", "email"),
  }));

  console.info(JSON.stringify(results.map(({ name, expectedScam, riskScore, riskLevel, matchedSignals, reasons }) => ({
    name,
    expectedScam,
    riskScore,
    riskLevel,
    signals: matchedSignals,
    reasons,
  }))));

  assert.ok(results[0].riskScore <= 29, `Legitimate sample scored ${results[0].riskScore}`);
  assert.deepEqual(results[0].matchedSignals, ["routine_financial_notice"]);
  assert.ok(results[1].riskScore >= 60, `Scam sample scored only ${results[1].riskScore}`);
  assert.ok(results[1].matchedSignals.includes("brand_impersonation"));
  assert.ok(results[1].matchedSignals.includes("credential_request"));
});

test("email context requires concrete credential, payment, or URL evidence", () => {
  const cases = [
    ["bank security notice", "ABC Bank security review completed successfully. Your account remains active; no action is required.", "low"],
    ["generic account verification", "Please review and confirm the information associated with your account so we can complete the process.", "low"],
    ["OTP warning", "ABC Bank will never ask you to share your OTP. Do not send it to anyone.", "low"],
    ["OTP phishing", "ABC Bank: Send your OTP immediately or your account will be blocked.", "high"],
    ["payment request with threat", "ABC Bank: Pay Rs 499 immediately to restore access or your account will be blocked.", "high"],
    ["suspicious link without scam language", "Your statement is available at https://paypa1.com/login.", "suspicious"],
    ["scary wording without requested action", "We noticed unusual account activity during a recent security review. No action is needed.", "low"],
  ];

  for (const [name, email, expected] of cases) {
    const result = analyzeScam(email, "message", "email");
    const actual = result.riskScore >= 60 ? "high" : result.riskScore >= 30 ? "suspicious" : "low";
    assert.equal(actual, expected, `${name}: score=${result.riskScore}, signals=${result.matchedSignals.join(",")}`);
  }
});

test("protective OTP language stays low risk while an explicit request does not", () => {
  const warning = analyzeScam("Your bank will NEVER ask you to share your OTP. Stay alert.");
  const request = analyzeScam("Share your OTP immediately or your account will be blocked.");

  assert.equal(warning.riskLevel, "low");
  assert.equal(warning.matchedSignals.includes("credential_request"), false);
  assert.ok(request.riskScore >= 60);
  assert.ok(request.matchedSignals.includes("credential_request"));
});

test("URL checks flag lookalike domains but not a trusted verify path alone", () => {
  const lookalike = analyzeUrlString("https://paypa1.com/login");
  const official = analyzeUrlString("https://www.icicibank.com/verify");

  assert.equal(lookalike.suspicious, true);
  assert.equal(lookalike.lookalikeBrand, "PayPal");
  assert.equal(official.suspicious, false);
});

test("multiple URLs are analyzed independently and unknown phone numbers are not proof", () => {
  const links = analyzeScam(
    "Read the help article at https://www.icicibank.com/verify, but enter details at https://paypa1.com/login.",
    "message",
  );
  const unknownPhone = analyzeScam("Call 9876543210 or 9123456789 about your account statement.", "phone");
  const multipleContactsWithPayment = analyzeScam("Send Rs 500 to verify the refund; call 9876543210 or 9123456789.");

  assert.equal(links.urlAnalysis.length, 2);
  assert.equal(links.urlAnalysis.filter((entry) => entry.suspicious).length, 1);
  assert.ok(links.matchedSignals.includes("brand_impersonation"));
  assert.equal(unknownPhone.riskLevel, "low");
  assert.ok(multipleContactsWithPayment.riskScore > unknownPhone.riskScore);
});

test("protective advice does not hide an active scam request in the next sentence", () => {
  const result = analyzeScam(
    "Never share your OTP with anyone. Send your OTP now to claim the refund.",
  );
  assert.ok(result.riskScore >= 60);
  assert.ok(result.matchedSignals.includes("credential_request"));
  assert.ok(result.matchedSignals.includes("refund_scam"));
});

test("screenshot extraction preserves OCR entities and independently detects a lookalike URL", () => {
  const extracted = extractScreenshotInformation(
    "SBl account blocked. Share OTP with support@example.com. Call +91 98765 43210 or 9123456789. Pay elder@ybl at https://paypa1.com/login",
  );
  const result = analyzeScam(extracted.text, "message", "screenshot");

  assert.deepEqual(extracted.urls, ["https://paypa1.com/login"]);
  assert.deepEqual(extracted.emails, ["support@example.com"]);
  assert.deepEqual(extracted.upiIds, ["elder@ybl"]);
  assert.deepEqual(extracted.phoneNumbers, ["+919876543210", "+919123456789"]);
  assert.ok(result.matchedSignals.includes("suspicious_link"));
});

test("risk labels preserve established cutoffs", () => {
  assert.equal(getRiskLevel(29), "low");
  assert.equal(getRiskLevel(30), "suspicious");
  assert.equal(getRiskLevel(60), "high");
  assert.equal(getRiskLevel(80), "very_high");
});

test("AI and rules blend evidence and lower confidence when they disagree", async () => {
  const previousEnvironment = {
    AI_API_KEY: process.env.AI_API_KEY,
    AI_API_URL: process.env.AI_API_URL,
    AI_MODEL: process.env.AI_MODEL,
  };
  const previousFetch = globalThis.fetch;
  process.env.AI_API_KEY = "test-key";
  process.env.AI_API_URL = "https://ai.example.test/chat";
  process.env.AI_MODEL = "test-model";
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    const userContent = JSON.parse(request.messages[1].content).content;
    const isProtective = userContent.includes("NEVER ask you to share");
    const analysis = {
      riskScore: isProtective ? 96 : 92,
      confidence: 94,
      summary: isProtective ? "The message may be suspicious." : "The message asks for sensitive details under pressure.",
      verdict: isProtective ? "Suspicious" : "Likely Scam",
      signals: [{ type: "credential_request", severity: "high", explanation: "A credential request was detected." }],
      recommendedActions: ["Verify through an official source."],
      shouldClick: false,
    };
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(analysis) } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const protective = await analyzeScamRequest({
      content: "Your bank will NEVER ask you to share your OTP. Stay alert.",
      type: "message",
    });
    const scam = await analyzeScamRequest({
      content: "Share your OTP immediately or your account will be blocked at https://paypa1.com/login.",
      type: "message",
    });

    assert.equal(protective.riskLevel, "low");
    assert.ok(protective.confidence < scam.confidence);
    assert.ok(scam.riskScore >= 60);
    assert.ok(scam.signals.some((signal) => signal.type === "credential_request"));
    assert.ok(scam.signals.some((signal) => signal.type === "brand_impersonation"));
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("AI false positives do not overturn routine bank email context", async () => {
  const previousEnvironment = {
    AI_API_KEY: process.env.AI_API_KEY,
    AI_API_URL: process.env.AI_API_URL,
    AI_MODEL: process.env.AI_MODEL,
  };
  const previousFetch = globalThis.fetch;
  process.env.AI_API_KEY = "test-key";
  process.env.AI_API_URL = "https://ai.example.test/chat";
  process.env.AI_MODEL = "test-model";
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    const content = JSON.parse(request.messages[1].content).content;
    const scamLinkPresent = content.includes("account-security.example");
    const response = {
      riskScore: 90,
      confidence: 92,
      summary: "Verification language was detected.",
      verdict: "Suspicious",
      signals: [{ type: "credential_request", severity: "high", explanation: "The email may request account information." }],
      recommendedActions: ["Verify with the bank using its official app."],
      shouldClick: false,
    };
    if (scamLinkPresent) response.signals.push({ type: "suspicious_link", severity: "high", explanation: "An external verification link was found." });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(response) } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const legitimate = await analyzeScamRequest({ content: EMAIL_CASES[0].text, type: "message", displayType: "email" });
    const scam = await analyzeScamRequest({ content: EMAIL_CASES[1].text, type: "message", displayType: "email" });

    assert.ok(legitimate.riskScore <= 29, `Legitimate email scored ${legitimate.riskScore}`);
    assert.equal(legitimate.riskLevel, "low");
    assert.ok(scam.riskScore >= 60, `Scam email scored ${scam.riskScore}`);
    assert.ok(scam.confidence > legitimate.confidence);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
