import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { CATEGORY_SPREAD, WEEKLY_CHECKS } from "@/data/content";
import { useApp } from "@/lib/app-state";
import { formatNumber, t } from "@/lib/i18n";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — ScamShield" },
      { name: "description", content: "See how many scams you've caught and which types are most common." },
      { property: "og:title", content: "Insights — ScamShield" },
      { property: "og:description", content: "Your scam-checking activity at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Insights,
});

const COLORS = ["var(--brand)", "var(--susp)", "var(--risk)", "var(--safe)", "var(--inksoft)"];

function Insights() {
  const { history, settings } = useApp();
  const lang = settings.language;
  const counts = { safe: 0, suspicious: 0, high: 0 } as Record<string, number>;
  history.forEach((h) => { if (h.level in counts) counts[h.level]!++; });

  return (
    <AppShell>
      <PageHeader title="insights" sub="Charts use sample community data for this demo, plus your own checks." />
      <div className="mb-5 grid grid-cols-3 gap-4">
        {[["Safe", counts["safe"], "text-safe"], ["Suspicious", counts["suspicious"], "text-susp"], ["High risk", counts["high"], "text-risk"]].map(([label, value, color]) => (
          <div key={label as string} className="card-soft p-5"><div className={`font-display text-4xl font-semibold ${color}`}>{formatNumber(Number(value), lang)}</div><div className="font-bold text-inksoft">{t(lang, String(label))}</div></div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-soft p-6">
          <h2 className="font-display text-xl font-semibold text-ink">{t(lang, "Checks this week")}</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={WEEKLY_CHECKS}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(day: string) => t(lang, day)} stroke="var(--inksoft)" />
                <YAxis stroke="var(--inksoft)" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="checks" name={t(lang, "Checks")} fill="var(--brand)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="flagged" name={t(lang, "Flagged")} fill="var(--risk)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card-soft p-6">
          <h2 className="font-display text-xl font-semibold text-ink">{t(lang, "Most common scam types")}</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={CATEGORY_SPREAD.map((item) => ({ ...item, translatedName: t(lang, item.name) }))} dataKey="value" nameKey="translatedName" innerRadius={55} outerRadius={95} paddingAngle={3} label>
                  {CATEGORY_SPREAD.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
