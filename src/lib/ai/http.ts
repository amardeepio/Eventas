import { aiRateLimiter, dailyAiLimiter } from "@/lib/utils/rate-limit";

export function getRequestKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "local";
}

export function checkAiRateLimit(request: Request): Response | null {
  const ip = getRequestKey(request);
  const result = aiRateLimiter.check(ip);
  const daily = dailyAiLimiter.check("global");
  if (result.allowed && daily.allowed) return null;
  return Response.json(
    { error: "The planning assistant is taking a short breather. Please try again in a minute." },
    { status: 429, headers: { "Retry-After": String(Math.max(result.retryAfter, daily.retryAfter)) } },
  );
}

export async function readJson(request: Request, maxBytes = 250_000): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(text) as unknown;
}

export function badRequest(message = "Please check the plan details and try again."): Response {
  return Response.json({ error: message }, { status: 400 });
}
