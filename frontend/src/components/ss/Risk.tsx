import { RISK_META } from "@/lib/risk";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/types";

export function RiskBadge({ level, size = "md" }: { level: RiskLevel; size?: "sm" | "md" | "lg" }) {
  const { settings } = useApp();
  const m = RISK_META[level];
  const s = size === "lg" ? "px-4 py-2 text-base" : size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-extrabold ${m.badge} ${s}`}>
      <span aria-hidden>{m.glyph}</span>
      {t(settings.language, m.label)}
    </span>
  );
}

export function ScoreRing({ score, level, size = 132 }: { score: number; level: RiskLevel; size?: number }) {
  const { settings } = useApp();
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const color =
    level === "high" ? "var(--risk)" : level === "suspicious" ? "var(--susp)" : level === "safe" ? "var(--safe)" : "var(--inksoft)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={12} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-semibold text-ink">{score}</div>
        <div className="text-xs font-bold text-inksoft">{t(settings.language, "risk / 100")}</div>
      </div>
    </div>
  );
}
