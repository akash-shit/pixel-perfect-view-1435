import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { LanguagePicker, Logo } from "@/components/ss/AppShell";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — ScamShield" }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const { register, authLoading, isAuthenticated, settings } = useApp();
  const lang = settings.language;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) void navigate({ to: "/dashboard" });
  }, [authLoading, isAuthenticated, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError(
        t(lang, "Enter your name, a valid email address, and a password of at least 8 characters."),
      );
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      void navigate({ to: "/dashboard" });
    } catch (cause) {
      setError(
        t(
          lang,
          cause instanceof Error
            ? cause.message
            : "We could not create your account. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "focus-ring min-h-16 w-full rounded-2xl border-2 border-input bg-card px-5 text-lg font-bold text-ink placeholder:text-inksoft/80";

  return (
    <main className="flex min-h-screen flex-col bg-paper px-5 py-6 sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguagePicker />
          <Link to="/" className="focus-ring rounded-xl px-4 py-3 text-base font-extrabold text-ink hover:bg-muted">{t(lang, "Back to home")}</Link>
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
            {t(lang, "Create your account")}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-inksoft sm:text-xl">
            {t(lang, "Keep your trusted people and safety checks together.")}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <label className="block text-lg font-extrabold text-ink" htmlFor="signup-name">
              {t(lang, "Your name")}
              <input
                id="signup-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`${field} mt-2`}
              />
            </label>
            <label className="block text-lg font-extrabold text-ink" htmlFor="signup-email">
              {t(lang, "Email address")}
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`${field} mt-2`}
              />
            </label>
            <label className="block text-lg font-extrabold text-ink" htmlFor="signup-password">
              {t(lang, "Password")}
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${field} mt-2`}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-risk-soft px-4 py-3 text-lg font-bold text-risk"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || authLoading}
              className="focus-ring min-h-16 w-full rounded-2xl bg-brand px-6 text-xl font-extrabold text-primary-foreground shadow-md transition-colors hover:bg-brand/90 disabled:opacity-60"
            >
              {t(lang, submitting ? "Creating account…" : "Create account")}
            </button>
          </form>

          <p className="mt-8 text-center text-lg font-bold text-ink">
            {t(lang, "Already have an account?")}{" "}
            <Link
              to="/login"
              className="focus-ring inline-flex min-h-11 items-center rounded-lg px-1 text-brand underline underline-offset-4"
            >
              {t(lang, "Login")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
