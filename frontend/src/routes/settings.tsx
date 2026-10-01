import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-state";
import { LANGUAGES, t } from "@/lib/i18n";
import type { AppMode } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ScamShield" },
      {
        name: "description",
        content: "Elder mode, larger text, high contrast, language and privacy settings.",
      },
      { property: "og:title", content: "Settings — ScamShield" },
      { property: "og:description", content: "Make ScamShield comfortable to use." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const MODES: { id: AppMode; title: string; desc: string }[] = [
  { id: "personal", title: "Personal", desc: "The full app with every tool." },
  { id: "elder", title: "Elder", desc: "Very large text, fewer choices, high contrast." },
  { id: "family", title: "Family", desc: "Focus on protecting the people you look after." },
];

function SettingsPage() {
  const { settings, setSettings, clearHistory } = useApp();
  const lang = settings.language;
  const clearSavedHistory = async () => {
    try {
      await clearHistory();
      toast.success(t(lang, "Check history cleared"));
    } catch (error) {
      toast.error(
        t(lang, error instanceof Error ? error.message : "History could not be cleared."),
      );
    }
  };
  const toggles = [
    ["largeText", "Larger text", "Makes all words bigger."],
    ["highContrast", "High contrast", "Stronger colours and borders."],
    ["reduceMotion", "Reduce motion", "Turns off moving animations."],
    ["voice", "Read results aloud", "Coming soon in this demo."],
  ] as const;

  return (
    <AppShell>
      <PageHeader title="settings" />
      <section className="card-soft p-6">
        <h2 className="font-display text-xl font-semibold text-ink">{t(lang, "Mode")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setSettings({ mode: m.id })}
              className={`focus-ring rounded-2xl p-5 text-left ring-2 ${settings.mode === m.id ? "bg-brand-soft ring-brand" : "bg-paper ring-border"}`}
            >
              <div className="text-lg font-extrabold text-ink">{t(lang, m.title)}</div>
              <div className="text-inksoft">{t(lang, m.desc)}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="card-soft mt-5 divide-y divide-border p-2">
        {toggles.map(([k, label, desc]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between gap-4 p-4">
            <span>
              <span className="block text-lg font-extrabold text-ink">{t(lang, label)}</span>
              <span className="text-inksoft">{t(lang, desc)}</span>
            </span>
            <Switch checked={settings[k]} onCheckedChange={(v) => setSettings({ [k]: v })} />
          </label>
        ))}
      </section>
      <section className="card-soft mt-5 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          {t(lang, "Change Language")}
        </h2>
        <p className="mt-2 text-inksoft">
          {t(lang, "This changes the language across ScamShield.")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              aria-pressed={settings.language === l.code}
              onClick={() => setSettings({ language: l.code })}
              className={`focus-ring rounded-full px-5 py-2.5 font-extrabold ${settings.language === l.code ? "bg-ink text-paper" : "bg-paper text-inksoft ring-1 ring-border"}`}
            >
              {t(lang, l.label)}
            </button>
          ))}
        </div>
      </section>
      <section className="card-soft mt-5 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">{t(lang, "Privacy")}</h2>
        <p className="mt-2 text-inksoft">
          {t(
            lang,
            "Your checks are saved to your account. Common secret formats are redacted from saved history. Never share your OTP, PIN or password.",
          )}
        </p>
        <button
          onClick={() => void clearSavedHistory()}
          className="mt-4 rounded-2xl bg-risk-soft px-5 py-3 font-extrabold text-risk"
        >
          {t(lang, "Delete my check history")}
        </button>
      </section>
    </AppShell>
  );
}
