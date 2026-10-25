import { weddingDraftRequestSchema, weddingDraftSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { AI_CONTEXT_RULES, weddingDraftPrompt } from "@/lib/ai/prompts";
import { generateJson, hasGroqKey } from "@/lib/ai/groq";
import { demoWeddingDraft } from "@/lib/ai/demo";
import { normalizeWeddingDraft } from "@/lib/ai/wedding-draft";
import { hasPromptInjection, SAFE_REFUSAL } from "@/lib/ai/injection";

export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = weddingDraftRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { message, current } = input.data;

    if (hasPromptInjection([{ role: "user", content: message }])) {
      const response = badRequest(SAFE_REFUSAL);
      response.headers.set("X-Eventas-Guard", "blocked");
      return response;
    }

    const fallback = () => {
      const demo = demoWeddingDraft(message);
      return Response.json({
        brief: demo.brief,
        assumptions: demo.assumptions,
        questions: demo.questions,
        mode: "demo",
      });
    };
    if (!hasGroqKey()) return fallback();

    try {
      const draft = await generateJson({
        system: AI_CONTEXT_RULES,
        user: weddingDraftPrompt(message, current),
        schema: weddingDraftSchema,
        signal: request.signal,
      });
      const normalized = normalizeWeddingDraft(draft, new Date(), current);
      return Response.json({ ...normalized, mode: "live" });
    } catch (error) {
      if (!request.signal.aborted) console.error("[ai/wedding-draft] falling back to local draft:", error instanceof Error ? error.message : "unknown error");
      return fallback();
    }
  } catch {
    return badRequest();
  }
}
