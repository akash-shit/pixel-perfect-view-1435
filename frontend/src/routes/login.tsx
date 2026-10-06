import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { LanguagePicker, Logo } from "@/components/ss/AppShell";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "ScamShield" },
      { name: "description", content: "Sign in to continue to your Scam Safety Assistant." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { login, authLoading, isAuthenticated, settings } = useApp();
  const lang = settings.language;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) void navigate({ to: "/dashboard" });
  }, [authLoading, isAuthenticated, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError(t(lang, "Please enter your email address and password."));
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      void navigate({ to: "/dashboard" });
    } catch (cause) {
      setError(
        t(
          lang,
          cause instanceof Error ? cause.message : "We could not sign you in. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper px-5 py-6 sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <LanguagePicker />
          <Link to="/" className="focus-ring rounded-xl px-2 py-3 text-sm font-extrabold text-ink hover:bg-muted sm:px-4 sm:text-base">{t(lang, "Back to home")}</Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
        <div className="card-soft animate-rise rounded-3xl p-6 sm:p-10">
          <div
            className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <ShieldCheck className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">
            {t(lang, "Welcome Back")}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-inksoft sm:text-xl">
            {t(lang, "Sign in to continue to your Scam Safety Assistant")}
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-lg font-extrabold text-ink">
                {t(lang, "Email address")}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error && !email.trim())}
                aria-describedby={error ? "login-error" : undefined}
                className="focus-ring min-h-16 w-full rounded-2xl border-2 border-input bg-card px-5 text-lg font-bold text-ink placeholder:text-inksoft/80"
                placeholder={t(lang, "Enter your email address")}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-lg font-extrabold text-ink"
              >
                {t(lang, "Password")}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="off"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error && !password)}
                  aria-describedby={error ? "login-error" : undefined}
                  className="focus-ring min-h-16 w-full rounded-2xl border-2 border-input bg-card py-4 pl-5 pr-16 text-lg font-bold text-ink placeholder:text-inksoft/80"
                  placeholder={t(lang, "Enter your password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={t(lang, showPassword ? "Hide password" : "Show password")}
                  aria-pressed={showPassword}
                  className="focus-ring absolute inset-y-1 right-1 grid w-14 place-items-center rounded-xl text-ink hover:bg-muted"
                >
                  {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-xl bg-risk-soft px-4 py-3 text-lg font-bold text-risk"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="focus-ring min-h-11 rounded-lg px-2 text-lg font-extrabold text-brand underline underline-offset-4"
              >
                {t(lang, "Forgot Password?")}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="focus-ring min-h-16 w-full rounded-2xl bg-brand px-6 text-xl font-extrabold text-primary-foreground shadow-md transition-colors hover:bg-brand/90 disabled:opacity-60"
            >
              {t(lang, submitting ? "Signing in…" : "Login")}
            </button>
          </form>

          <p className="mt-8 text-center text-lg font-bold text-ink">
            {t(lang, "Don’t have an account?")}{" "}
            <Link
              to="/signup"
              className="focus-ring inline-flex min-h-11 items-center rounded-lg px-1 text-brand underline underline-offset-4"
            >
              {t(lang, "Sign Up")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
