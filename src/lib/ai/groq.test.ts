import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateJson, hasGroqKey, openAssistantStream } from "./groq";

const schema = z.object({ ok: z.boolean(), message: z.string() });

describe("Groq adapter", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-key";
    process.env.GROQ_MODEL = "test-model";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GROQ_API_KEY = "";
  });

  it("reports configuration without exposing the key", () => {
    expect(hasGroqKey()).toBe(true);
    process.env.GROQ_API_KEY = "";
    expect(hasGroqKey()).toBe(false);
  });

  it("parses fenced JSON and validates the schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "```json\n{\"ok\":true,\"message\":\"hello\"}\n```" } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateJson({ system: "s", user: "u", schema })).resolves.toEqual({ ok: true, message: "hello" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid model output rather than trusting it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "{\"ok\":\"yes\"}" } }],
    }), { status: 200 })));
    await expect(generateJson({ system: "s", user: "u", schema })).rejects.toThrow("AI_INVALID_SCHEMA");
  });

  it("surfaces provider errors without leaking a payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(generateJson({ system: "s", user: "u", schema })).rejects.toThrow("AI_PROVIDER_500");
  });

  it("streams only assistant text from SSE frames", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: {\"choices\":[{\"delta\":{\"content\":\"Hello \"}}]}\n\n"));
        controller.enqueue(encoder.encode("data: {\"choices\":[{\"delta\":{\"content\":\"world\"}}]}\n\n"));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const response = await openAssistantStream([{ role: "user", content: "hi" }], new AbortController().signal);
    await expect(response.text()).resolves.toBe("Hello world");
  });

  it("requires a key before calling the network", async () => {
    process.env.GROQ_API_KEY = "";
    await expect(openAssistantStream([{ role: "user", content: "hi" }], new AbortController().signal)).rejects.toThrow("AI_NOT_CONFIGURED");
  });
});
