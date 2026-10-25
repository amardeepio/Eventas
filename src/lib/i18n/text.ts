/** Shared, dependency-free helpers used by both the browser and the server. */

const EDGE_WHITESPACE = /^(\s*)([\s\S]*?)(\s*)$/;

/** Split leading/trailing whitespace so replacements keep the DOM layout intact. */
export function splitWhitespace(text: string): { lead: string; core: string; trail: string } {
  const match = EDGE_WHITESPACE.exec(text);
  if (!match) return { lead: "", core: text, trail: "" };
  return { lead: match[1] ?? "", core: match[2] ?? "", trail: match[3] ?? "" };
}

const URL_LIKE = /^(?:https?:\/\/|www\.|mailto:|tel:)/i;
const NUMBER_LIKE = /^[\d\s.,:;%₹$€£+\-/()]+$/;

/** Short, numeric, symbolic, or URL-only strings are not worth translating. */
export function isTranslatableText(text: string): boolean {
  const core = text.trim();
  if (core.length < 2) return false;
  if (!/\p{L}/u.test(core)) return false;
  if (URL_LIKE.test(core)) return false;
  if (NUMBER_LIKE.test(core)) return false;
  return true;
}

/** Currency and date fragments should survive machine translation unchanged. */
export function looksLikeMoneyOrDate(text: string): boolean {
  const core = text.trim();
  return /^(?:₹|rs\.?|inr)\s?[\d,.]+(?:\s?(?:lakh|crore|cr|l))?$/i.test(core)
    || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(core);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

/**
 * Google returns HTML-escaped text even with `format: text`
 * (for example `We&#39;re`). Decode it once on the server.
 */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function safeFromCodePoint(code: number, fallback: string): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

/** Replace `{name}` placeholders after translation so ordering stays flexible. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(vars, key) ? String(vars[key]) : match,
  );
}
