"use client";

import type { LanguageCode } from "@/lib/i18n/languages";
import { isTranslatableText } from "@/lib/i18n/text";

const STORAGE_KEY = "eventas.translations.v1";
const MAX_TEXTS_PER_REQUEST = 50;
const MAX_CHARS_PER_REQUEST = 4_800;
const MAX_ENTRIES_PER_LANGUAGE = 1_500;

type LanguageCache = Record<string, string>;
type Store = Record<string, LanguageCache>;

let store: Store | null = null;
const memory = new Map<LanguageCode, Map<string, string>>();

function readStore(): Store {
  if (store) return store;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    store = raw ? JSON.parse(raw) as Store : {};
  } catch {
    store = {};
  }
  return store;
}

function persist(): void {
  if (typeof window === "undefined" || !store) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quotas and private browsing must never break translation.
  }
}

function languageMap(language: LanguageCode): Map<string, string> {
  const existing = memory.get(language);
  if (existing) return existing;
  const map = new Map(Object.entries(readStore()[language] ?? {}));
  memory.set(language, map);
  return map;
}

export function getCached(language: LanguageCode, text: string): string | undefined {
  return languageMap(language).get(text);
}

export function primeTranslations(language: LanguageCode, entries: Record<string, string>): void {
  const map = languageMap(language);
  let changed = false;
  for (const [source, target] of Object.entries(entries)) {
    if (!target || target === source || map.get(source) === target) continue;
    map.set(source, target);
    changed = true;
  }
  if (!changed) return;
  const trimmed = [...map.entries()].slice(-MAX_ENTRIES_PER_LANGUAGE);
  memory.set(language, new Map(trimmed));
  const current = readStore();
  current[language] = Object.fromEntries(trimmed);
  store = current;
  persist();
}

export function clearTranslationCache(): void {
  memory.clear();
  store = {};
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
}

interface TranslateResponse {
  translations?: unknown;
  mode?: unknown;
}

async function requestBatch(language: LanguageCode, texts: string[]): Promise<Record<string, string>> {
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: language, texts }),
    });
    if (!response.ok) return {};
    const payload = await response.json() as TranslateResponse;
    const list = payload.translations;
    if (!Array.isArray(list)) return {};
    const result: Record<string, string> = {};
    texts.forEach((source, index) => {
      const value: unknown = list[index];
      if (typeof value === "string" && value && value !== source) result[source] = value;
    });
    return result;
  } catch {
    return {};
  }
}

function chunk(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (current.length > 0 && (current.length >= MAX_TEXTS_PER_REQUEST || chars + text.length > MAX_CHARS_PER_REQUEST)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/**
 * Resolve translations for a set of English strings, using the local cache first
 * and the server proxy for anything new. Never throws: unknown strings simply
 * stay in English.
 */
export async function fetchTranslations(
  language: LanguageCode,
  texts: string[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const map = languageMap(language);
  const unique = [...new Set(texts.filter((text) => isTranslatableText(text)))];
  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const text of unique) {
    const cached = map.get(text);
    if (cached) result[text] = cached;
    else missing.push(text);
  }
  if (missing.length === 0) return result;

  for (const batch of chunk(missing)) {
    if (signal?.aborted) break;
    const translated = await requestBatch(language, batch);
    Object.assign(result, translated);
    primeTranslations(language, translated);
  }
  return result;
}
