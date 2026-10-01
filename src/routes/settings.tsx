import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n";
import type { AppMode } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ScamShield" },
      { name: "description", content: "Elder mode, larger text, high contrast, language and privacy settings." },
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
  const toggles = [
    ["largeText", "Larger text", "Makes all words bigger."],
    ["highContrast", "High contrast", "Stronger colours and borders."],
    ["reduceMotion", "Reduce motion", "Turns off moving animations."],
    ["voice", "Read results aloud", "Coming soon in this demo."],
  ] as const;

  return (
    <AppShell>
      <PageHeader title="Settings" />
      <section className="card-soft p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Mode</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setSettings({ mode: m.id })} className={`focus-ring rounded-2xl p-5 text-left ring-2 ${settings.mode === m.id ? "bg-brand-soft ring-brand" : "bg-paper ring-border"}`}>
              <div className="text-lg font-extrabold text-ink">{m.title}</div>
              <div className="text-inksoft">{m.desc}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="card-soft mt-5 divide-y divide-border p-2">
        {toggles.map(([k, label, desc]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between gap-4 p-4">
            <span><span className="block text-lg font-extrabold text-ink">{label}</span><span className="text-inksoft">{desc}</span></span>
            <Switch checked={settings[k]} onCheckedChange={(v) => setSettings({ [k]: v })} />
          </label>
        ))}
      </section>
      <section className="card-soft mt-5 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Language</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button key={l.code} onClick={() => setSettings({ language: l.code })} className={`rounded-full px-5 py-2.5 font-extrabold ${settings.language === l.code ? "bg-ink text-paper" : "bg-paper text-inksoft ring-1 ring-border"}`}>{l.label}</button>
          ))}
        </div>
      </section>
      <section className="card-soft mt-5 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Privacy</h2>
        <p className="mt-2 text-inksoft">Everything you check stays on this device. ScamShield will never ask for your OTP, PIN or password.</p>
        <button onClick={clearHistory} className="mt-4 rounded-2xl bg-risk-soft px-5 py-3 font-extrabold text-risk">Delete my check history</button>
      </section>
    </AppShell>
  );
}
