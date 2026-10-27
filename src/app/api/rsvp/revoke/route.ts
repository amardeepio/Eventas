import { rsvpHostRequestSchema } from "@/lib/validation/schemas";
import { revokeSharedPlan, RsvpHttpError } from "@/lib/rsvp/store";
import { checkRsvpRateLimit, readRsvpJson, rsvpErrorResponse } from "@/lib/rsvp/http";

export async function POST(request: Request) {
  const limited = checkRsvpRateLimit(request);
  if (limited) return limited;
  try {
    const parsed = rsvpHostRequestSchema.safeParse(await readRsvpJson(request));
    if (!parsed.success) throw new RsvpHttpError("Check the plan and host key.", 400);
    await revokeSharedPlan(parsed.data.planId, parsed.data.hostKey);
    return Response.json({ ok: true });
  } catch (error) {
    return rsvpErrorResponse(error);
  }
}
