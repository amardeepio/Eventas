import { rsvpSubmitSchema } from "@/lib/validation/schemas";
import { verifyRsvpToken } from "@/lib/rsvp/token";
import { getSharedGuest, submitSharedRsvp, RsvpHttpError } from "@/lib/rsvp/store";
import { checkRsvpRateLimit, readRsvpJson, rsvpErrorResponse } from "@/lib/rsvp/http";

interface Context {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const limited = checkRsvpRateLimit(request);
  if (limited) return limited;
  try {
    const { token } = await params;
    const payload = verifyRsvpToken(token);
    if (!payload) throw new RsvpHttpError("This RSVP link has expired or is not valid.", 410);
    const view = await getSharedGuest(payload.planId, payload.guestId);
    if (!view) throw new RsvpHttpError("This RSVP link has expired or is not active.", 410);
    return Response.json({ ok: true, ...view });
  } catch (error) {
    return rsvpErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  const limited = checkRsvpRateLimit(request);
  if (limited) return limited;
  try {
    const { token } = await params;
    const payload = verifyRsvpToken(token);
    if (!payload) throw new RsvpHttpError("This RSVP link has expired or is not valid.", 410);
    const parsed = rsvpSubmitSchema.safeParse(await readRsvpJson(request));
    if (!parsed.success) throw new RsvpHttpError("Check the RSVP details and try again.", 400);
    await submitSharedRsvp(payload.planId, payload.guestId, parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    return rsvpErrorResponse(error);
  }
}
