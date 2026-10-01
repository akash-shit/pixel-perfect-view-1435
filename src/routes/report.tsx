import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a scam — ScamShield" },
      { name: "description", content: "Tell us about a scam message, call or link so others are warned." },
      { property: "og:title", content: "Report a scam — ScamShield" },
      { property: "og:description", content: "Help warn others about scams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Report,
});

const TYPES = ["SMS", "WhatsApp", "Call", "Email", "Website", "QR / UPI"];
const CATS = ["KYC", "UPI refund", "Lottery", "Delivery", "Job offer", "Fake support", "Investment", "Other"];

function Report() {
  const { reports, addReport } = useApp();
  const [type, setType] = useState(TYPES[0]!);
  const [category, setCategory] = useState(CATS[0]!);
  const [description, setDescription] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    const r = addReport({ type, category, description: description.trim(), date: new Date().toISOString() });
    setDescription("");
    toast.success(`Thank you. Report ${r.id} saved.`);
  };

  const chip = (on: boolean) => `rounded-full px-4 py-2 font-extrabold ${on ? "bg-ink text-paper" : "bg-paper text-inksoft ring-1 ring-border"}`;

  return (
    <AppShell>
      <PageHeader title="Report a scam" sub="Your report helps warn others. For money lost in India, also call 1930 or visit cybercrime.gov.in." />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="card-soft space-y-5 p-6">
          <div><div className="mb-2 font-extrabold text-ink">How did it reach you?</div><div className="flex flex-wrap gap-2">{TYPES.map((t) => <button type="button" key={t} onClick={() => setType(t)} className={chip(t === type)}>{t}</button>)}</div></div>
          <div><div className="mb-2 font-extrabold text-ink">What kind of scam?</div><div className="flex flex-wrap gap-2">{CATS.map((t) => <button type="button" key={t} onClick={() => setCategory(t)} className={chip(t === category)}>{t}</button>)}</div></div>
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened? Paste the message or describe the call. Don't include your own OTP or passwords." className="focus-ring w-full rounded-2xl border-2 border-border bg-paper p-4 text-lg text-ink outline-none focus:border-brand" />
          <button className="rounded-2xl bg-brand px-7 py-3.5 text-lg font-extrabold text-primary-foreground">Send report</button>
        </form>
        <section className="card-soft p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Your reports</h2>
          {reports.length === 0 ? <p className="mt-3 text-inksoft">None yet.</p> : (
            <ul className="mt-3 space-y-3">{reports.map((r) => (
              <li key={r.id} className="rounded-2xl bg-paper p-3"><div className="text-xs font-extrabold text-inksoft">{r.id} · {r.type} · {r.category}</div><div className="line-clamp-2 text-ink">{r.description}</div></li>
            ))}</ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
