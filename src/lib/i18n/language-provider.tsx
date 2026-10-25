"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LANGUAGE, getLanguage, isLanguageCode, type LanguageCode } from "./languages";
import { interpolate } from "./text";
import { fetchTranslations, getCached } from "../translate/client";

const STORAGE_KEY = "eventas.language.v1";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  /** Translate a literal and interpolate `{placeholders}`. Falls back to English. */
  t: (source: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
  translating: boolean;
  reportTranslating: (value: boolean) => void;
  /** Increments when new translations arrive so consumers re-render. */
  version: number;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [version, setVersion] = useState(0);
  const pending = useRef(new Set<string>());
  const originalTitle = useRef("");
  const inFlight = useRef(0);
  const mounted = useRef(true);

  const setLanguage = useCallback((next: LanguageCode) => {
    pending.current.clear();
    setLanguageState((current) => (current === next ? current : next));
    setVersion((value) => value + 1);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage is optional; the in-memory choice still applies.
      }
    }
  }, []);

  const reportTranslating = useCallback((value: boolean) => setTranslating(value), []);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  useEffect(() => {
    originalTitle.current = document.title;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Hydration from an external store necessarily happens after SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isLanguageCode(stored) && stored !== DEFAULT_LANGUAGE) setLanguageState(stored);
    } catch {
      // Ignore unreadable storage.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const meta = getLanguage(language);
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dataset.language = language;
  }, [language]);

  // Translate the document title once per language. Next.js can reassert its
  // metadata title during hydration, so keep watching the title element.
  useEffect(() => {
    if (!ready) return;
    const original = originalTitle.current;
    if (!original) return;
    if (language === DEFAULT_LANGUAGE) {
      document.title = original;
      return;
    }
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      const translated = getCached(language, original);
      if (translated && document.title !== translated) document.title = translated;
    };
    const cached = getCached(language, original);
    if (cached) document.title = cached;
    else {
      void fetchTranslations(language, [original]).then((result) => {
        if (!cancelled && result[original]) {
          document.title = result[original];
        }
      });
    }
    const titleNode = document.querySelector("title");
    const observer = new MutationObserver(apply);
    if (titleNode) observer.observe(titleNode, { childList: true, characterData: true, subtree: true });
    const timer = setTimeout(apply, 400);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [language, ready]);

  const t = useCallback(
    (source: string, vars?: Record<string, string | number>) => {
      if (!ready || language === DEFAULT_LANGUAGE) return interpolate(source, vars);
      const translated = getCached(language, source);
      if (translated) return interpolate(translated, vars);
      pending.current.add(source);
      return interpolate(source, vars);
    },
    [language, ready],
  );

  // Flush literals requested by `t()` during render. Declared after the render
  // so queueing never calls setState while rendering.
  useEffect(() => {
    if (!ready || pending.current.size === 0) return;
    const queue = [...pending.current];
    pending.current.clear();
    inFlight.current += 1;
    reportTranslating(true);
    void fetchTranslations(language, queue)
      .then((result) => {
        if (!mounted.current) return;
        if (Object.keys(result).length > 0) setVersion((value) => value + 1);
      })
      .finally(() => {
        inFlight.current = Math.max(0, inFlight.current - 1);
        if (mounted.current && inFlight.current === 0) reportTranslating(false);
      });
  });

  const value = useMemo(
    () => ({ language, setLanguage, t, ready, translating, reportTranslating, version }),
    [language, setLanguage, t, ready, translating, reportTranslating, version],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
