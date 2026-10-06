import type {
  AnalysisResult,
  CheckKind,
  SignalCategory,
  ScreenshotAnalysis,
  TrustedContact,
  UiLanguage,
} from "@/lib/types";

const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] || "http://localhost:5001/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ContactInput {
  name: string;
  phone: string;
  relationship: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach ScamShield right now. Check your connection and try again.",
      0,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message || "We could not complete that request.", response.status);
  }
  return payload as T;
}

const jsonBody = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const result = await request<{ user: AuthUser }>("/auth/me");
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 0)) return null;
    throw error;
  }
}

export async function loginRequest(email: string, password: string): Promise<AuthUser> {
  const result = await request<{ user: AuthUser }>("/auth/login", jsonBody({ email, password }));
  return result.user;
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await request<{ user: AuthUser }>(
    "/auth/register",
    jsonBody({ name, email, password }),
  );
  return result.user;
}

export async function logoutRequest(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

export async function getTrustedContacts(): Promise<TrustedContact[]> {
  const result = await request<{ contacts: Array<ContactInput & { id: string }> }>("/contacts");
  return result.contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    relation: contact.relationship,
    canBeAsked: true,
  }));
}

export async function addTrustedContact(contact: ContactInput): Promise<TrustedContact> {
  const result = await request<{ contact: ContactInput & { id: string } }>(
    "/contacts",
    jsonBody(contact),
  );
  return {
    id: result.contact.id,
    name: result.contact.name,
    phone: result.contact.phone,
    relation: result.contact.relationship,
    canBeAsked: true,
  };
}

