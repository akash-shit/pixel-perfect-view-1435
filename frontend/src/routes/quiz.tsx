import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { QUIZ } from "@/data/content";
import { useApp } from "@/lib/app-state";
import { formatNumber, t } from "@/lib/i18n";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "ScamShield" },
      { name: "description", content: "Five real-life situations. Can you spot the scam?" },
      { property: "og:title", content: "Spot the scam quiz — ScamShield" },
      { property: "og:description", content: "Test your scam-spotting skills in two minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Quiz,
});

function Quiz() {
  const { setQuizScore, settings } = useApp();
  const lang = settings.language;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= QUIZ.length;
  const q = QUIZ[i];

  const next = () => {
    const s = score + (picked === q?.correct ? 1 : 0);
    setScore(s);
    setPicked(null);
    if (i + 1 >= QUIZ.length) setQuizScore(s);
    setI(i + 1);
  };

  return (
    <AppShell>
      <PageHeader
        title="Spot the scam"
        {...(!done
          ? {
              sub: t(lang, "Question {current} of {total}", {
                current: formatNumber(i + 1, lang),
                total: formatNumber(QUIZ.length, lang),
              }),
            }
          : {})}
      />
      {done || !q ? (
        <div className="card-soft p-10 text-center">
          <div
            className="font-display text-6xl font-semibold text-brand"
            aria-label={t(lang, "Your score: {score} out of {total}", {
              score: formatNumber(score, lang),
              total: formatNumber(QUIZ.length, lang),
            })}
          >
            {formatNumber(score, lang)}/{formatNumber(QUIZ.length, lang)}
          </div>
          <p className="mt-3 text-xl text-ink">
            {t(
              lang,
              score >= 4
                ? "Excellent — scammers would struggle with you!"
                : "Good effort. Read the Learn guides and try again.",
            )}
          </p>
          <button
            onClick={() => {
              setI(0);
              setScore(0);
            }}
            className="mt-6 rounded-2xl bg-brand px-6 py-3 font-extrabold text-primary-foreground"
          >
            {t(lang, "Try again")}
          </button>
        </div>
      ) : (
        <div className="card-soft max-w-3xl p-7">
          <div className="text-sm font-extrabold uppercase text-inksoft">{t(lang, q.scenario)}</div>
          <p className="mt-2 rounded-2xl rounded-tl-sm bg-muted p-4 text-lg text-ink">
            {t(lang, q.message)}
          </p>
          <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
            {t(lang, q.question)}
          </h2>
          <div className="mt-4 grid gap-3">
            {q.options.map((o, idx) => {
              const state =
                picked === null
                  ? ""
                  : idx === q.correct
                    ? "bg-safe-soft ring-safe"
                    : idx === picked
                      ? "bg-risk-soft ring-risk"
                      : "opacity-60";
              return (
                <button
                  key={o}
                  disabled={picked !== null}
                  onClick={() => setPicked(idx)}
                  className={`focus-ring rounded-2xl bg-paper p-4 text-left text-lg font-bold text-ink ring-2 ring-border ${state}`}
                >
                  {t(lang, o)}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-5 animate-rise">
              <p className="text-lg text-ink">
                <b>{t(lang, picked === q.correct ? "Correct! " : "Not quite. ")}</b>
                {t(lang, q.why)}
              </p>
              <button
                onClick={next}
                className="mt-4 rounded-2xl bg-brand px-6 py-3 font-extrabold text-primary-foreground"
              >
                {t(lang, i + 1 === QUIZ.length ? "See my score" : "Next question")}
              </button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
