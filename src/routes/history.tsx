import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { ResultView } from "@/components/ss/ResultView";
import { RiskBadge } from "@/components/ss/Risk";
import { useApp } from "@/lib/app-state";
import type { RiskLevel } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Your check history — ScamShield" },
      { name: "description", content: "Every message, link and number you checked, saved privately on this device." },
      { property: "og:title", content: "Check history — ScamShield" },
      { property: "og:description", content: "Review past scam checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { history, removeResult, clearHistory } = useApp();
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const list = filter === "all" ? history : history.filter((h) => h.level === filter);
  const opened = history.find((h) => h.id === open);

  return (
    <AppShell>
      <PageHeader title="History" sub="Saved only on this device.">
        {history.length > 0 && (
          <button onClick={clearHistory} className="focus-ring rounded-2xl px-4 py-2 font-bold text-risk hover:bg-risk-soft">Clear all</button>
        )}
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "safe", "suspicious", "high"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-2 font-extrabold capitalize ${filter === f ? "bg-ink text-paper" : "bg-card text-inksoft ring-1 ring-border"}`}>
            {f === "high" ? "High risk" : f}
          </button>
        ))}
      </div>
      {opened ? (
        <div>
          <button onClick={() => setOpen(null)} className="mb-4 font-bold text-brand">← Back to list</button>
          <ResultView result={opened} />
        </div>
      ) : list.length === 0 ? (
        <p className="card-soft p-10 text-center text-lg text-inksoft">Nothing here yet.</p>
      ) : (
        <ul className="card-soft divide-y divide-border">
          {list.map((h) => (
            <li key={h.id} className="flex items-center gap-4 p-4">
              <RiskBadge level={h.level} size="sm" />
              <button onClick={() => setOpen(h.id)} className="flex-1 truncate text-left text-ink hover:text-brand">
                <span className="mr-2 text-xs font-extrabold uppercase text-inksoft">{h.kind}</span>
                {h.input}
              </button>
              <span className="hidden text-sm text-inksoft sm:block">{new Date(h.createdAt).toLocaleString()}</span>
              <button aria-label="Delete" onClick={() => removeResult(h.id)} className="rounded-xl p-2 text-inksoft hover:text-risk"><Trash2 className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
