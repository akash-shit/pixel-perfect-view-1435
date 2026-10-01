import { createFileRoute } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "I think I was scammed — ScamShield" },
      { name: "description", content: "Calm, step-by-step help if you shared an OTP, paid money or clicked a scam link." },
      { property: "og:title", content: "I think I was scammed — ScamShield" },
      { property: "og:description", content: "What to do right now, step by step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Emergency,
});

const STEPS = [
  "Take a breath. Acting in the next hour makes a big difference.",
  "Call your bank on the number printed on your card and ask them to block it.",
  "Call 1930 (national cyber-fraud helpline) and report what happened.",
  "Change your UPI PIN and net-banking password from the official app.",
  "File a complaint at cybercrime.gov.in and keep screenshots of everything.",
  "Tell someone you trust — you are not alone, and this is not your fault.",
];

function Emergency() {
  const { contacts, settings } = useApp();
  const lang = settings.language;
  return (
    <AppShell>
      <PageHeader title="It's okay. Let's fix this together." sub="Follow these steps in order." />
      <a href="tel:1930" className="flex min-h-16 items-center justify-center gap-3 rounded-3xl bg-risk px-4 py-5 text-center text-xl font-extrabold text-primary-foreground shadow-md sm:text-2xl">
        <Phone className="h-7 w-7" /> {t(lang, "Call 1930 now")}
      </a>
      <ol className="card-soft mt-5 space-y-4 p-6">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-4 text-lg text-ink">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground font-extrabold">{i + 1}</span>{t(lang, s)}
          </li>
        ))}
      </ol>
      {contacts.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <a key={c.id} href={`tel:${c.phone.replace(/\s/g, "")}`} className="card-soft flex items-center gap-3 p-5 text-lg font-extrabold text-ink">
              <Phone className="h-6 w-6 text-safe" /> {t(lang, "Call {name}", { name: c.name })}
            </a>
          ))}
        </div>
      )}
    </AppShell>
  );
}
