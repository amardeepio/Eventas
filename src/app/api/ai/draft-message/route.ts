import { draftMessageRequestSchema, draftMessageResponseSchema } from "@/lib/validation/schemas";
import { badRequest, checkAiRateLimit, readJson } from "@/lib/ai/http";
import { AI_CONTEXT_RULES, draftMessagePrompt, languageInstruction } from "@/lib/ai/prompts";
import { generateJson, hasGroqKey } from "@/lib/ai/groq";
import { demoDraftMessageBody } from "@/lib/ai/demo";
import { detectPromptInjection } from "@/lib/ai/injection";

export async function POST(request: Request) {
  const limited = checkAiRateLimit(request);
  if (limited) return limited;
  try {
    const input = draftMessageRequestSchema.safeParse(await readJson(request));
    if (!input.success) return badRequest();
    const { plan, vendorId, intent, language } = input.data;
    const vendor = plan.vendors.find((item) => item.id === vendorId);
    if (!vendor) return badRequest("Choose a vendor from this plan and try again.");

    if (intent && detectPromptInjection(intent)) {
      const response = Response.json({ ...demoDraftMessageBody(plan, vendor), mode: "demo" }, {
        headers: { "X-Eventas-Guard": "blocked" },
      });
      return response;
    }

    const fallback = () => Response.json({ ...demoDraftMessageBody(plan, vendor, intent), mode: "demo" }, {
      headers: { "X-Eventas-Mode": "demo" },
    });
    if (!hasGroqKey()) return fallback();

    try {
      const result = await generateJson({
        system: `${AI_CONTEXT_RULES}${languageInstruction(language, { json: true })}`,
        user: draftMessagePrompt(plan, vendor, intent),
        schema: draftMessageResponseSchema,
        signal: request.signal,
      });
      return Response.json({ ...result, mode: "live" }, { headers: { "X-Eventas-Mode": "live" } });
    } catch (error) {
      if (!request.signal.aborted) console.error("[ai/draft-message] falling back to local draft:", error instanceof Error ? error.message : "unknown error");
      return fallback();
    }
  } catch {
    return badRequest();
  }
}
