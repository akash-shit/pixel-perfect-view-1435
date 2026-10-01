import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Lock, Mail, MessageSquare, Phone, QrCode, Shield, Users, Link as LinkIcon, Image as ImageIcon, HeartHandshake } from "lucide-react";
import { Logo } from "@/components/ss/AppShell";
import { RiskBadge } from "@/components/ss/Risk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScamShield — Check before you click" },
      { name: "description", content: "Not sure if that message is real? ScamShield checks messages, links, calls and QR codes and explains scams in plain language." },
      { property: "og:title", content: "ScamShield — Check before you click" },
      { property: "og:description", content: "Pause. Check. Stay Safe. A simple digital safety companion for every family." },
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
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/learn" className="hidden rounded-xl px-4 py-2 font-bold text-inksoft hover:text-ink sm:block">Learn</Link>
          <Link to="/dashboard" className="focus-ring rounded-2xl bg-ink px-5 py-2.5 font-extrabold text-paper">Open app</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-2 lg:pt-16">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-extrabold text-brand">
            <Shield className="h-4 w-4" /> Pause. Check. Stay Safe.
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
            Not sure if that message is real?
          </h1>
          <p className="mt-5 text-2xl font-bold text-brand">Check before you click.</p>
          <p className="mt-4 max-w-lg text-lg text-inksoft">
            Paste a message, link or number. ScamShield tells you if it's safe — and explains why, in words anyone can understand.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/check" search={{ kind: "message" }} className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-4 text-lg font-extrabold text-primary-foreground shadow-md">
              Check a Message <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/check" search={{ kind: "link" }} className="focus-ring rounded-2xl border-2 border-ink bg-card px-7 py-4 text-lg font-extrabold text-ink">
              Check a Link
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 -z-0 rotate-2 rounded-[2.5rem] bg-brand-soft" />
          <div className="card-soft relative overflow-hidden p-6 shadow-xl">
            <div className="scan-sweep" />
            <div className="text-xs font-extrabold uppercase tracking-wide text-inksoft">New SMS · VK-KBCWIN</div>
            <p className="mt-3 rounded-2xl rounded-tl-sm bg-muted p-4 text-lg text-ink">
              Congratulations! You have <mark className="rounded bg-susp-soft px-1 font-extrabold">won</mark> ₹25,000. Claim{" "}
              <mark className="rounded bg-susp-soft px-1 font-extrabold">today</mark> at bit.ly/claim-25k. Share your{" "}
              <mark className="rounded bg-susp-soft px-1 font-extrabold">OTP</mark> to verify.
            </p>
            <div className="mt-5 rounded-2xl bg-risk-soft/70 p-5">
              <RiskBadge level="high" size="lg" />
              <div className="mt-3 font-display text-2xl font-semibold text-ink">Don't trust this message</div>
              <ul className="mt-2 space-y-1 text-ink">
                <li>• Promises a prize you never entered</li>
                <li>• Asks for your OTP</li>
                <li>• Shortened link hides where it goes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-4xl font-semibold text-ink">What we can check</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {CHECKS.map(({ icon: Icon, label, kind }) => (
              <Link key={kind} to="/check" search={{ kind }} className="focus-ring group rounded-3xl bg-paper p-6 transition-transform hover:-translate-y-1">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-primary-foreground"><Icon className="h-7 w-7" /></span>
                <div className="mt-4 text-xl font-extrabold text-ink">{label}</div>
                <div className="mt-1 font-bold text-brand group-hover:underline">Check now →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-20 md:grid-cols-3">
        {[
          { icon: HeartHandshake, t: "Made for everyone", d: "Elder mode gives huge text, big buttons and simple words." },
          { icon: Users, t: "Family protection", d: "Share a result or ask a trusted person with one tap." },
          { icon: Lock, t: "Private by design", d: "Checks run on your device. We never ask for OTPs or passwords." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="card-soft p-7">
            <Icon className="h-9 w-9 text-brand" />
            <h3 className="mt-4 font-display text-2xl font-semibold text-ink">{t}</h3>
            <p className="mt-2 text-lg text-inksoft">{d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-inksoft">
        ScamShield · Your simple digital safety companion. AI-assisted analysis — always verify important information.
      </footer>
    </div>
  );
}
