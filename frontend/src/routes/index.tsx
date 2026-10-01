import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  Shield,
  Users,
  Link as LinkIcon,
  Image as ImageIcon,
  HeartHandshake,
} from "lucide-react";
import { Logo } from "@/components/ss/AppShell";
import { LanguagePicker } from "@/components/ss/AppShell";
import { RiskBadge } from "@/components/ss/Risk";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScamShield — Check before you click" },
      {
        name: "description",
        content:
          "Not sure if that message is real? ScamShield checks messages, links, calls and QR codes and explains scams in plain language.",
      },
      { property: "og:title", content: "ScamShield — Check before you click" },
      {
        property: "og:description",
        content: "Pause. Check. Stay Safe. A simple digital safety companion for every family.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CHECKS = [
  { icon: MessageSquare, label: "SMS & WhatsApp", kind: "message" },
  { icon: LinkIcon, label: "Website links", kind: "link" },
  { icon: Phone, label: "Phone numbers", kind: "phone" },
  { icon: Mail, label: "Emails", kind: "email" },
  { icon: QrCode, label: "QR & UPI codes", kind: "qr" },
  { icon: ImageIcon, label: "Screenshots", kind: "screenshot" },
] as const;

function Landing() {
  const { settings } = useApp();
  const lang = settings.language;

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Logo />
        <nav className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <LanguagePicker />
          <Link
            to="/learn"
            className="hidden rounded-xl px-4 py-2 font-bold text-inksoft hover:text-ink sm:block"
          >
            {t(lang, "Learn")}
          </Link>
          <Link
            to="/login"
            className="focus-ring rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-sm font-extrabold text-ink sm:px-5 sm:text-base"
          >
            {t(lang, "Login")}
          </Link>
          <Link
            to="/dashboard"
            className="focus-ring rounded-2xl bg-ink px-3 py-2.5 text-sm font-extrabold text-paper sm:px-5 sm:text-base"
          >
            {t(lang, "Open app")}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-2 lg:pt-16">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-extrabold text-brand">
            <Shield className="h-4 w-4" /> {t(lang, "Pause. Check. Stay Safe.")}
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
            {t(lang, "Not sure if that message is real?")}
          </h1>
          <p className="mt-5 text-2xl font-bold text-brand">{t(lang, "Check before you click.")}</p>
          <p className="mt-4 max-w-lg text-lg text-inksoft">
            {t(
              lang,
              "Paste a message, link or number. ScamShield tells you if it's safe — and explains why, in words anyone can understand.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/check"
              search={{ kind: "message" }}
              className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-4 text-lg font-extrabold text-primary-foreground shadow-md"
            >
              {t(lang, "Check a Message")} <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/check"
              search={{ kind: "link" }}
              className="focus-ring rounded-2xl border-2 border-ink bg-card px-7 py-4 text-lg font-extrabold text-ink"
            >
              {t(lang, "Check a Link")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-y-4 inset-x-2 z-0 rotate-2 rounded-[2.5rem] bg-brand-soft" />
          <div className="card-soft relative overflow-hidden p-6 shadow-xl">
            <div className="scan-sweep" />
            <div className="text-xs font-extrabold uppercase tracking-wide text-inksoft">
              {t(lang, "New SMS · VK-KBCWIN")}
            </div>
            <p className="mt-3 rounded-2xl rounded-tl-sm bg-muted p-4 text-lg text-ink">
              {t(lang, "Congratulations! You have ")}
              <mark className="rounded bg-susp-soft px-1 font-extrabold">
                {t(lang, "won")}
              </mark>{" "}
              {t(lang, "₹25,000. Claim ")}
              <mark className="rounded bg-susp-soft px-1 font-extrabold">
                {t(lang, "today")}
              </mark>{" "}
              {t(lang, "at bit.ly/claim-25k. Share your ")}
              <mark className="rounded bg-susp-soft px-1 font-extrabold">OTP</mark>{" "}
              {t(lang, "to verify.")}
            </p>
            <div className="mt-5 rounded-2xl bg-risk-soft/70 p-5">
              <RiskBadge level="high" size="lg" />
              <div className="mt-3 font-display text-2xl font-semibold text-ink">
                {t(lang, "Don't trust this message")}
              </div>
              <ul className="mt-2 space-y-1 text-ink">
                <li>• {t(lang, "Promises a prize you never entered")}</li>
                <li>• {t(lang, "Asks for your OTP")}</li>
                <li>• {t(lang, "Shortened link hides where it goes")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-4xl font-semibold text-ink">
            {t(lang, "What we can check")}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {CHECKS.map(({ icon: Icon, label, kind }) => (
              <Link
                key={kind}
                to="/check"
                search={{ kind }}
                className="focus-ring group rounded-3xl bg-paper p-6 transition-transform hover:-translate-y-1"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-primary-foreground">
                  <Icon className="h-7 w-7" />
                </span>
                <div className="mt-4 text-xl font-extrabold text-ink">{t(lang, label)}</div>
                <div className="mt-1 font-bold text-brand group-hover:underline">
                  {t(lang, "Check now →")}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-20 md:grid-cols-3">
        {[
          {
            icon: HeartHandshake,
            title: "Made for everyone",
            description: "Elder mode gives huge text, big buttons and simple words.",
          },
          {
            icon: Users,
            title: "Family protection",
            description: "Share a result or ask a trusted person with one tap.",
          },
          {
            icon: Lock,
            title: "Private by design",
            description:
              "Your saved checks stay with your account. We never ask for your OTPs or passwords.",
          },
        ].map(({ icon: Icon, title, description }) => (
          <div key={title} className="card-soft p-7">
            <Icon className="h-9 w-9 text-brand" />
            <h3 className="mt-4 font-display text-2xl font-semibold text-ink">{t(lang, title)}</h3>
            <p className="mt-2 text-lg text-inksoft">{t(lang, description)}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-inksoft">
        {t(
          lang,
          "ScamShield · Your simple digital safety companion. Rule-based checks are a guide, not proof. Verify important information independently.",
        )}
      </footer>
    </div>
  );
}
