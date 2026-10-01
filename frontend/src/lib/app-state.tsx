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
import { useAuth } from "./auth-context";
import {
  addTrustedContact,
  clearScamHistory,
  deleteScamCheck,
  deleteTrustedContact,
  getScamHistory,
  getTrustedContacts,
  updateTrustedContact,
  type ContactInput,
} from "@/services/api";

interface Settings {
  mode: AppMode;
  language: UiLanguage;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  voice: boolean;
}

interface AppState {
  user: ReturnType<typeof useAuth>["user"];
  isAuthenticated: boolean;
  authLoading: boolean;
  login: ReturnType<typeof useAuth>["login"];
  register: ReturnType<typeof useAuth>["register"];
  logout: ReturnType<typeof useAuth>["logout"];
  dataLoading: boolean;
  dataError: string | null;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  history: AnalysisResult[];
  addResult: (r: AnalysisResult) => void;
  removeResult: (id: string) => void;
  clearHistory: () => void;
  contacts: TrustedContact[];
  addContact: (c: Omit<TrustedContact, "id">) => Promise<void>;
  updateContact: (id: string, c: ContactInput) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
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
  const { user, loading: authLoading, isAuthenticated, login, register, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULTS);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [quizScore, setQuizScoreState] = useState<number | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setSettingsState(load("ss.settings", DEFAULTS));
    window.localStorage.removeItem("ss.history");
    window.localStorage.removeItem("ss.contacts");
    window.localStorage.removeItem("ss.reports");
    window.localStorage.removeItem("ss.quiz");
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
    if (authLoading) return;
    setReports(user ? load(`ss.reports.${user.id}`, []) : []);
    setQuizScoreState(user ? load<number | null>(`ss.quiz.${user.id}`, null) : null);
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHistory([]);
      setContacts([]);
      setDataError(null);
      setDataLoading(false);
      return;
    }

    let active = true;
    setDataLoading(true);
    setDataError(null);
    Promise.all([getTrustedContacts(), getScamHistory(settings.language)])
      .then(([savedContacts, savedHistory]) => {
        if (!active) return;
        setContacts(savedContacts);
        setHistory(savedHistory);
      })
      .catch(() => {
        if (!active) return;
        setDataError(
          "Your saved contacts and checks could not be loaded. Please refresh and try again.",
        );
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, authLoading, settings.language]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.lang = settings.language === "hi" ? "hi" : settings.language === "bn" ? "bn" : "en";
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
    setHistory((prev) => [r, ...prev].slice(0, 100));
  }, []);

  const removeResult = useCallback(async (id: string) => {
    await deleteScamCheck(id);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearHistory = useCallback(async () => {
    await clearScamHistory();
    setHistory([]);
  }, []);

  const addContact = useCallback(async (c: Omit<TrustedContact, "id">) => {
    const contact = await addTrustedContact({
      name: c.name,
      phone: c.phone,
      relationship: c.relation,
    });
    setContacts((prev) => [...prev, contact]);
  }, []);

  const updateContact = useCallback(async (id: string, c: ContactInput) => {
    const updated = await updateTrustedContact(id, c);
    setContacts((prev) => prev.map((contact) => (contact.id === id ? updated : contact)));
  }, []);

  const removeContact = useCallback(async (id: string) => {
    await deleteTrustedContact(id);
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  }, []);

  const addReport = useCallback(
    (r: Omit<ScamReport, "id">) => {
      const created: ScamReport = {
        ...r,
        id: `SS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      };
      const storageKey = user ? `ss.reports.${user.id}` : "ss.reports.anonymous";
      setReports((prev) => {
        const next = [created, ...prev];
        save(storageKey, next);
        return next;
      });
      return created;
    },
    [user],
  );

  const setQuizScore = useCallback(
    (n: number) => {
      setQuizScoreState(n);
      save(user ? `ss.quiz.${user.id}` : "ss.quiz.anonymous", n);
    },
    [user],
  );

  const value = useMemo<AppState>(
    () => ({
      user,
      isAuthenticated,
      authLoading,
      login,
      register,
      logout,
      dataLoading,
      dataError,
      settings,
      setSettings,
      history,
      addResult,
      removeResult,
      clearHistory,
      contacts,
      addContact,
      updateContact,
      removeContact,
      reports,
      addReport,
      quizScore,
      setQuizScore,
      online,
    }),
    [
      settings,
      user,
      isAuthenticated,
      authLoading,
      login,
      register,
      logout,
      dataLoading,
      dataError,
      setSettings,
      history,
      addResult,
      removeResult,
      clearHistory,
      contacts,
      addContact,
      updateContact,
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
