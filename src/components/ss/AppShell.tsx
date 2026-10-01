import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  History,
  Home,
  LineChart,
  Phone,
  Search,
  Settings,
  Shield,
  Users,
  WifiOff,
  Flag,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

const NAV = [
  { to: "/dashboard", key: "dashboard", icon: Home },
  { to: "/check", key: "check", icon: Search },
  { to: "/history", key: "history", icon: History },
  { to: "/learn", key: "learn", icon: BookOpen },
  { to: "/quiz", key: "quiz", icon: Trophy },
  { to: "/family", key: "family", icon: Users },
  { to: "/report", key: "report", icon: Flag },
  { to: "/alerts", key: "alerts", icon: Bell },
  { to: "/insights", key: "insights", icon: LineChart },
  { to: "/settings", key: "settings", icon: Settings },
] as const;

const MOBILE = ["/dashboard", "/check", "/learn", "/family", "/settings"];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 focus-ring rounded-xl">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-primary-foreground shadow-sm">
        <Shield className="h-5 w-5" strokeWidth={2.6} />
      </span>
      <span className="font-display text-xl font-semibold text-ink">ScamShield</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, online } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const lang = settings.language;

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-border bg-card px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map(({ to, key, icon: Icon }) => {
            const active = path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-bold transition-colors ${
                  active ? "bg-brand-soft text-brand" : "text-inksoft hover:bg-muted hover:text-ink"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t(lang, key)}
              </Link>
            );
          })}
        </nav>
        <Link
          to="/emergency"
          className="focus-ring flex items-center gap-3 rounded-2xl bg-risk-soft px-3 py-3 font-bold text-risk"
        >
          <Phone className="h-5 w-5" /> I think I was scammed
        </Link>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <Link to="/emergency" className="focus-ring rounded-full bg-risk-soft px-3 py-1.5 text-sm font-bold text-risk">
          Help now
        </Link>
      </header>

      <main className="pb-28 lg:pb-12 lg:pl-64">
        {!online && (
          <div className="flex items-center gap-2 bg-susp-soft px-6 py-2 text-sm font-bold text-ink">
            <WifiOff className="h-4 w-4" /> You're offline. Checks still work on this device.
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.to)).map(({ to, key, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-bold ${active ? "text-brand" : "text-inksoft"}`}
            >
              <Icon className="h-6 w-6" />
              {t(lang, key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-lg text-inksoft">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
