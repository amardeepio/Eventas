import { siteAssistantRequestSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { hasPromptInjection, latestUserMessage, SAFE_REFUSAL } from "@/lib/ai/injection";
import { demoSiteReply, SITE_SYSTEM_PROMPT, sitePrompt } from "@/lib/ai/site-prompt";
import { hasGroqKey, openAssistantStream } from "@/lib/ai/groq";

export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = siteAssistantRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { messages } = input.data;
    const question = latestUserMessage(messages);

    if (hasPromptInjection(messages)) {
      return new Response(SAFE_REFUSAL, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Eventas-Guard": "blocked" },
      });
    }

    const fallback = () => new Response(demoSiteReply(question), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Eventas-Mode": "demo", "Cache-Control": "no-store" },
    });
    if (!hasGroqKey()) return fallback();

    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]);
      const safeMessages = messages.slice(-8).map((message) => message.role === "user"
        ? { ...message, content: sitePrompt(message.content) }
        : message);
      const response = await openAssistantStream([
        { role: "system", content: SITE_SYSTEM_PROMPT },
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
