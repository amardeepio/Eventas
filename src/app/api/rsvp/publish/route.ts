import { rsvpPublishSchema } from "@/lib/validation/schemas";
import { publishSharedPlan, RsvpHttpError } from "@/lib/rsvp/store";
import { checkRsvpRateLimit, readRsvpJson, rsvpErrorResponse } from "@/lib/rsvp/http";

export async function POST(request: Request) {
  const limited = checkRsvpRateLimit(request);
  if (limited) return limited;
  try {
    const parsed = rsvpPublishSchema.safeParse(await readRsvpJson(request));
    if (!parsed.success) throw new RsvpHttpError("Check the shared plan details and try again.", 400);
    const expiry = parsed.data.expiresAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const result = await publishSharedPlan({
      ...parsed.data,
      functions: parsed.data.functions.map((item) => ({
        id: item.id, name: item.name, date: item.date, startTime: item.startTime, endTime: item.endTime, venue: item.venue,
      })),
      guests: parsed.data.guests.map((guest) => ({ id: guest.id, name: guest.name, functionIds: guest.functionIds })),
      expiresAt: expiry,
    });
    return Response.json({ ok: true, hostKey: result.hostKey, expiresAt: result.expiresAt });
  } catch (error) {
    return rsvpErrorResponse(error);
  }
}
