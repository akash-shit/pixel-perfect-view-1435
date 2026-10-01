import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { RiskBadge } from "@/components/ss/Risk";
import { ALERTS } from "@/data/content";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Scam alerts — ScamShield" },
      { name: "description", content: "Scams going around right now and how to stay safe from each one." },
      { property: "og:title", content: "Scam alerts — ScamShield" },
      { property: "og:description", content: "Current scam waves explained simply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  return (
    <AppShell>
      <PageHeader title="Scams going around" sub="Sample alerts for this demo. Stay one step ahead." />
      <div className="grid gap-5 md:grid-cols-2">
        {ALERTS.map((a) => (
          <article key={a.title} className="card-soft p-6">
            <RiskBadge level={a.level} size="sm" />
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink">{a.title}</h2>
            <p className="mt-2 text-lg text-inksoft">{a.description}</p>
            <p className="mt-4 rounded-2xl bg-safe-soft/60 p-4 font-bold text-ink">✓ {a.stayingSafe}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
