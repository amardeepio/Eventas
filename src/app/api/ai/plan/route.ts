import { aiPlanRequestSchema, aiPlanResponseSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { AI_CONTEXT_RULES, languageInstruction, planGenerationPrompt } from "@/lib/ai/prompts";
import { generateJson, hasGroqKey } from "@/lib/ai/groq";
import { demoPlanEnrichment } from "@/lib/ai/demo";
import { TtlCache } from "@/lib/ai/cache";

const cache = new TtlCache<Awaited<ReturnType<typeof demoPlanEnrichment>>>();

export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = aiPlanRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { plan, language } = input.data;
    const cacheKey = JSON.stringify({ language, brief: plan.brief, ideas: plan.ideas.map((idea) => idea.id) });
    const cached = cache.get(cacheKey);
    if (cached) return Response.json({ ...cached, mode: hasGroqKey() ? "live" : "demo" });
    if (!hasGroqKey()) return Response.json({ ...demoPlanEnrichment(plan), mode: "demo" });
    try {
      const result = await generateJson({
        system: `${AI_CONTEXT_RULES}${languageInstruction(language, { json: true })}`,
        user: planGenerationPrompt(plan),
        schema: aiPlanResponseSchema,
        signal: request.signal,
      });
      cache.set(cacheKey, result);
      return Response.json({ ...result, mode: "live" });
    } catch (error) {
      if (!request.signal.aborted) console.error("[ai/plan] falling back to local planning:", error instanceof Error ? error.message : "unknown error");
      return Response.json({ ...demoPlanEnrichment(plan), mode: "demo" });
    }
  } catch {
    return badRequest();
  }
}
