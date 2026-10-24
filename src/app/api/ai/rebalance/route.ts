import { rebalanceRequestSchema, rebalanceResponseSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { AI_CONTEXT_RULES, rebalancePrompt } from "@/lib/ai/prompts";
import { generateJson, hasGroqKey } from "@/lib/ai/groq";
import { isSafeAllocation, proposeRebalance } from "@/lib/ai/rebalance";
import { detectPromptInjection } from "@/lib/ai/injection";


export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = rebalanceRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { plan, goal } = input.data;
    if (detectPromptInjection(goal)) {
      return Response.json(
        { ...proposeRebalance(plan, "save 5%"), mode: "demo" },
        { headers: { "X-Eventas-Guard": "blocked" } },
      );
    }
    if (hasGroqKey()) {
      try {
        const result = await generateJson({
          system: AI_CONTEXT_RULES,
          user: rebalancePrompt(plan, goal),
          schema: rebalanceResponseSchema,
          signal: request.signal,
        });
        const rounded = Object.fromEntries(Object.entries(result.allocation).map(([id, amount]) => [id, Math.round(amount)]));
        if (isSafeAllocation(plan, rounded)) return Response.json({ ...result, allocation: rounded, mode: "live" });
      } catch { /* The deterministic planner below is the safe fallback. */ }
    }
    return Response.json({ ...proposeRebalance(plan, goal), mode: "demo" });
  } catch {
    return badRequest();
  }
}
