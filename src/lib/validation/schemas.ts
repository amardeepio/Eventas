import { z } from "zod";
import { EVENT_TYPES, FUNCTION_KINDS, TRADITIONS } from "../domain/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
const clock = z.string().regex(/^$|^\d{2}:\d{2}$/, "Use a valid time");

export const muhuratSchema = z.object({
  date: isoDate,
  start: clock,
  end: clock,
  label: z.string().trim().min(1).max(100),
  source: z.string().trim().min(1).max(240),
}).strict();

export const functionDraftSchema = z.object({
  kind: z.enum(FUNCTION_KINDS),
  name: z.string().trim().min(1).max(80),
  date: isoDate,
  startTime: clock,
  endTime: clock,
  venue: z.string().trim().max(120),
  guestCount: z.number().int().min(1).max(100_000),
  dressCode: z.string().trim().max(80),
  hostSide: z.enum(["bride", "groom", "both"]),
}).strict();

export const briefSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  title: z.string().trim().min(2).max(100),
  hostNames: z.string().trim().min(2).max(100),
  date: isoDate,
  guests: z.number().int().min(1).max(100_000),
  budget: z.number().min(100).max(100_000_000),
  location: z.string().trim().min(2).max(120),
  costLevel: z.enum(["low", "average", "high"]),
  priorities: z.array(z.string().max(40)).min(1).max(3),
  vibe: z.string().min(1).max(40),
  notes: z.string().trim().max(1200),
  constraints: z.array(z.string().trim().max(100)).max(8),
  tradition: z.enum(TRADITIONS).default("none"),
  functions: z.array(functionDraftSchema).max(12).default([]),
  muhurat: muhuratSchema.optional(),
});

const budgetCategorySchema = z.object({
  id: z.string(), name: z.string(), recommended: z.number().nonnegative(),
  planned: z.number().nonnegative(), actual: z.number().nonnegative(),
  color: z.string(), description: z.string(), perGuest: z.boolean(),
  scaling: z.enum(["linear", "sublinear", "fixed"]).default("fixed"),
});
const taskSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), dueDate: z.string(),
  phase: z.string(), owner: z.string(), status: z.enum(["todo", "doing", "done"]),
  priority: z.enum(["high", "normal"]),
  functionId: z.string().optional(),
});
const vendorSchema = z.object({
  id: z.string(), category: z.string(), budgetCategoryId: z.string(),
  status: z.enum(["idea", "shortlisted", "contacted", "booked"]),
  quote: z.number().nonnegative(), notes: z.string().max(2000),
  questions: z.array(z.string()), redFlags: z.array(z.string()),
});
const ideaSchema = z.object({
  id: z.string(), kind: z.string(), title: z.string(), description: z.string(),
  cost: z.number().nonnegative(), tags: z.array(z.string()), saved: z.boolean(),
});
const weddingFunctionSchema = functionDraftSchema.extend({
  id: z.string(),
  budget: z.number().nonnegative(),
  status: z.enum(["planned", "booked", "done"]),
}).strict();

export const planSchema = z.object({
  version: z.literal(2), id: z.string(), createdAt: z.string(), brief: briefSchema,
  functions: z.array(weddingFunctionSchema).max(12),
  muhurat: muhuratSchema.nullable(),
  budget: z.array(budgetCategorySchema).max(40), timeline: z.array(taskSchema).max(160),
  vendors: z.array(vendorSchema).max(40), ideas: z.array(ideaSchema).max(30),
  ai: z.object({ headline: z.string(), insights: z.array(z.string()), mode: z.enum(["live", "demo"]) }),
});

export const ideaOutputSchema = z.object({
  kind: z.string().max(30).default("Concept"),
  title: z.string().max(100),
  description: z.string().max(600),
  cost: z.number().nonnegative().max(100_000_000).default(0),
  tags: z.array(z.string().max(30)).max(5).default([]),
});
export const aiPlanResponseSchema = z.object({
  headline: z.string().max(220),
  insights: z.array(z.string().max(500)).min(2).max(4),
  ideas: z.array(ideaOutputSchema).min(4).max(8),
  mode: z.enum(["live", "demo"]).optional(),
}).strict();
export const rebalanceResponseSchema = z.object({
  rationale: z.string().max(800),
  allocation: z.record(z.string(), z.number().nonnegative()),
  mode: z.enum(["live", "demo"]).optional(),
}).strict();
const chatMessagesSchema = z.array(z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
})).min(1).max(20);

