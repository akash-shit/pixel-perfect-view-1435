import type { RiskLevel } from "./types";

export const RISK_META: Record<
  RiskLevel,
  { label: string; badge: string; soft: string; text: string; solid: string; glyph: string }
> = {
  safe: {
    label: "Safe",
    badge: "bg-safe text-white",
    soft: "bg-safe-soft/60",
    text: "text-safe",
    solid: "bg-safe",
    glyph: "✓",
  },
  suspicious: {
    label: "Suspicious",
    badge: "bg-susp text-white",
    soft: "bg-susp-soft/60",
    text: "text-susp",
    solid: "bg-susp",
    glyph: "!",
  },
  high: {
    label: "High Risk",
    badge: "bg-risk text-white",
    soft: "bg-risk-soft/70",
    text: "text-risk",
    solid: "bg-risk",
    glyph: "✕",
  },
  unknown: {
    label: "Unknown",
    badge: "bg-inksoft text-white",
    soft: "bg-muted",
    text: "text-inksoft",
    solid: "bg-inksoft",
    glyph: "?",
  },
};

export function levelFromScore(score: number): RiskLevel {
  if (score >= 65) return "high";
  if (score >= 35) return "suspicious";
  return "safe";
}
