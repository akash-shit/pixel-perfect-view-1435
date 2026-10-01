import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bell, BookOpen, Trophy } from "lucide-react";
import { AppShell } from "@/components/ss/AppShell";
import { KINDS } from "@/components/ss/Checker";
import { RiskBadge } from "@/components/ss/Risk";
import { ALERTS } from "@/data/content";
import { safetyScore, useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — ScamShield" },
      { name: "description", content: "Your safety score, recent checks and today's scam alerts." },
      { property: "og:title", content: "Home — ScamShield" },
      { property: "og:description", content: "Your personal scam-safety dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { settings, history, quizScore, reports } = useApp();
  const score = safetyScore(history, quizScore, reports.length);
  const elder = settings.mode === "elder";

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold text-ink">{t(settings.language, "greeting")}</h1>
      <p className="mt-2 text-lg text-inksoft">{t(settings.language, "tagline")}</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-ink">Check something now</h2>
          <div className={`mt-5 grid gap-3 ${elder ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {(elder ? KINDS.slice(0, 3) : KINDS).map(({ kind, label, icon: Icon }) => (
              <Link key={kind} to="/check" search={{ kind }} className="focus-ring flex items-center gap-3 rounded-2xl bg-paper p-4 font-extrabold text-ink hover:bg-brand-soft">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-primary-foreground"><Icon className="h-5 w-5" /></span>
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="card-soft flex flex-col justify-between bg-brand p-6 text-primary-foreground">
          <div className="text-sm font-extrabold uppercase tracking-wide opacity-80">Your safety score</div>
          <div className="font-display text-7xl font-semibold">{score}</div>
          <p className="opacity-90">Grows as you check, learn and report. Keep going!</p>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">Recent checks</h2>
            <Link to="/history" className="font-bold text-brand">See all</Link>
          </div>
          {history.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted p-6 text-center text-inksoft">No checks yet. Try one above — it takes seconds.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {history.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center gap-4 py-3">
                  <RiskBadge level={h.level} size="sm" />
                  <span className="flex-1 truncate text-ink">{h.input}</span>
                  <span className="text-sm text-inksoft">{new Date(h.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-soft p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink"><Bell className="h-5 w-5 text-susp" /> Scams going around</h2>
          <ul className="mt-4 space-y-3">
            {ALERTS.slice(0, 3).map((a) => (
              <li key={a.title} className="rounded-2xl bg-paper p-3">
                <div className="font-extrabold text-ink">{a.title}</div>
                <div className="text-sm text-inksoft">{a.stayingSafe}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Link to="/learn" className="card-soft focus-ring flex items-center gap-4 p-6">
          <BookOpen className="h-10 w-10 text-brand" />
          <div className="flex-1"><div className="text-xl font-extrabold text-ink">Learn common scams</div><div className="text-inksoft">Short, simple guides</div></div>
          <ArrowRight className="text-inksoft" />
        </Link>
        <Link to="/quiz" className="card-soft focus-ring flex items-center gap-4 p-6">
          <Trophy className="h-10 w-10 text-susp" />
          <div className="flex-1"><div className="text-xl font-extrabold text-ink">Take the 2-minute quiz</div><div className="text-inksoft">{quizScore !== null ? `Last score: ${quizScore}/5` : "Can you spot the scam?"}</div></div>
          <ArrowRight className="text-inksoft" />
        </Link>
      </div>
    </AppShell>
  );
}
