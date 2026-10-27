export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const TRADITIONS = [
  "north-hindu",
  "punjabi-sikh",
  "gujarati",
  "rajasthani",
  "south-indian",
  "bengali",
  "marathi",
  "muslim",
  "christian",
  "interfaith",
  "other",
  "none",
] as const;
export type Tradition = (typeof TRADITIONS)[number];

export const FUNCTION_KINDS = [
  "roka",
  "engagement",
  "haldi",
  "mehndi",
  "sangeet",
  "baraat",
  "ceremony",
  "reception",
  "vidaai",
  "griha-pravesh",
  "custom",
] as const;
export type FunctionKind = (typeof FUNCTION_KINDS)[number];

export type CostLevel = "low" | "average" | "high";
export type TaskStatus = "todo" | "doing" | "done";
export type VendorStatus = "idea" | "shortlisted" | "contacted" | "booked";
export type FunctionStatus = "planned" | "booked" | "done";
export type HostSide = "bride" | "groom" | "both";
export type BudgetScaling = "linear" | "sublinear" | "fixed";
export type ItemSource = "generated" | "custom";
export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

/** A function as the host describes it in the brief. */
export interface FunctionDraft {
  /** Persisted so guest invites and run-sheet rows survive brief edits. */
  id?: string;
  kind: FunctionKind;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  guestCount: number;
  dressCode: string;
  hostSide: HostSide;
}

/** A function as it exists inside a built plan. */
export interface WeddingFunction extends FunctionDraft {
  id: string;
  budget: number;
  status: FunctionStatus;
}

export interface MuhuratWindow {
  date: string;
  start: string;
  end: string;
  label: string;
  source: string;
}

export interface GuestInvite {
  functionId: string;
  status: RsvpStatus;
  seats: number;
}

export interface GuestTravel {
  arriving: string;
  departing: string;
  needsPickup: boolean;
  needsHotel: boolean;
  roomPreference: string;
}

export interface Guest {
  id: string;
  name: string;
  side: HostSide;
  relationship: string;
  phone: string;
  email: string;
  city: string;
  dietary: string[];
  notes: string;
  invites: GuestInvite[];
  travel: GuestTravel;
}

export interface RunSheetEntry {
  id: string;
  functionId?: string;
  startTime: string;
  endTime: string;
  title: string;
  owner: string;
  location: string;
  contact: string;
  notes: string;
  source: ItemSource;
}

export interface RsvpShare {
  hostKey: string;
  publishedAt: string;
  expiresAt: string;
}

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
  tradition: Tradition;
  functions: FunctionDraft[];
  muhurat?: MuhuratWindow;
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
  scaling: BudgetScaling;
  source: ItemSource;
  plannedEdited: boolean;
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
  functionId?: string;
  source: ItemSource;
  edited: boolean;
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
  source: ItemSource;
  edited: boolean;
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
  version: 3;
  id: string;
  createdAt: string;
  archivedAt: string | null;
  brief: Brief;
  functions: WeddingFunction[];
  muhurat: MuhuratWindow | null;
  budget: BudgetCategory[];
  timeline: Task[];
  vendors: Vendor[];
  guests: Guest[];
  runSheet: RunSheetEntry[];
  dismissedTaskIds: string[];
  dismissedVendorIds: string[];
  ideas: Idea[];
  ai: AiEnrichment;
  rsvpShare: RsvpShare | null;
}

export interface BudgetWeight {
  id: string;
  label: string;
  weight: number;
  floor: number;
  color: string;
  description: string;
  perGuest?: boolean;
  scaling?: BudgetScaling;
}

export interface PhaseTemplate {
  name: string;
  weeksBefore: number;
  tasks: Array<{
    title: string;
    description: string;
    priority?: "high" | "normal";
    functionKind?: FunctionKind;
    owner?: string;
  }>;
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
  defaultTradition: Tradition;
  budget: BudgetWeight[];
  timeline: PhaseTemplate[];
  vendors: VendorTemplate[];
  priorities: Array<{ id: string; label: string }>;
  vibes: Array<{ id: string; label: string; description: string }>;
  ideas: Array<Omit<Idea, "id" | "cost" | "saved">>;
  sample: Omit<Brief, "date" | "functions" | "muhurat"> & { weeksFromNow: number; functionKinds?: FunctionKind[] };
}

export interface TraditionProfile {
  id: Tradition;
  label: string;
  shortLabel: string;
  description: string;
  ceremonyLabel: string;
  ritualLead: string;
  functions: FunctionKind[];
  foodDefaults: string[];
  notes: string[];
}
