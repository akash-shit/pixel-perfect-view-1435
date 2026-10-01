import { Link as LinkIcon, Mail, MessageSquare, Phone, QrCode, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";
import type { AnalysisResult, CheckKind } from "@/lib/types";
import { EXAMPLES, SCAN_STAGES } from "@/services/analysis";
import { analyzeScam } from "@/services/api";
import { ResultView } from "./ResultView";

export const KINDS: { kind: CheckKind; label: string; icon: typeof Phone; placeholder: string }[] = [
  { kind: "message", label: "Message", icon: MessageSquare, placeholder: "Paste the SMS, WhatsApp or Telegram message here…" },
  { kind: "link", label: "Link", icon: LinkIcon, placeholder: "Paste the web address, e.g. https://…" },
  { kind: "phone", label: "Phone number", icon: Phone, placeholder: "Enter the number that called you" },
  { kind: "email", label: "Email", icon: Mail, placeholder: "Paste the email, including the sender address" },
  { kind: "qr", label: "QR / UPI", icon: QrCode, placeholder: "Paste the UPI link or the text from the QR code" },
  { kind: "screenshot", label: "Screenshot", icon: ImageIcon, placeholder: "Type the text you see in the screenshot" },
];

export function Checker({ initialKind = "message" }: { initialKind?: CheckKind }) {
  const { settings, addResult } = useApp();
  const lang = settings.language;
  const [kind, setKind] = useState<CheckKind>(initialKind);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => setKind(initialKind), [initialKind]);

  const current = KINDS.find((k) => k.kind === kind)!;
  const scanning = stage >= 0;

  const analyse = () => {
    if (!input.trim()) return;
    setResult(null);
    const fast = settings.reduceMotion;
    const step = fast ? 60 : 420;
    setStage(0);
    SCAN_STAGES.forEach((_, i) => setTimeout(() => setStage(i), i * step));
    setTimeout(async () => {
      try {
        const checked = await analyzeScam(input, kind, settings.language);
        setResult(checked);
        addResult(checked);
      } catch (error) {
        toast.error(t(lang, error instanceof Error ? error.message : "The check could not be completed."));
      } finally {
        setStage(-1);
      }
    }, SCAN_STAGES.length * step);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist">
        {KINDS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === kind}
            onClick={() => {
              setKind(k);
              setResult(null);
              setInput("");
            }}
            className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-extrabold transition-colors ${
              k === kind ? "bg-ink text-paper" : "bg-card text-inksoft ring-1 ring-border hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" /> {t(lang, label)}
          </button>
        ))}
      </div>

      <div className="card-soft relative overflow-hidden p-5 sm:p-6">
        {scanning && <div className="scan-sweep pointer-events-none absolute inset-0" />}
        {kind === "screenshot" && (
          <label className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/50 p-6 text-center font-bold text-inksoft hover:border-brand">
            <ImageIcon className="h-8 w-8 text-brand" />
            {fileName ? t(lang, "Added: {name}", { name: fileName }) : t(lang, "Tap to add a screenshot (stays on your device)")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        )}
        {kind === "phone" || kind === "link" ? (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyse()}
            aria-label={t(lang, current.label)}
            placeholder={t(lang, current.placeholder)}
            className="focus-ring w-full rounded-2xl border-2 border-border bg-paper px-5 py-4 text-xl text-ink outline-none focus:border-brand"
          />
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            aria-label={t(lang, current.label)}
            placeholder={t(lang, current.placeholder)}
            className="focus-ring w-full resize-y rounded-2xl border-2 border-border bg-paper px-5 py-4 text-lg leading-relaxed text-ink outline-none focus:border-brand"
          />
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={analyse}
            disabled={!input.trim() || scanning}
            className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-3.5 text-lg font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {scanning && <Loader2 className="h-5 w-5 animate-spin" />} {t(lang, "Check it")}
          </button>
          <button
            onClick={() => setInput(EXAMPLES[kind])}
            className="focus-ring rounded-2xl bg-brand-soft px-5 py-3.5 font-extrabold text-brand"
          >
            {t(lang, "Try an example")}
          </button>
          <button
            onClick={() => {
              setInput("");
              setResult(null);
            }}
            className="focus-ring rounded-2xl px-5 py-3.5 font-extrabold text-inksoft hover:text-ink"
          >
            {t(lang, "Clear")}
          </button>
        </div>
        <p className="mt-3 text-sm text-inksoft">{t(lang, "Checks are saved to your account. Sensitive details are redacted from saved history.")}</p>
      </div>

      {scanning && (
        <ol className="card-soft space-y-2 p-6" aria-live="polite">
          {SCAN_STAGES.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 text-lg font-bold ${i <= stage ? "text-ink" : "text-inksoft/50"}`}>
              {i < stage ? (
                <Check className="h-5 w-5 text-safe" />
              ) : i === stage ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-border" />
              )}
              {t(lang, s)}
            </li>
          ))}
        </ol>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}
