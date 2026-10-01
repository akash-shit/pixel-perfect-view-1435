import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Flag, Share2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RISK_META } from "@/lib/risk";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";
import type { AnalysisResult } from "@/lib/types";
import { RiskBadge, ScoreRing } from "./Risk";

function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  if (!phrases.length) return <>{text}</>;
  const esc = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        phrases.some((ph) => ph.toLowerCase() === p.toLowerCase()) ? (
          <mark key={i} className="rounded bg-susp-soft px-1 font-extrabold text-ink">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ResultView({ result }: { result: AnalysisResult }) {
  const { settings } = useApp();
  const lang = settings.language;
  const meta = RISK_META[result.level];
  const m = { ...meta, label: t(lang, meta.label) };
  const share = async () => {
    const text = `${t(lang, "ScamShield check")}: ${m.label} — ${t(lang, result.headline)}\n${t(lang, result.summary)}`;
    try {
      if (navigator.share) await navigator.share({ title: "ScamShield result", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t(lang, "Result copied — paste it to your family."));
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="animate-rise space-y-5">
      <section className={`card-soft flex flex-col gap-6 p-6 sm:flex-row sm:items-center ${m.soft}`}>
        <ScoreRing score={result.score} level={result.level} />
        <div className="flex-1">
          <RiskBadge level={result.level} size="lg" />
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink">{t(lang, result.headline)}</h2>
          <p className="mt-2 text-lg text-ink">{t(lang, result.summary)}</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-soft p-6">
          <h3 className="font-display text-xl font-semibold text-ink">{t(lang, "Why we think so")}</h3>
          <ul className="mt-4 space-y-3">
            {result.reasons.map((r) => (
              <li key={r} className="flex gap-3 text-[17px] text-ink">
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${m.text}`} /> {t(lang, r)}
              </li>
            ))}
          </ul>
        </section>
        <section className="card-soft p-6">
          <h3 className="font-display text-xl font-semibold text-ink">{t(lang, "What to do now")}</h3>
          <ol className="mt-4 space-y-3">
            {result.actions.slice(0, 5).map((a, i) => (
              <li key={a} className="flex gap-3 text-[17px] text-ink">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">
                  {i + 1}
                </span>
                {t(lang, a)}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {result.highlights.length > 0 && (
        <section className="card-soft p-6">
          <h3 className="font-display text-xl font-semibold text-ink">{t(lang, "Warning words we spotted")}</h3>
          <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted p-4 text-[17px] leading-relaxed text-ink">
            <Highlighted text={result.input} phrases={result.highlights.map((h) => h.phrase)} />
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {result.highlights.map((h) => (
              <li key={h.phrase} className="rounded-2xl border border-border p-3 text-sm text-inksoft">
                <span className="font-extrabold text-ink">"{h.phrase}"</span> — {t(lang, h.why)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-soft p-6">
        <h3 className="font-display text-xl font-semibold text-ink">{t(lang, "Every signal we checked")}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.signals.map((s, i) => {
            const Icon = s.severity === "ok" ? CheckCircle2 : s.severity === "warn" ? AlertTriangle : XCircle;
            const c = s.severity === "ok" ? "text-safe" : s.severity === "warn" ? "text-susp" : "text-risk";
            return (
              <div key={i} className="flex gap-3 rounded-2xl border border-border p-4">
                <Icon className={`h-6 w-6 shrink-0 ${c}`} />
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wide text-inksoft">{t(lang, s.category)}</div>
                  <div className="font-extrabold text-ink">{t(lang, s.title)}</div>
                  <p className="mt-1 text-sm text-inksoft">{t(lang, s.explanation)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button onClick={share} className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 font-extrabold text-primary-foreground">
          <Share2 className="h-5 w-5" /> {t(lang, "Share with family")}
        </button>
        <Link to="/family" className="focus-ring inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 font-extrabold text-ink">
          <Users className="h-5 w-5" /> {t(lang, "Ask someone I trust")}
        </Link>
        <Link to="/report" className="focus-ring inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 font-extrabold text-ink">
          <Flag className="h-5 w-5" /> {t(lang, "Report this")}
        </Link>
      </div>
      <p className="text-sm text-inksoft">{t(lang, "Rule-based Risk Score, not a calibrated probability. Verify important information independently.")}</p>
    </div>
  );
}
