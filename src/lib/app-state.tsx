import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisResult, AppMode, ScamReport, TrustedContact, UiLanguage } from "./types";

interface Settings {
  mode: AppMode;
  language: UiLanguage;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  voice: boolean;
}

interface AppState {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  history: AnalysisResult[];
  addResult: (r: AnalysisResult) => void;
  removeResult: (id: string) => void;
  clearHistory: () => void;
  contacts: TrustedContact[];
  addContact: (c: Omit<TrustedContact, "id">) => void;
  removeContact: (id: string) => void;
  reports: ScamReport[];
  addReport: (r: Omit<ScamReport, "id">) => ScamReport;
  quizScore: number | null;
  setQuizScore: (n: number) => void;
  online: boolean;
}

const DEFAULTS: Settings = {
  mode: "personal",
  language: "en",
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  voice: false,
};

const SEED_CONTACTS: TrustedContact[] = [
  { id: "c1", name: "Ananya (daughter)", relation: "Daughter", phone: "+91 98XXX 11021", canBeAsked: true },
  { id: "c2", name: "Rahul (son)", relation: "Son", phone: "+91 98XXX 44920", canBeAsked: true },
];

const Ctx = createContext<AppState | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — stay in memory */
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULTS);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>(SEED_CONTACTS);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [quizScore, setQuizScoreState] = useState<number | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setSettingsState(load("ss.settings", DEFAULTS));
    setHistory(load("ss.history", []));
    setContacts(load("ss.contacts", SEED_CONTACTS));
    setReports(load("ss.reports", []));
    setQuizScoreState(load<number | null>("ss.quiz", null));
    setHydrated(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("ss-elder", settings.mode === "elder");
    root.classList.toggle("ss-large-text", settings.largeText && settings.mode !== "elder");
    root.classList.toggle("ss-contrast", settings.highContrast || settings.mode === "elder");
    root.classList.toggle("ss-reduce-motion", settings.reduceMotion);
  }, [settings, hydrated]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      save("ss.settings", next);
      return next;
    });
  }, []);

  const addResult = useCallback((r: AnalysisResult) => {
    setHistory((prev) => {
      const next = [r, ...prev].slice(0, 60);
      save("ss.history", next);
      return next;
    });
  }, []);

  const removeResult = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((r) => r.id !== id);
      save("ss.history", next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    save("ss.history", []);
  }, []);

  const addContact = useCallback((c: Omit<TrustedContact, "id">) => {
    setContacts((prev) => {
      const next = [...prev, { ...c, id: Math.random().toString(36).slice(2, 9) }];
      save("ss.contacts", next);
      return next;
    });
  }, []);

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      save("ss.contacts", next);
      return next;
    });
  }, []);

  const addReport = useCallback((r: Omit<ScamReport, "id">) => {
    const created: ScamReport = { ...r, id: `SS-${Math.random().toString(36).slice(2, 7).toUpperCase()}` };
    setReports((prev) => {
      const next = [created, ...prev];
      save("ss.reports", next);
      return next;
    });
    return created;
  }, []);

  const setQuizScore = useCallback((n: number) => {
    setQuizScoreState(n);
    save("ss.quiz", n);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      setSettings,
      history,
      addResult,
      removeResult,
      clearHistory,
      contacts,
      addContact,
      removeContact,
      reports,
      addReport,
      quizScore,
      setQuizScore,
      online,
    }),
    [
      settings,
      setSettings,
      history,
      addResult,
      removeResult,
      clearHistory,
      contacts,
      addContact,
      removeContact,
      reports,
      addReport,
      quizScore,
      setQuizScore,
      online,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppStateProvider");
  return ctx;
}

export function safetyScore(history: AnalysisResult[], quizScore: number | null, reports: number) {
  const checks = history.length;
  const caught = history.filter((h) => h.level !== "safe").length;
  const base = 60 + Math.min(18, checks * 2) + Math.min(10, caught * 2) + Math.min(6, reports * 2);
  const quiz = quizScore ? Math.min(6, quizScore) : 0;
  return Math.min(99, base + quiz);
}
