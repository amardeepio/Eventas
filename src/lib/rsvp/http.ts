import { getRequestKey, readJson } from "@/lib/ai/http";
import { rsvpDayLimiter, rsvpMinuteLimiter } from "@/lib/utils/rate-limit";
import { RsvpConfigError } from "./token";
import { RsvpHttpError } from "./store";

export function checkRsvpRateLimit(request: Request): Response | null {
  const ip = getRequestKey(request);
  const minute = rsvpMinuteLimiter.check(ip);
  const day = rsvpDayLimiter.check("global");
  if (minute.allowed && day.allowed) return null;
  return Response.json(
    { error: "Too many RSVP requests. Please try again in a minute." },
    { status: 429, headers: { "Retry-After": String(Math.max(minute.retryAfter, day.retryAfter)) } },
  );
}

export async function readRsvpJson(request: Request, maxBytes = 500_000): Promise<unknown> {
  try {
    return await readJson(request, maxBytes);
  } catch {
    throw new RsvpHttpError("That request was too large or not valid JSON.", 400);
  }
}

export function rsvpErrorResponse(error: unknown): Response {
  if (error instanceof RsvpHttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof RsvpConfigError) {
    return Response.json({ error: "RSVP hosting is not configured on this deployment." }, { status: 503 });
  }
  console.error("RSVP request failed", error instanceof Error ? error.message : "unknown");
  return Response.json({ error: "The RSVP service is unavailable. Please try again later." }, { status: 503 });
}

export function publicOrigin(request: Request): string {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
