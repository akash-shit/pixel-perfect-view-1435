import { useEffect, useRef, useState } from "react";
import { Check, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { useApp } from "@/lib/app-state";
import type { AnalysisResult, ScreenshotAnalysis, SignalCategory } from "@/lib/types";
import { analyzeScreenshot } from "@/services/api";
import { ResultView } from "./ResultView";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const ANALYSIS_STAGES = [
  "Reading screenshot",
  "Extracting text",
  "Detecting links and phone numbers",
  "Checking scam indicators",
  "Generating risk assessment",
];

function toHistoryResult(analysis: ScreenshotAnalysis, language: AnalysisResult["language"]): AnalysisResult {
  const level = analysis.riskLevel === "LOW RISK" ? "safe" : analysis.riskLevel === "SUSPICIOUS" ? "suspicious" : "high";
  const reasons = analysis.indicators.map((indicator) => indicator.description);
  return {
    id: analysis.id,
    kind: "screenshot",
    input: analysis.extracted.text,
    createdAt: analysis.createdAt,
    level,
    score: analysis.riskScore,
    headline: analysis.riskLevel,
    summary: analysis.summary,
    reasons: reasons.length ? reasons : ["No clear scam indicators were detected. This does not prove the message is safe."],
    signals: analysis.indicators.map((indicator) => ({
      category: (indicator.type.includes("url") ? "URL" : indicator.type.includes("request") ? "Request" : "Language") as SignalCategory,
      severity: indicator.severity === "high" ? "critical" : indicator.severity === "medium" ? "warn" : "ok",
      title: indicator.type.replaceAll("_", " "),
      explanation: indicator.description,
    })),
    highlights: [],
    actions: analysis.recommendations,
    language,
    analysisMethod: analysis.analysisMethod,
    riskLabel: analysis.riskLevel,
    confidence: analysis.confidence,
    extracted: analysis.extracted,
    disclaimer: analysis.disclaimer,
  };
}

export function ScreenshotChecker() {
  const { settings, addResult } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScreenshotAnalysis | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!analyzing) return;
    const interval = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, ANALYSIS_STAGES.length - 1));
    }, settings.reduceMotion ? 1800 : 1200);
    return () => window.clearInterval(interval);
  }, [analyzing, settings.reduceMotion]);

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = candidate.type || IMAGE_TYPES[extension];
    if (!mimeType || !Object.values(IMAGE_TYPES).includes(mimeType)) {
      setError("Choose a PNG, JPG, JPEG, or WEBP image.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("This image is larger than 10 MB. Please choose a smaller screenshot.");
      return;
    }
    const normalizedFile = candidate.type ? candidate : new File([candidate], candidate.name, { type: mimeType });
    setFile(normalizedFile);
    setResult(null);
    setError("");
  }

  async function analyze() {
    if (!file || analyzing) return;
    setAnalyzing(true);
    setStage(0);
    setError("");
    setResult(null);
    try {
      const analysis = await analyzeScreenshot(file, settings.language);
      setResult(analysis);
      addResult(toHistoryResult(analysis, settings.language));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not analyze this screenshot.");
    } finally {
      setAnalyzing(false);
    }
  }

  function removeFile() {
    setFile(null);
    setResult(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  const filePicker = (
    <input
      ref={fileInput}
      type="file"
      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
      className="sr-only"
      onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
      aria-label="Upload screenshot"
    />
  );

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      {!file ? (
        <>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseFile(event.dataTransfer.files[0]);
            }}
            className={`focus-ring flex min-h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:min-h-80 ${dragging ? "border-brand bg-brand-soft" : "border-border bg-card hover:border-brand hover:bg-brand-soft/40"}`}
          >
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand">
              <Upload className="h-9 w-9" aria-hidden="true" />
            </span>
            <span className="mt-5 font-display text-2xl font-semibold text-ink">Upload Screenshot</span>
            <span className="mt-2 text-lg text-inksoft">Drop your screenshot here or click to upload</span>
            <span className="mt-5 text-base font-bold text-inksoft">PNG, JPG, JPEG, or WEBP · Maximum 10 MB</span>
          </button>
          {filePicker}
        </>
      ) : (
        <section className="card-soft space-y-5 p-4 sm:p-6" aria-label="Screenshot preview">
          <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl bg-muted p-2 sm:min-h-80">
            {previewUrl && <img src={previewUrl} alt="Screenshot preview" className="max-h-128 max-w-full object-contain" />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0 break-all text-sm font-semibold text-inksoft">{file.name}</span>
            <div className="ml-auto flex items-center gap-3">
              <button type="button" onClick={removeFile} disabled={analyzing} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-inksoft hover:bg-muted hover:text-ink disabled:opacity-50">
                <X className="h-4 w-4" /> Remove
              </button>
              {!result && (
                <button type="button" onClick={analyze} disabled={analyzing} className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-6 py-3 text-lg font-extrabold text-primary-foreground disabled:opacity-60">
                  {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  Analyze Screenshot
                </button>
              )}
            </div>
          </div>
          {filePicker}
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-risk/30 bg-risk-soft px-5 py-4 text-lg font-bold text-risk">
          {error}
        </p>
      )}

      {analyzing && (
        <section className="card-soft space-y-5 p-6" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-3 text-xl font-extrabold text-ink">
            <Loader2 className="h-6 w-6 animate-spin text-brand" /> Analyzing your screenshot…
          </div>
          <ol className="space-y-3">
            {ANALYSIS_STAGES.map((label, index) => (
              <li key={label} className={`flex items-center gap-3 text-lg font-bold ${index <= stage ? "text-ink" : "text-inksoft/50"}`}>
                {index < stage ? <Check className="h-5 w-5 text-safe" /> : index === stage ? <Loader2 className="h-5 w-5 animate-spin text-brand" /> : <span className="h-5 w-5 rounded-full border-2 border-border" />}
                {label}
              </li>
            ))}
          </ol>
        </section>
      )}

      {result && <ScreenshotResult result={result} />}
    </div>
  );
}

function ScreenshotResult({ result }: { result: ScreenshotAnalysis }) {
  const { settings } = useApp();
  return <ResultView result={toHistoryResult(result, settings.language)} />;
}
