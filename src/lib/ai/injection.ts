/**
 * Lightweight, server-side prompt-injection tripwire for chat messages.
 * This is defence in depth: prompts also delimit and label user text as data.
 * It intentionally blocks attempts to change the assistant's role or extract
 * instructions, not ordinary questions that happen to use words like "ignore".
 */
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b.{0,60}\b(previous|prior|above|earlier|system|developer|all)\b.{0,40}\b(instruction|instructions|prompt|prompts|rule|rules|direction|directions)\b/i,
  /\b(reveal|show|print|repeat|leak|expose|output)\b.{0,40}\b(system|developer|hidden|initial|internal|secret)\b.{0,30}\b(prompt|instruction|instructions|message|messages|rule|rules)\b/i,
  /\b(system prompt|developer message|hidden instructions|jailbreak|prompt injection|dan mode|developer mode)\b/i,
  /\b(you are now|from now on you are|act as (a |an )?(system|developer|admin|administrator|unrestricted|dan))\b/i,
  /\b(api key|environment variable|secret key|groq_api_key|access token)\b/i,
  /\b(repeat|print|output)\b.{0,30}\b(everything|all text|the text|words)\b.{0,25}\b(above|before)\b/i,
  /<\|(im_start|im_end|system|endoftext)\|>/i,
  /```(system|developer)\b/i,
];

export const SAFE_REFUSAL =
  "I can’t reveal internal instructions or change how I operate. I’m here to help with Eventas planning, budgets, timelines, vendors, ideas, or how your data is stored.";

export function detectPromptInjection(input: string): boolean {
  const normalized = input.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!normalized) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Scan every turn because a client can forge an "assistant" message too. */
export function hasPromptInjection(messages: Array<{ role: string; content: string }>): boolean {
  return messages.some((message) => detectPromptInjection(message.content));
}

export function latestUserMessage(messages: Array<{ role: string; content: string }>): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user") return message.content;
  }
  return "";
}
