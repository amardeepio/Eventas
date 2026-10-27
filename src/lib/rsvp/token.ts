import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface RsvpTokenPayload {
  planId: string;
  guestId: string;
  expiresAt: number;
}

export class RsvpConfigError extends Error {}

function secret(): string {
  const value = process.env.RSVP_SIGNING_SECRET;
  if (!value || value.length < 24) throw new RsvpConfigError("RSVP_SIGNING_SECRET is not configured.");
  return value;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function signRsvpToken(payload: RsvpTokenPayload): string {
  const body = base64url(JSON.stringify({ p: payload.planId, g: payload.guestId, e: payload.expiresAt }));
  return `${body}.${sign(body)}`;
}

export function verifyRsvpToken(token: string, now = Date.now()): RsvpTokenPayload | null {
  if (token.length > 600) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  // The token is public; an exact signature comparison is sufficient here.
  // Host keys are compared in constant time below.
  if (signature !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { p?: unknown; g?: unknown; e?: unknown };
    if (typeof parsed.p !== "string" || typeof parsed.g !== "string" || typeof parsed.e !== "number") return null;
    if (parsed.e < now) return null;
    return { planId: parsed.p, guestId: parsed.g, expiresAt: parsed.e };
  } catch {
    return null;
  }
}

export function deriveHostKey(planId: string): string {
  return createHmac("sha256", secret()).update(`host:${planId}`).digest("base64url");
}

export function verifyHostKey(planId: string, key: string): boolean {
  try {
    const expected = Buffer.from(deriveHostKey(planId));
    const provided = Buffer.from(key);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}