export async function updateTrustedContact(
  id: string,
  contact: Partial<ContactInput>,
): Promise<TrustedContact> {
  const result = await request<{ contact: ContactInput & { id: string } }>(
    `/contacts/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(contact),
    },
  );
  return {
    id: result.contact.id,
    name: result.contact.name,
    phone: result.contact.phone,
    relation: result.contact.relationship,
    canBeAsked: true,
  };
}

export async function deleteTrustedContact(id: string): Promise<void> {
  await request(`/contacts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

interface ServerCheck {
  id: string;
  type: "message" | "link" | "phone" | "url";
  displayType?: CheckKind;
  input: string;
  riskScore: number;
  riskLevel: "low" | "suspicious" | "high" | "very_high";
  riskLabel?: string;
  verdict?: string;
  summary?: string;
  reasons: string[];
  recommendedActions: string[];
  matchedSignals: string[];
  analysisMethod?: "ai" | "rule-based-fallback";
  signals?: Array<{ type: string; severity: "low" | "medium" | "high"; explanation: string }>;
  urlAnalysis?: Array<{ url: string; domain: string; suspicious: boolean; reasons: string[] }>;
  confidence?: number;
  createdAt: string;
}

const SIGNAL_DETAILS: Record<
  string,
  { category: SignalCategory; title: string; explanation: string }
> = {
  urgency: {
    category: "Language",
    title: "Pressure to act quickly",
    explanation: "Scammers often create urgency so you act before checking.",
  },
  credential_request: {
    category: "Request",
    title: "Sensitive details mentioned",
    explanation: "Keep OTPs, passwords, PINs and banking details private.",
  },
  payment_request: {
    category: "Behavior",
    title: "Payment language found",
    explanation: "Check any payment request through the official app first.",
  },
  threat: {
    category: "Language",
    title: "Threatening language found",
    explanation: "Fear can make it harder to stop and verify a message.",
  },
  lottery: {
    category: "Context",
    title: "Unexpected prize or reward",
    explanation: "Unexpected prizes can be used to request fees or personal details.",
  },
  job_scam: {
    category: "Context",
    title: "Unusual job or income offer",
    explanation: "Real employers do not ask you to pay to receive work.",
  },
  remote_access: {
    category: "Request",
    title: "Remote access mentioned",
    explanation: "Never install screen-sharing apps at a caller's request.",
  },
  suspicious_link: {
    category: "URL",
    title: "Unusual link structure",
    explanation: "A web address can be suspicious when several warning signs appear together.",
  },
  caller_identity_unverified: {
    category: "Sender",
    title: "Caller identity is unverified",
    explanation: "A phone number alone cannot confirm who is calling.",
  },
  qr_payment: {
    category: "Request",
    title: "QR or UPI payment request",
    explanation: "Scanning a payment QR sends money; it does not receive a refund.",
  },
  reported_phone_suspicious: {
    category: "Sender",
    title: "Some demo reports for this number",
    explanation: "Community reports are indicators, not proof. Verify the caller independently.",
  },
  reported_phone_high: {
    category: "Sender",
    title: "Many demo reports for this number",
    explanation: "Community reports are indicators, not proof. Verify the caller independently.",
  },
};

function fromServerCheck(check: ServerCheck, language: UiLanguage): AnalysisResult {
  const level =
    check.riskLevel === "low" ? "safe" : check.riskLevel === "suspicious" ? "suspicious" : "high";

  const normalizedSignals = Array.isArray(check.signals) && check.signals.length > 0
    ? check.signals.map((signal) => ({
        category: SIGNAL_DETAILS[signal.type]?.category || "Context",
        severity:
          signal.severity === "high"
            ? ("critical" as const)
            : signal.severity === "medium"
              ? ("warn" as const)
              : ("ok" as const),
        title: SIGNAL_DETAILS[signal.type]?.title || signal.type || "A warning signal was found",
        explanation: signal.explanation || SIGNAL_DETAILS[signal.type]?.explanation || "Review this signal and verify the message independently.",
      }))
    : check.matchedSignals.map((matchedSignal) => {
        const details = SIGNAL_DETAILS[matchedSignal];
        return {
          category: details?.category || "Context",
          severity:
            level === "safe"
              ? ("ok" as const)
              : level === "suspicious"
                ? ("warn" as const)
                : ("critical" as const),
          title: details?.title || "A warning signal was found",
          explanation:
            details?.explanation || "Review this signal and verify the message independently.",
        };
      });

  if (normalizedSignals.length === 0) {
    normalizedSignals.push({
      category: "Context",
      severity: "ok",
      title: "No configured warning signals matched",
      explanation:
        "This rule-based check found no strong warning signs. It cannot prove a message is safe.",
    });
  }

  const headline =
    check.verdict ||
    (check.riskLevel === "very_high"
      ? "Several strong warning signs found"
      : check.riskLevel === "high"
        ? "High risk warning signs found"
        : check.riskLevel === "suspicious"
          ? "Some warning signs found"
          : "No strong warning signs found");

  return {
    id: check.id,
    kind: check.displayType || check.type,
    input: check.input,
    createdAt: check.createdAt,
    level,
    score: check.riskScore,
    headline,
    summary:
      check.summary ||
      "This Risk Score comes from configurable rules. It is not a scientifically calibrated probability; verify important information independently.",
    reasons: check.reasons,
    signals: normalizedSignals,
    highlights: [],
    actions: check.recommendedActions,
    language,
    analysisMethod: check.analysisMethod || "rule-based-fallback",
    riskLabel: check.riskLabel || check.riskLevel,
    verdict: check.verdict,
  };
}

export async function analyzeScam(
  content: string,
  kind: CheckKind,
  language: UiLanguage,
): Promise<AnalysisResult> {
  if (kind === "phone") {
    const result = await request<{
      success: true;
      phone: string;
      riskScore: number;
      status: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
      reasons: string[];
    }>("/phone/check", jsonBody({ phone: content }));
    const level = result.status === "LOW RISK" ? "safe" : result.status === "SUSPICIOUS" ? "suspicious" : "high";

    return {
      id: `phone-${Date.now()}`,
      kind,
      input: result.phone,
      createdAt: new Date().toISOString(),
      level,
      score: result.riskScore,
      headline: result.status,
      summary: "Automated risk assessment only. This does not guarantee that the number is safe or identify who is calling.",
      reasons: result.reasons,
      signals: result.reasons.map((reason) => ({
        category: "Sender" as const,
        severity: level === "safe" ? ("ok" as const) : level === "suspicious" ? ("warn" as const) : ("critical" as const),
        title: reason,
        explanation: reason,
      })),
      highlights: [],
      actions: [
        "Verify the caller using contact details from an official source.",
        "Do not share an OTP, PIN, password, or banking details over a call.",
        "Ask someone you trust before sending money or acting under pressure.",
      ],
      language,
      analysisMethod: "rule-based-fallback",
      riskLabel: result.status,
    };
  }

  const type = kind === "link" ? kind : "message";
  const result = await request<ServerCheck>(
    "/scam/analyze",
    jsonBody({ type, content, displayType: kind }),
  );
  return fromServerCheck(result, language);
}

export async function analyzeScreenshot(file: File, language: UiLanguage): Promise<ScreenshotAnalysis> {
  const formData = new FormData();
  formData.append("screenshot", file, file.name);
  formData.append("language", language);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/screenshot/analyze`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch {
    throw new ApiError("Cannot reach ScamShield right now. Check your connection and try again.", 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message || "We could not analyze this screenshot.", response.status);
  }
  return payload as ScreenshotAnalysis;
}

export async function getScamHistory(language: UiLanguage): Promise<AnalysisResult[]> {
  const result = await request<{ checks: ServerCheck[] }>("/scam/history");
  return result.checks.map((check) => fromServerCheck(check, language));
}

export async function deleteScamCheck(id: string): Promise<void> {
  await request(`/scam/history/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function clearScamHistory(): Promise<void> {
  await request("/scam/history", { method: "DELETE" });
}
