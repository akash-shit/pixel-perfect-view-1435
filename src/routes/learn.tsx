import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { SCAM_GUIDES } from "@/data/content";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn common scams — ScamShield" },
      { name: "description", content: "Simple guides to KYC, UPI, lottery, delivery, job and deepfake scams — and what to do." },
      { property: "og:title", content: "Learn common scams — ScamShield" },
      { property: "og:description", content: "Plain-language guides to the scams going around." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Learn,
});

function Learn() {
  const [open, setOpen] = useState<string>(SCAM_GUIDES[0]?.slug ?? "");
  const g = SCAM_GUIDES.find((x) => x.slug === open);
  return (
    <AppShell>
      <PageHeader title="Learn the tricks" sub="Once you know how a scam works, it stops working on you." />
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <ul className="flex gap-2 overflow-x-auto lg:flex-col">
          {SCAM_GUIDES.map((s) => (
            <li key={s.slug}>
              <button onClick={() => setOpen(s.slug)} className={`focus-ring flex w-full items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-left font-extrabold ${open === s.slug ? "bg-brand text-primary-foreground" : "bg-card text-ink"}`}>
                <span className="text-2xl">{s.emoji}</span> {s.title}
              </button>
            </li>
          ))}
        </ul>
        {g && (
          <article key={g.slug} className="card-soft animate-rise p-7">
            <div className="text-5xl">{g.emoji}</div>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink">{g.title}</h2>
            <p className="mt-3 text-lg text-ink"><b>What it looks like:</b> {g.looksLike}</p>
            <p className="mt-2 text-lg text-inksoft"><b className="text-ink">Why it works:</b> {g.whyItWorks}</p>
            <blockquote className="mt-5 rounded-2xl rounded-tl-sm bg-muted p-4 text-ink">"{g.example}"</blockquote>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-susp-soft/60 p-5">
                <h3 className="font-extrabold text-ink">Warning signs</h3>
                <ul className="mt-2 space-y-1 text-ink">{g.warningSigns.map((w) => <li key={w}>⚠ {w}</li>)}</ul>
              </div>
              <div className="rounded-2xl bg-safe-soft/60 p-5">
                <h3 className="font-extrabold text-ink">What to do</h3>
                <ul className="mt-2 space-y-1 text-ink">{g.whatToDo.map((w) => <li key={w}>✓ {w}</li>)}</ul>
              </div>
            </div>
          </article>
        )}
      </div>
    </AppShell>
  );
}
