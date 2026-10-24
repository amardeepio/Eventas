import { assistantRequestSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { assistantSystemPrompt, wrapUserMessage } from "@/lib/ai/prompts";
import { hasGroqKey, openAssistantStream } from "@/lib/ai/groq";
import { demoAssistantReply } from "@/lib/ai/demo";
import { hasPromptInjection, SAFE_REFUSAL } from "@/lib/ai/injection";


export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = assistantRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { plan, messages } = input.data;
    if (hasPromptInjection(messages)) {
      return new Response(SAFE_REFUSAL, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Eventas-Guard": "blocked" },
      });
    }
    const fallback = () => new Response(demoAssistantReply(plan, messages.at(-1)?.content ?? ""), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Eventas-Mode": "demo", "Cache-Control": "no-store" },
    });
    if (!hasGroqKey()) return fallback();
    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]);
      const response = await openAssistantStream([
        { role: "system", content: assistantSystemPrompt(plan) },
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
