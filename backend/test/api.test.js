import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
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
  assert.ok(result.matchedSignals.includes("credential_request"));
  assert.ok(result.matchedSignals.includes("threat"));
  assert.ok(result.riskScore >= 60);
});

test("ordinary conversation stays low risk", () => {
  const result = analyzeScam("Hi, how are you? Call me when you are free.", "message");
  assert.equal(result.riskLevel, "low");
  assert.equal(result.riskScore, 0);
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