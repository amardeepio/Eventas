import { siteAssistantRequestSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { hasPromptInjection, latestUserMessage, SAFE_REFUSAL } from "@/lib/ai/injection";
import { demoSiteReply, sitePrompt, siteSystemPrompt } from "@/lib/ai/site-prompt";
import { hasGroqKey, openAssistantStream } from "@/lib/ai/groq";
import { translateTexts } from "@/lib/translate/server";
import type { LanguageCode } from "@/lib/i18n/languages";

const PLAIN_TEXT = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

async function localize(text: string, language: LanguageCode): Promise<string> {
  if (language === "en") return text;
  const [translated] = await translateTexts([text], language);
  return translated ?? text;
}

export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = siteAssistantRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { messages, language } = input.data;
    const question = latestUserMessage(messages);

    if (hasPromptInjection(messages)) {
      return new Response(await localize(SAFE_REFUSAL, language), {
        headers: { ...PLAIN_TEXT, "X-Eventas-Guard": "blocked" },
      });
    }

    const fallback = async () => new Response(
      await localize(demoSiteReply(question), language),
      { headers: { ...PLAIN_TEXT, "X-Eventas-Mode": "demo" } },
    );
    if (!hasGroqKey()) return fallback();

    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]);
      const safeMessages = messages.slice(-8).map((message) => message.role === "user"
        ? { ...message, content: sitePrompt(message.content) }
        : message);
      const response = await openAssistantStream([
        { role: "system", content: siteSystemPrompt(language) },
        ...safeMessages,
      ], signal);
      response.headers.set("X-Eventas-Mode", "live");
      return response;
    } catch {
      return fallback();
    }
  } catch {
    return badRequest();
  }
}
