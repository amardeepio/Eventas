import "server-only";
import type { LanguageCode } from "@/lib/i18n/languages";
import { decodeEntities, isTranslatableText } from "@/lib/i18n/text";

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_TEXTS_PER_REQUEST = 50;
const MAX_CHARS_PER_REQUEST = 4_800;
const MAX_CACHE_ENTRIES = 4_000;
const DEFAULT_DAILY_CHAR_LIMIT = 400_000;

interface CacheEntry {
  value: string;
  cachedAt: number;
}

// Route handlers may be bundled more than once in development; keep one cache.
const globalCache = globalThis as typeof globalThis & {
  __eventasTranslateCache?: Map<string, CacheEntry>;
};
const cache = (globalCache.__eventasTranslateCache ??= new Map<string, CacheEntry>());

interface BudgetState {
  day: string;
  chars: number;
}

const globalBudget = globalThis as typeof globalThis & {
  __eventasTranslateBudget?: BudgetState;
};
const budget = (globalBudget.__eventasTranslateBudget ??= { day: "", chars: 0 });

function dailyLimit(): number {
  const configured = Number(process.env.TRANSLATE_DAILY_CHAR_LIMIT ?? DEFAULT_DAILY_CHAR_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DAILY_CHAR_LIMIT;
}

/** Protect the Google free tier from being drained through the public proxy. */
function canSpend(chars: number, today = new Date().toISOString().slice(0, 10)): boolean {
  if (budget.day !== today) {
    budget.day = today;
    budget.chars = 0;
  }
  if (budget.chars + chars > dailyLimit()) return false;
  budget.chars += chars;
  return true;
}

function cacheKey(target: LanguageCode, text: string): string {
  return `${target}\u0000${text}`;
}

export function hasTranslateKey(): boolean {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY?.trim());
}

function remember(key: string, value: string): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt).slice(0, 500);
    for (const [entryKey] of oldest) cache.delete(entryKey);
  }
  cache.set(key, { value, cachedAt: Date.now() });
}

interface Batch {
  texts: string[];
}

function chunk(texts: string[]): Batch[] {
  const batches: Batch[] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    const size = text.length;
    if (current.length > 0 && (current.length >= MAX_TEXTS_PER_REQUEST || chars + size > MAX_CHARS_PER_REQUEST)) {
      batches.push({ texts: current });
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += size;
  }
  if (current.length > 0) batches.push({ texts: current });
  return batches;
}

async function translateBatch(texts: string[], target: LanguageCode): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!key) return null;
  try {
    const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, target, source: "en", format: "text" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      data?: { translations?: Array<{ translatedText?: string }> };
    };
    const translations = payload.data?.translations;
    if (!Array.isArray(translations) || translations.length !== texts.length) return null;
    return translations.map((item) => decodeEntities(item.translatedText ?? ""));
  } catch {
    // Network failures, timeouts, and malformed payloads all degrade to English.
    return null;
  }
}

/**
 * Translate a list of English strings. Returns an array aligned with `texts`;
 * an entry is `null` when it could not be translated, so callers can fall back
 * to the original string without ever showing an empty cell.
 */
export async function translateTexts(
  texts: string[],
  target: LanguageCode,
  source: "en" = "en",
): Promise<Array<string | null>> {
  const results: Array<string | null> = texts.map(() => null);
  if (target === source || !hasTranslateKey()) return results;

  const groups = new Map<string, number[]>();
  texts.forEach((text, index) => {
    if (!isTranslatableText(text)) return;
    const indices = groups.get(text);
    if (indices) indices.push(index);
    else groups.set(text, [index]);
  });

  const missing: string[] = [];
  for (const text of groups.keys()) {
    const cached = cache.get(cacheKey(target, text));
    if (cached) {
      for (const index of groups.get(text) ?? []) results[index] = cached.value;
      continue;
    }
    missing.push(text);
  }

  for (const batch of chunk(missing)) {
    const chars = batch.texts.reduce((sum, text) => sum + text.length, 0);
    if (!canSpend(chars)) break;
    const translated = await translateBatch(batch.texts, target);
    if (!translated) continue;
    batch.texts.forEach((text, offset) => {
      const value = translated[offset];
      if (!value || value === text) return;
      remember(cacheKey(target, text), value);
      for (const index of groups.get(text) ?? []) results[index] = value;
    });
  }

  return results;
}

export function clearTranslateCache(): void {
  cache.clear();
  budget.day = "";
  budget.chars = 0;
}
