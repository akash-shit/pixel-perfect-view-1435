import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { ResultView } from "@/components/ss/ResultView";
import { RiskBadge } from "@/components/ss/Risk";
import { useApp } from "@/lib/app-state";
import { formatDate, t } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Your check history — ScamShield" },
      {
        name: "description",
        content: "Every message, link and number you checked, saved privately on this device.",
      },
      { property: "og:title", content: "Check history — ScamShield" },
      { property: "og:description", content: "Review past scam checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { history, removeResult, clearHistory, dataLoading, dataError, settings } = useApp();
  const lang = settings.language;
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const list = filter === "all" ? history : history.filter((h) => h.level === filter);
  const opened = history.find((h) => h.id === open);

  async function remove(id: string) {
    try {
      await removeResult(id);
      setOpen(null);
    } catch (error) {
      toast.error(
        t(lang, error instanceof Error ? error.message : "The check could not be removed."),
      );
    }
  }

  async function clear() {
    try {
      await clearHistory();
      setOpen(null);
      toast.success(t(lang, "Check history cleared"));
    } catch (error) {
      toast.error(
        t(lang, error instanceof Error ? error.message : "History could not be cleared."),
      );
    }
  }

  return (
    <AppShell>
      <PageHeader title="history" sub="Your saved safety checks.">
        {history.length > 0 && (
          <button
            onClick={() => void clear()}
            className="focus-ring rounded-2xl px-4 py-2 font-bold text-risk hover:bg-risk-soft"
          >
            {t(lang, "Clear all")}
          </button>
        )}
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "safe", "suspicious", "high"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 font-extrabold capitalize ${filter === f ? "bg-ink text-paper" : "bg-card text-inksoft ring-1 ring-border"}`}
          >
            {t(
              lang,
              f === "all"
                ? "all"
                : f === "high"
                  ? "High risk"
                  : f === "safe"
                    ? "Safe"
                    : "Suspicious",
            )}
          </button>
        ))}
      </div>
      {dataLoading ? (
        <p className="card-soft p-10 text-center text-lg text-inksoft">
          {t(lang, "Loading your saved checks…")}
        </p>
      ) : dataError ? (
        <p role="alert" className="card-soft p-10 text-center text-lg font-bold text-risk">
          {t(lang, dataError)}
        </p>
      ) : opened ? (
        <div>
          <button onClick={() => setOpen(null)} className="mb-4 font-bold text-brand">
            ← Back to list
          </button>
          <ResultView result={opened} />
        </div>
      ) : list.length === 0 ? (
        <p className="card-soft p-10 text-center text-lg text-inksoft">
          {t(lang, "Nothing here yet.")}
        </p>
      ) : (
        <ul className="card-soft divide-y divide-border">
          {list.map((h) => (
            <li key={h.id} className="flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <RiskBadge level={h.level} size="sm" />
              <button
                onClick={() => setOpen(h.id)}
                className="min-w-0 flex-1 truncate text-left text-ink hover:text-brand"
              >
                <span className="mr-2 text-xs font-extrabold uppercase text-inksoft">
                  {t(lang, h.kind)}
                </span>
                {h.input}
              </button>
              <span className="hidden text-sm text-inksoft sm:block">
                {formatDate(h.createdAt, lang, { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <button
                aria-label={t(lang, "Delete")}
                title={t(lang, "Delete")}
                onClick={() => void remove(h.id)}
                className="focus-ring rounded-xl p-2 text-inksoft hover:text-risk"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
