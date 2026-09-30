export type RiskLevel = "safe" | "suspicious" | "high" | "unknown";

export type CheckKind = "message" | "link" | "phone" | "qr" | "email" | "screenshot";

export type SignalCategory =
  | "Sender"
  | "Language"
  | "URL"
  | "Request"
  | "Context"
  | "Behavior";

export type SignalSeverity = "ok" | "warn" | "critical";

export interface Signal {
  category: SignalCategory;
  severity: SignalSeverity;
  title: string;
  explanation: string;
}

export interface Highlight {
  phrase: string;
  why: string;
}

export interface AnalysisResult {
  id: string;
  kind: CheckKind;
  input: string;
  createdAt: string;
  level: RiskLevel;
  score: number;
  headline: string;
  summary: string;
  reasons: string[];
  signals: Signal[];
  highlights: Highlight[];
  actions: string[];
  language: "en" | "hi" | "bn";
}

export type AppMode = "personal" | "elder" | "family";
export type UiLanguage = "en" | "hi" | "bn";

export interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  canBeAsked: boolean;
}

export interface ScamReport {
  id: string;
  type: string;
  category: string;
  description: string;
  date: string;
}
