import { z } from "zod";
import { EVENT_TYPES } from "../domain/types";

export const briefSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  title: z.string().trim().min(2).max(100),
  hostNames: z.string().trim().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  guests: z.number().int().min(1).max(100_000),
  budget: z.number().min(100).max(100_000_000),
  location: z.string().trim().min(2).max(120),
  costLevel: z.enum(["low", "average", "high"]),
  priorities: z.array(z.string().max(40)).min(1).max(3),
  vibe: z.string().min(1).max(40),
  notes: z.string().trim().max(1200),
  constraints: z.array(z.string().trim().max(100)).max(8),
});

const budgetCategorySchema = z.object({
  id: z.string(), name: z.string(), recommended: z.number().nonnegative(),
  planned: z.number().nonnegative(), actual: z.number().nonnegative(),
  color: z.string(), description: z.string(), perGuest: z.boolean(),
});
const taskSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), dueDate: z.string(),
  phase: z.string(), owner: z.string(), status: z.enum(["todo", "doing", "done"]),
  priority: z.enum(["high", "normal"]),
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
export const planSchema = z.object({
  version: z.literal(1), id: z.string(), createdAt: z.string(), brief: briefSchema,
  budget: z.array(budgetCategorySchema).max(30), timeline: z.array(taskSchema).max(100),
  vendors: z.array(vendorSchema).max(30), ideas: z.array(ideaSchema).max(30),
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
});
export const rebalanceResponseSchema = z.object({
  rationale: z.string().max(800),
  allocation: z.record(z.string(), z.number().nonnegative()),
});
export const assistantRequestSchema = z.object({
  plan: planSchema,
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
  })).min(1).max(20),
});
export const aiPlanRequestSchema = z.object({ plan: planSchema });
export const rebalanceRequestSchema = z.object({
  plan: planSchema,
  goal: z.string().trim().min(2).max(500),
});

export type AiPlanResponse = z.infer<typeof aiPlanResponseSchema>;
export type RebalanceResponse = z.infer<typeof rebalanceResponseSchema>;
