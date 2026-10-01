import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Ellipsis,
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
  LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { LANGUAGES, t } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

export function LanguagePicker() {
  const { settings, setSettings } = useApp();
  const lang = settings.language;

  return (
    <select
      aria-label={t(lang, "Change Language")}
      title={t(lang, "Change Language")}
      value={lang}
      onChange={(event) => setSettings({ language: event.target.value as typeof lang })}
      className="focus-ring min-h-11 rounded-xl border border-border bg-card px-3 font-extrabold text-ink"
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, online, authLoading, isAuthenticated, logout } = useApp();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const lang = settings.language;
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) void navigate({ to: "/login" });
  }, [authLoading, isAuthenticated, navigate]);

  async function signOut() {
    try {
      await logout();
    } catch {
      // The frontend session is cleared even if the server cannot be reached.
    }
    void navigate({ to: "/" });
  }

  if (authLoading || !isAuthenticated) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-paper px-6 text-lg font-bold text-ink"
        aria-live="polite"
      >
        Checking your sign-in…
      </main>
    );
  }

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
        <LanguagePicker />
        <button
          onClick={signOut}
          className="focus-ring flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold text-inksoft hover:bg-muted hover:text-ink"
        >
          <LogOut className="h-5 w-5" /> {t(lang, "Sign out")}
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-3 py-3 backdrop-blur sm:px-4 lg:hidden">
        <Logo />
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <LanguagePicker />
          <Link
            to="/emergency"
            className="focus-ring flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-risk-soft px-3 py-1.5 text-center text-sm font-bold text-risk sm:flex-none"
          >
            {t(lang, "Help now")}
          </Link>
          <button
            onClick={signOut}
            aria-label={t(lang, "Sign out")}
            title={t(lang, "Sign out")}
            className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-full text-ink"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="pb-28 lg:pb-12 lg:pl-64">
        {!online && (
          <div className="flex items-center gap-2 bg-susp-soft px-6 py-2 text-sm font-bold text-ink">
            <WifiOff className="h-4 w-4" />{" "}
            {t(lang, "You're offline. Checks and saved contacts need a connection.")}
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.to)).map(({ to, key, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`focus-ring flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-center text-[11px] font-bold leading-tight ${active ? "text-brand" : "text-inksoft"}`}
            >
              <Icon className="h-6 w-6" />
              {t(lang, key)}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="focus-ring flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-center text-[11px] font-bold leading-tight text-inksoft"
            >
              <Ellipsis className="h-6 w-6" />
              {t(lang, "More")}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left">{t(lang, "More")}</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 grid gap-2">
              {NAV.filter((item) => !MOBILE.includes(item.to)).map(({ to, key, icon: Icon }) => {
                const active = path.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={`focus-ring flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 font-bold ${active ? "bg-brand-soft text-brand" : "text-inksoft hover:bg-muted hover:text-ink"}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {t(lang, key)}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  const { settings } = useApp();
  return (
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="wrap-break-word font-display text-3xl font-semibold text-ink sm:text-4xl">
          {t(settings.language, title)}
        </h1>
        {sub && <p className="mt-2 max-w-2xl text-lg text-inksoft">{t(settings.language, sub)}</p>}
      </div>
      {children}
    </div>
  );
}
