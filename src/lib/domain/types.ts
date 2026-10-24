export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type CostLevel = "low" | "average" | "high";
export type TaskStatus = "todo" | "doing" | "done";
export type VendorStatus = "idea" | "shortlisted" | "contacted" | "booked";

export interface Brief {
  eventType: EventType;
  title: string;
  hostNames: string;
  date: string;
  guests: number;
  budget: number;
  location: string;
  costLevel: CostLevel;
  priorities: string[];
  vibe: string;
  notes: string;
  constraints: string[];
}

export interface BudgetCategory {
  id: string;
  name: string;
  recommended: number;
  planned: number;
  actual: number;
  color: string;
  description: string;
  perGuest: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  phase: string;
  owner: string;
  status: TaskStatus;
  priority: "high" | "normal";
}

export interface Vendor {
  id: string;
  category: string;
  budgetCategoryId: string;
  status: VendorStatus;
  quote: number;
  notes: string;
  questions: string[];
  redFlags: string[];
}

export interface Idea {
  id: string;
  kind: string;
  title: string;
  description: string;
  cost: number;
  tags: string[];
  saved: boolean;
}

export interface AiEnrichment {
  headline: string;
  insights: string[];
  mode: "live" | "demo";
}

export interface Plan {
  version: 1;
  id: string;
  createdAt: string;
  brief: Brief;
  budget: BudgetCategory[];
  timeline: Task[];
  vendors: Vendor[];
  ideas: Idea[];
  ai: AiEnrichment;
}

export interface BudgetWeight {
  id: string;
  label: string;
  weight: number;
  floor: number;
  color: string;
  description: string;
  perGuest?: boolean;
}

export interface PhaseTemplate {
  name: string;
  weeksBefore: number;
  tasks: Array<{ title: string; description: string; priority?: "high" | "normal" }>;
}

export interface VendorTemplate {
  id: string;
  label: string;
  budgetCategoryId: string;
  questions: string[];
  redFlags: string[];
}

export interface DomainPack {
  id: EventType;
  label: string;
  shortLabel: string;
  eyebrow: string;
  description: string;
  terminology: { eventDay: string; host: string; guest: string };
  defaultGuests: number;
  defaultBudget: number;
  horizonMonths: number;
  budget: BudgetWeight[];
  timeline: PhaseTemplate[];
  vendors: VendorTemplate[];
  priorities: Array<{ id: string; label: string }>;
  vibes: Array<{ id: string; label: string; description: string }>;
  ideas: Array<Omit<Idea, "id" | "cost" | "saved">>;
  sample: Omit<Brief, "date"> & { weeksFromNow: number };
}
