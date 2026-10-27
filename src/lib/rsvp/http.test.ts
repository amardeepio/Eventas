import { describe, expect, it } from "vitest";
import { checkRsvpRateLimit, publicOrigin, readRsvpJson, rsvpErrorResponse } from "./http";
import { RsvpHttpError } from "./store";
import { RsvpConfigError } from "./token";

describe("RSVP HTTP helpers", () => {
  it("reads bounded JSON and maps errors", async () => {
    const request = new Request("https://eventas.test/api", { method: "POST", body: JSON.stringify({ hello: "world" }) });
    await expect(readRsvpJson(request)).resolves.toEqual({ hello: "world" });
    await expect(readRsvpJson(new Request("https://eventas.test", { method: "POST", body: "{" }))).rejects.toMatchObject({ status: 400 });

    const forbidden = rsvpErrorResponse(new RsvpHttpError("No", 403));
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "No" });
    expect(rsvpErrorResponse(new RsvpConfigError("missing")).status).toBe(503);
    expect(rsvpErrorResponse(new Error("boom")).status).toBe(503);
  });

  it("derives the public origin behind a proxy", () => {
    const proxied = new Request("http://internal:8080/api", { headers: { "x-forwarded-host": "eventas.test", "x-forwarded-proto": "https" } });
    expect(publicOrigin(proxied)).toBe("https://eventas.test");
    expect(publicOrigin(new Request("https://eventas.test/api"))).toBe("https://eventas.test");
  });

  it("rate-limits a burst", () => {
    const request = new Request("https://eventas.test/api", { headers: { "x-forwarded-for": "203.0.113.9" } });
    let blocked = false;
    for (let index = 0; index < 50 && !blocked; index += 1) blocked = Boolean(checkRsvpRateLimit(request));
    expect(blocked).toBe(true);
  });
});
