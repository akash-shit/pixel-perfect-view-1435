import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import { ScamCheck } from "../src/models/ScamCheck.js";
import { assessPhoneNumber } from "../src/services/phoneScamDetector.js";
import { extractScreenshotInformation } from "../src/services/screenshotAnalysis.js";
import { analyzeScam, getRiskLevel, redactSensitiveInput } from "../src/services/scamDetectionService.js";
import { AUTH_COOKIE, authCookieOptions, generateToken } from "../src/utils/generateToken.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  const closed = once(server, "close");
  server.close();
  await closed;
});

test("health endpoint responds with the documented status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, message: "Backend is running" });
});

test("screenshot extraction finds links, phone numbers, emails, and UPI IDs", () => {
  const result = extractScreenshotInformation(
    "Call +91 98765 43210 or email help@example.com. Pay using elder@ybl at https://bit.ly/claim",
  );
  assert.deepEqual(result.phoneNumbers, ["+919876543210"]);
  assert.deepEqual(result.emails, ["help@example.com"]);
  assert.deepEqual(result.upiIds, ["elder@ybl"]);
  assert.deepEqual(result.urls, ["https://bit.ly/claim"]);
});

test("screenshot endpoint rejects missing and unsupported uploads", async () => {
  const cookie = `${AUTH_COOKIE}=${generateToken("507f1f77bcf86cd799439011")}`;
  const missing = await fetch(`${baseUrl}/api/screenshot/analyze`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: new FormData(),
  });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).success, false);

  const formData = new FormData();
  formData.append("screenshot", new Blob(["not an image"], { type: "application/x-msdownload" }), "payload.exe");
  const unsupported = await fetch(`${baseUrl}/api/screenshot/analyze`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });
  assert.equal(unsupported.status, 415);
});

test("screenshot endpoint rejects spoofed image MIME and oversized uploads", async () => {
  const cookie = `${AUTH_COOKIE}=${generateToken("507f1f77bcf86cd799439011")}`;
  const spoofedForm = new FormData();
  spoofedForm.append("screenshot", new Blob(["not a png"], { type: "image/png" }), "fake.png");
  const spoofed = await fetch(`${baseUrl}/api/screenshot/analyze`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: spoofedForm,
  });
  assert.equal(spoofed.status, 415);

  const largeForm = new FormData();
  largeForm.append("screenshot", new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" }), "large.png");
  const oversized = await fetch(`${baseUrl}/api/screenshot/analyze`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: largeForm,
  });
  assert.equal(oversized.status, 413);
});

test("credentialed CORS allows the configured frontend origin", async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "http://localhost:5174" } });
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5174");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("credentialed CORS handles the frontend login preflight", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5174",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5174");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(response.headers.get("access-control-allow-methods") || "", /POST/);
});

