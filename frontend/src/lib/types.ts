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
  analysisMethod?: "ai" | "rule-based-fallback";
  riskLabel?: string;
  verdict?: string;
  confidence?: number;
  extracted?: ScreenshotAnalysis["extracted"];
  disclaimer?: string;
}

export interface ScreenshotAnalysis {
  id: string;
  createdAt: string;
  riskScore: number;
  riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
  confidence: number;
  summary: string;
  extracted: {
    text: string;
    urls: string[];
    phoneNumbers: string[];
    emails: string[];
    upiIds: string[];
  };
  indicators: Array<{ type: string; severity: "low" | "medium" | "high"; description: string }>;
  recommendations: string[];
  disclaimer: string;
  analysisMethod: "ai" | "rule-based-fallback";
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
