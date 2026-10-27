import { listResponses, RsvpHttpError } from "@/lib/rsvp/store";
import { checkRsvpRateLimit, rsvpErrorResponse } from "@/lib/rsvp/http";

export async function GET(request: Request) {
  const limited = checkRsvpRateLimit(request);
  if (limited) return limited;
  try {
    const planId = new URL(request.url).searchParams.get("planId") ?? "";
    const hostKey = request.headers.get("x-eventas-host-key") ?? "";
    if (!planId || !hostKey) throw new RsvpHttpError("Missing the host key.", 400);
    const responses = await listResponses(planId, hostKey);
    return Response.json({ ok: true, responses });
  } catch (error) {
    return rsvpErrorResponse(error);
  }
}
