import { assistantRequestSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { assistantSystemPrompt, wrapUserMessage } from "@/lib/ai/prompts";
import { hasGroqKey, openAssistantStream } from "@/lib/ai/groq";
import { demoAssistantReply } from "@/lib/ai/demo";
import { hasPromptInjection, SAFE_REFUSAL } from "@/lib/ai/injection";
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
    const input = assistantRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { plan, messages, language } = input.data;
    if (hasPromptInjection(messages)) {
      return new Response(await localize(SAFE_REFUSAL, language), {
        headers: { ...PLAIN_TEXT, "X-Eventas-Guard": "blocked" },
      });
    }
    const fallback = async () => new Response(
      await localize(demoAssistantReply(plan, messages.at(-1)?.content ?? ""), language),
      { headers: { ...PLAIN_TEXT, "X-Eventas-Mode": "demo" } },
    );
    if (!hasGroqKey()) return fallback();
    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]);
      const response = await openAssistantStream([
        { role: "system", content: assistantSystemPrompt(plan, language) },
        ...messages.slice(-12).map((message) => message.role === "user"
          ? { ...message, content: wrapUserMessage(message.content) }
          : message),
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