test("credentialed CORS rejects an unconfigured origin", async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://not-allowed.example" } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("user data endpoints reject requests without a session", async () => {
  const [contacts, history, analyze] = await Promise.all([
    fetch(`${baseUrl}/api/contacts`),
    fetch(`${baseUrl}/api/scam/history`),
    fetch(`${baseUrl}/api/scam/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "message", content: "hello" }) }),
  ]);
  assert.equal(contacts.status, 401);
  assert.equal(history.status, 401);
  assert.equal(analyze.status, 401);

  const invalidSession = await fetch(`${baseUrl}/api/contacts`, {
    headers: { Cookie: `${AUTH_COOKIE}=not-a-valid-token` },
  });
  assert.equal(invalidSession.status, 401);
});

test("session token is signed and configured for an HTTP-only cookie", () => {
  const userId = "507f1f77bcf86cd799439011";
  const token = generateToken(userId);
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const options = authCookieOptions();
  assert.equal(payload.sub, userId);
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, process.env.NODE_ENV === "production");
  assert.equal(options.sameSite, process.env.NODE_ENV === "production" ? "none" : "lax");
});

test("detector identifies several requested warning signals", () => {
  const result = analyzeScam(
    "Your KYC is incomplete. Your account will be blocked today. Click this link immediately.",
    "message",
  );
  assert.ok(result.matchedSignals.includes("urgency"));
  assert.ok(result.matchedSignals.includes("kyc_scam"));
  assert.equal(result.matchedSignals.includes("credential_request"), false);
  assert.ok(result.matchedSignals.includes("threat"));
  assert.ok(result.riskScore >= 60);
});

test("ordinary conversation stays low risk", () => {
  const result = analyzeScam("Hi, how are you? Call me when you are free.", "message");
  assert.equal(result.riskLevel, "low");
  assert.equal(result.riskScore, 0);
});

test("scam history accepts structured AI signals without schema cast errors", async () => {
  const doc = new ScamCheck({
    userId: new mongoose.Types.ObjectId(),
    type: "message",
    input: "Your bank account will be blocked today. Click this link immediately.",
    riskScore: 92,
    riskLevel: "very_high",
    signals: [
      { type: "urgency", severity: "high", explanation: "The message pressures you to act quickly." },
      { type: "suspicious_url", severity: "high", explanation: "The link may lead to a fake website." },
    ],
    urlAnalysis: [{ url: "https://example.com/verify", domain: "example.com", suspicious: true, reasons: ["Suspicious domain"] }],
    recommendedActions: ["Do not click the link."],
    matchedSignals: ["urgency", "suspicious_url"],
    verificationSteps: ["Verify using the official app."],
    limitations: ["AI may not fully verify every link."],
    analysisMethod: "ai",
    confidence: 96,
  });

  await doc.validate();
  assert.equal(doc.signals[0].type, "urgency");
  assert.equal(doc.urlAnalysis[0].domain, "example.com");
});

test("a URL keyword alone does not create a suspicious-link signal", () => {
  const result = analyzeScam("https://example.com/verify", "link");
  assert.equal(result.matchedSignals.includes("suspicious_link"), false);
});

test("legacy demo phone reports and QR payment warnings are retained", () => {
  const reportedPhone = analyzeScam("+91 98123 45678", "phone");
  const qr = analyzeScam("upi://pay?pa=unknown@bank&am=4999", "message", "qr");
  assert.equal(reportedPhone.riskScore, 84);
  assert.ok(reportedPhone.matchedSignals.includes("reported_phone_high"));
  assert.ok(qr.matchedSignals.includes("qr_payment"));
  assert.ok(qr.recommendedActions.some((action) => action.includes("Never scan a QR code")));
});

test("risk thresholds and saved-history secret redaction are stable", () => {
  assert.equal(getRiskLevel(29), "low");
  assert.equal(getRiskLevel(30), "suspicious");
  assert.equal(getRiskLevel(60), "high");
  assert.equal(getRiskLevel(80), "very_high");
  const safeText = redactSensitiveInput("OTP: 123456, PIN: 1234, card 4111 1111 1111 1111, Aadhaar 1234 5678 9012");
  assert.equal(safeText.includes("123456"), false);
  assert.equal(safeText.includes("1234 5678 9012"), false);
  assert.equal(safeText.includes("4111 1111 1111 1111"), false);
  assert.equal(safeText.includes("PIN: 1234"), false);
});

test("obvious phishing messages are flagged as high risk", () => {
  const result = analyzeScam("Your bank account will be blocked today. Click this link immediately to complete KYC.", "message");
  assert.ok(result.riskScore >= 60);
  assert.ok(["high", "very_high"].includes(result.riskLevel));
  assert.ok(result.matchedSignals.includes("threat") || result.matchedSignals.includes("urgency"));
});

test("OTP requests are treated as high risk", () => {
  const result = analyzeScam("Your parcel could not be delivered. Share the OTP with our delivery agent.", "message");
  assert.ok(result.riskScore >= 60);
  assert.ok(["high", "very_high"].includes(result.riskLevel));
  assert.ok(result.matchedSignals.includes("credential_request"));
});

test("lottery and prize scams are marked very high risk", () => {
  const result = analyzeScam("Congratulations! You won ₹50,00,000. Pay ₹999 processing fee.", "message");
  assert.equal(result.riskLevel, "very_high");
  assert.ok(result.riskScore >= 80);
});

test("government impersonation messages are escalated to very high risk", () => {
  const result = analyzeScam("Police have detected illegal activity linked to your Aadhaar. Transfer ₹50,000 immediately.", "message");
  assert.equal(result.riskLevel, "very_high");
  assert.ok(result.riskScore >= 80);
});

test("suspicious URLs are flagged as high risk", () => {
  const result = analyzeScam("https://secure-bank-login-example.xyz/verify", "link");
  assert.ok(result.riskScore >= 60 || result.matchedSignals.includes("suspicious_link"));
});

test("ordinary conversation stays low risk", () => {
  const result = analyzeScam("Hi, are we meeting for lunch today?", "message");
  assert.equal(result.riskLevel, "low");
  assert.ok(result.riskScore <= 29);
});

test("normal well-known URLs are not treated as suspicious by default", () => {
  const result = analyzeScam("https://leetcode.com", "link");
  assert.equal(result.riskLevel, "low");
  assert.ok(result.riskScore <= 29);
  assert.equal(result.matchedSignals.includes("suspicious_link"), false);
});

test("legitimate-looking official URLs are not automatically treated as 100% safe", () => {
  const result = analyzeScam("https://www.icicibank.com/verify", "link");
  assert.ok(result.riskScore <= 59 || result.matchedSignals.length === 0);
  assert.ok(!result.matchedSignals.includes("suspicious_link"));
});

test("phone numbers are normalized and known scam numbers are flagged", () => {
  const result = assessPhoneNumber("+91 98765 43210");
  assert.equal(result.phone, "+919876543210");
  assert.ok(result.riskScore >= 0);
  assert.ok(["LOW RISK", "SUSPICIOUS", "HIGH RISK"].includes(result.status));

  const scamResult = assessPhoneNumber("+910000012345");
  assert.equal(scamResult.status, "HIGH RISK");
  assert.ok(scamResult.riskScore >= 70);
  assert.ok(scamResult.reasons.some((reason) => reason.toLowerCase().includes("known scam")));
});

test("phone check endpoint returns the assessment for signed-in users", async () => {
  const response = await fetch(`${baseUrl}/api/phone/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${AUTH_COOKIE}=${generateToken("507f1f77bcf86cd799439011")}`,
    },
    body: JSON.stringify({ phone: "+91 00000 12345" }),
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.phone, "+910000012345");
  assert.equal(result.status, "HIGH RISK");
  assert.ok(result.reasons.includes("This does not guarantee that the number is safe."));
});

test("phone check endpoint returns JSON errors for missing and malformed input", async () => {
  const cookie = `${AUTH_COOKIE}=${generateToken("507f1f77bcf86cd799439011")}`;
  const requests = [
    fetch(`${baseUrl}/api/phone/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    }),
    fetch(`${baseUrl}/api/phone/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ phone: "not-a-phone" }),
    }),
    fetch(`${baseUrl}/api/phone/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: "{",
    }),
  ];
  const responses = await Promise.all(requests);
  const results = await Promise.all(responses.map((response) => response.json()));

  assert.deepEqual(responses.map((response) => response.status), [400, 400, 400]);
  assert.match(results[0].message, /Phone number is required/i);
  assert.match(results[1].message, /Phone number is invalid/i);
  assert.equal(results[2].success, false);
});

test("phone normalization rejects malformed values and flags suspicious sequences", () => {
  assert.equal(assessPhoneNumber("Call me at 9876543210").valid, false);
  assert.equal(assessPhoneNumber("12345").valid, false);
  assert.equal(assessPhoneNumber("09876543210").phone, "+919876543210");
  assert.equal(assessPhoneNumber("9876543210").status, "SUSPICIOUS");

  const unknownNumber = assessPhoneNumber("+91 91234 56781");
  assert.equal(unknownNumber.status, "LOW RISK");
  assert.ok(unknownNumber.reasons.includes("No known scam reports found."));
  assert.ok(unknownNumber.reasons.includes("This does not guarantee that the number is safe."));
});

test("obviously malformed numbers are rejected", () => {
  const result = assessPhoneNumber("999999999999999");
  assert.equal(result.valid, false);
  assert.ok(result.reasons.some((reason) => reason.toLowerCase().includes("malformed")));
});