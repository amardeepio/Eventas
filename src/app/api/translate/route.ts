import { badRequest, checkTranslateRateLimit, readJson } from "@/lib/ai/http";
import { translateRequestSchema } from "@/lib/validation/schemas";
import { hasTranslateKey, translateTexts } from "@/lib/translate/server";

const MAX_TOTAL_CHARS = 8_000;

/**
 * Server-side proxy for Google Cloud Translation.
 *
 * The key never reaches the browser, and every failure mode (no key, quota,
 * network, bad payload) degrades to the original English string instead of
 * breaking the page.
 */
export async function POST(request: Request) {
  const limited = checkTranslateRateLimit(request);
  if (limited) return limited;
  try {
    const input = translateRequestSchema.safeParse(await readJson(request, 40_000));
    if (!input.success) return badRequest("That translation request could not be read.");
    const { target, texts } = input.data;
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) return badRequest("Too much text in one translation request.");

    if (!hasTranslateKey()) {
      return Response.json(
        { translations: texts, mode: "unavailable" },
        { headers: { "Cache-Control": "no-store", "X-Eventas-Translate": "unavailable" } },
      );
    }

    const translated = await translateTexts(texts, target);
    const translations = texts.map((text, index) => translated[index] ?? text);
    const mode = translations.some((text, index) => text !== texts[index]) ? "live" : "unavailable";
    return Response.json(
      { translations, mode },
      { headers: { "Cache-Control": "no-store", "X-Eventas-Translate": mode } },
    );
  } catch {
    return badRequest("That translation request could not be read.");
  }
}
