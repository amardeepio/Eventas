import { rsvpHostRequestSchema } from "@/lib/validation/schemas";
import { makeGuestLinks, RsvpHttpError } from "@/lib/rsvp/store";
import { checkRsvpRateLimit, publicOrigin, readRsvpJson, rsvpErrorResponse } from "@/lib/rsvp/http";

export async function POST(request: Request) {
  const limited = checkRsvpRateLimit(request);
  if (limited) return limited;
  try {
    const parsed = rsvpHostRequestSchema.safeParse(await readRsvpJson(request));
    if (!parsed.success) throw new RsvpHttpError("Check the plan and host key.", 400);
    const links = await makeGuestLinks(parsed.data.planId, parsed.data.hostKey, publicOrigin(request));
    return Response.json({ ok: true, links });
  } catch (error) {
    return rsvpErrorResponse(error);
  }
}