export const assistantRequestSchema = z.object({ plan: planSchema, messages: chatMessagesSchema });
export const siteAssistantRequestSchema = z.object({ messages: chatMessagesSchema });
export const aiPlanRequestSchema = z.object({ plan: planSchema });
export const rebalanceRequestSchema = z.object({
  plan: planSchema,
  goal: z.string().trim().min(2).max(500),
});

const nullableText = (max: number) => z.string().trim().max(max).nullish().transform((value) => value ?? undefined);
const nullableDate = isoDate.nullish().transform((value) => value ?? undefined);

const draftFunctionSchema = z.object({
  kind: z.enum(FUNCTION_KINDS),
  name: nullableText(80),
  date: nullableDate,
  startTime: z.string().max(12).nullish().transform((value) => value ?? undefined),
  endTime: z.string().max(12).nullish().transform((value) => value ?? undefined),
  venue: nullableText(120),
  guestCount: z.number().int().min(1).max(100_000).nullish().transform((value) => value ?? undefined),
  dressCode: nullableText(80),
  hostSide: nullableText(20),
}).strict();

const draftMuhuratSchema = z.object({
  date: isoDate,
  start: z.string().max(12).nullish().transform((value) => value ?? ""),
  end: z.string().max(12).nullish().transform((value) => value ?? ""),
  label: z.string().trim().max(100).nullish().transform((value) => value ?? "Muhurat"),
  source: z.string().trim().max(240).nullish().transform((value) => value ?? "Entered by you"),
}).strict();

export const weddingDraftSchema = z.object({
  tradition: z.enum(TRADITIONS).nullish().transform((value) => value ?? "north-hindu"),
  title: nullableText(100),
  hostNames: nullableText(100),
  date: nullableDate,
  guests: z.number().int().min(1).max(100_000).nullish().transform((value) => value ?? undefined),
  budget: z.number().min(100).max(100_000_000).nullish().transform((value) => value ?? undefined),
  location: nullableText(120),
  costLevel: z.enum(["low", "average", "high"]).nullish().transform((value) => value ?? undefined),
  priorities: z.array(z.string().max(40)).max(3).nullish().transform((value) => value ?? []),
  vibe: z.string().max(40).nullish().transform((value) => value ?? undefined),
  notes: z.string().max(1200).nullish().transform((value) => value ?? ""),
  constraints: z.array(z.string().max(100)).max(8).nullish().transform((value) => value ?? []),
  functions: z.array(draftFunctionSchema).max(8).nullish().transform((value) => value ?? []),
  muhurat: draftMuhuratSchema.nullish().transform((value) => value ?? null),
  assumptions: z.array(z.string().max(240)).max(6).nullish().transform((value) => value ?? []),
  questions: z.array(z.string().max(240)).max(3).nullish().transform((value) => value ?? []),
}).strict();

export const weddingDraftRequestSchema = z.object({
  message: z.string().trim().min(2).max(2000),
  current: briefSchema.partial().optional(),
});

export const draftMessageRequestSchema = z.object({
  plan: planSchema,
  vendorId: z.string().trim().min(1).max(50),
  intent: z.string().trim().max(300).optional(),
});

export const draftMessageResponseSchema = z.object({
  body: z.string().trim().min(20).max(1400),
}).strict();

export type AiPlanResponse = z.infer<typeof aiPlanResponseSchema>;
export type RebalanceResponse = z.infer<typeof rebalanceResponseSchema>;
export type WeddingDraft = z.infer<typeof weddingDraftSchema>;
export type DraftMessageResponse = z.infer<typeof draftMessageResponseSchema>;
