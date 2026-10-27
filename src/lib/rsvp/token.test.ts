import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deriveHostKey, RsvpConfigError, signRsvpToken, verifyHostKey, verifyRsvpToken } from "./token";

describe("RSVP signed links", () => {
  beforeEach(() => { process.env.RSVP_SIGNING_SECRET = "a-very-long-test-secret-value-123"; });
  afterEach(() => { delete process.env.RSVP_SIGNING_SECRET; });

  it("signs and verifies a guest token", () => {
    const token = signRsvpToken({ planId: "plan-12345678", guestId: "guest-1", expiresAt: Date.now() + 60_000 });
    expect(verifyRsvpToken(token)).toMatchObject({ planId: "plan-12345678", guestId: "guest-1" });
  });

  it("rejects tampered, malformed, and expired tokens", () => {
    const token = signRsvpToken({ planId: "plan-12345678", guestId: "guest-1", expiresAt: Date.now() + 60_000 });
    expect(verifyRsvpToken(`${token}x`)).toBeNull();
    expect(verifyRsvpToken("not-a-token")).toBeNull();
    expect(verifyRsvpToken("a".repeat(700))).toBeNull();
    const expired = signRsvpToken({ planId: "plan-12345678", guestId: "guest-1", expiresAt: Date.now() - 60_000 });
    expect(verifyRsvpToken(expired)).toBeNull();
  });

  it("derives and compares host keys in constant time", () => {
    const key = deriveHostKey("plan-12345678");
    expect(verifyHostKey("plan-12345678", key)).toBe(true);
    expect(verifyHostKey("plan-12345678", `${key}x`)).toBe(false);
    expect(verifyHostKey("plan-87654321", key)).toBe(false);
  });

  it("fails closed when the secret is missing", () => {
    delete process.env.RSVP_SIGNING_SECRET;
    expect(() => signRsvpToken({ planId: "p", guestId: "g", expiresAt: Date.now() })).toThrow(RsvpConfigError);
    expect(verifyRsvpToken("a.b")).toBeNull();
    expect(verifyHostKey("p", "x")).toBe(false);
  });
});
