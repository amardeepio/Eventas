import { describe, expect, it } from "vitest";
import { POST as publish } from "./publish/route";
import { GET as readGuest, POST as reply } from "./[token]/route";
import { GET as manage } from "./manage/route";
import { POST as links } from "./links/route";
import { POST as revoke } from "./revoke/route";

function request(path: string, body?: unknown, headers?: Record<string, string>) {
  return new Request(`https://eventas.test${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.77", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("RSVP route contracts", () => {
  it("rejects malformed publish, reply, link, and revoke payloads", async () => {
    expect((await publish(request("/api/rsvp/publish", {}))).status).toBe(400);
    expect((await reply(request("/api/rsvp/token", {}), { params: Promise.resolve({ token: "bad" }) })).status).toBe(410);
    expect((await links(request("/api/rsvp/links", {}))).status).toBe(400);
    expect((await revoke(request("/api/rsvp/revoke", {}))).status).toBe(400);
    expect((await manage(request("/api/rsvp/manage"))).status).toBe(400);
  });

  it("rejects an invalid guest token before touching Firestore", async () => {
    const response = await readGuest(request("/api/rsvp/bad"), { params: Promise.resolve({ token: "bad" }) });
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/expired|valid/i) });
  });
});
