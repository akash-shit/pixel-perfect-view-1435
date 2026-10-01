import type {
  AnalysisResult,
  CheckKind,
  SignalCategory,
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
  type: "message" | "link" | "phone";
  displayType?: CheckKind;
  input: string;
  riskScore: number;
  riskLevel: "low" | "suspicious" | "high" | "very_high";
  reasons: string[];
  recommendedActions: string[];
  matchedSignals: string[];
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
  const signals = check.matchedSignals.map((matchedSignal) => {
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
  if (signals.length === 0) {
    signals.push({
      category: "Context",
      severity: "ok",
      title: "No configured warning signals matched",
      explanation:
        "This rule-based check found no strong warning signs. It cannot prove a message is safe.",
    });
  }

  const headline =
    check.riskLevel === "very_high"
      ? "Several strong warning signs found"
      : check.riskLevel === "high"
        ? "High risk warning signs found"
        : check.riskLevel === "suspicious"
          ? "Some warning signs found"
          : "No strong warning signs found";

  return {
    id: check.id,
    kind: check.displayType || check.type,
    input: check.input,
    createdAt: check.createdAt,
    level,
    score: check.riskScore,
    headline,
    summary:
      "This Risk Score comes from configurable rules. It is not a scientifically calibrated probability; verify important information independently.",
    reasons: check.reasons,
    signals,
    highlights: [],
    actions: check.recommendedActions,
    language,
  };
}

export async function analyzeScam(
  content: string,
  kind: CheckKind,
  language: UiLanguage,
): Promise<AnalysisResult> {
  const type = kind === "link" || kind === "phone" ? kind : "message";
  const result = await request<ServerCheck>(
    "/scam/analyze",
    jsonBody({ type, content, displayType: kind }),
  );
  return fromServerCheck(result, language);
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
