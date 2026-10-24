import "server-only";
import type { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

interface ChatMessage { role: "system" | "user" | "assistant"; content: string }
interface GroqCompletion {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function generateJson<T>({
  system, user, schema, signal,
}: {
  system: string; user: string; schema: z.ZodType<T>; signal?: AbortSignal;
}): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 3500,
    }),
    signal: signal ?? AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`AI_PROVIDER_${response.status}`);
  const data = await response.json() as GroqCompletion;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI_EMPTY_RESPONSE");
  const parsed = schema.safeParse(JSON.parse(stripCodeFence(content)));
  if (!parsed.success) throw new Error(`AI_INVALID_SCHEMA: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`);
  return parsed.data;
}

export async function openAssistantStream(
  messages: ChatMessage[], signal: AbortSignal,
): Promise<Response> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: true, temperature: 0.5, max_tokens: 1200 }),
    signal,
    cache: "no-store",
  });
  if (!response.ok || !response.body) throw new Error(`AI_PROVIDER_${response.status}`);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const data = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
          const content = data.choices?.[0]?.delta?.content;
          if (content) controller.enqueue(encoder.encode(content));
        } catch { /* Ignore malformed keep-alive frames. */ }
      }
    },
  });
  return new Response(response.body.pipeThrough(transform), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function stripCodeFence(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}
