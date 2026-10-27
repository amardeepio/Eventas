import type { Plan } from "../domain/types";
import { parseStoredPlan } from "./migrate";
import { planSchema, revisionsSchema, workspaceSchema, type Workspace } from "../validation/schemas";
import { requestPersistentStorage, storageDelete, storageGet, storageSet } from "./db";

export const WORKSPACE_KEY = "eventas.workspace.v1";
export const REVISIONS_KEY = "eventas.revisions.v1";
const LEGACY_KEYS = ["eventas.plan.v2", "eventas.plan.v1"];
const MAX_REVISIONS = 10;

export function emptyWorkspace(): Workspace {
  return { version: 1, activePlanId: null, plans: [] };
}

export function parseWorkspace(raw: unknown): Workspace | null {
  const parsed = workspaceSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { version?: unknown; activePlanId?: unknown; plans?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.plans)) return null;
  // Keep every valid plan even if one archived plan is corrupt. A single bad
  // document must not take the whole workspace down.
  const plans = candidate.plans.map((item) => parseStoredPlan(item)).filter((item): item is Plan => Boolean(item));
  const activePlanId = typeof candidate.activePlanId === "string" && plans.some((plan) => plan.id === candidate.activePlanId)
    ? candidate.activePlanId
    : plans[0]?.id ?? null;
  return { version: 1, activePlanId, plans };
}

function clearLegacyKeys(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

export async function loadWorkspace(): Promise<Workspace> {
  const stored = await storageGet<unknown>(WORKSPACE_KEY);
  const parsed = stored ? parseWorkspace(stored) : null;
  if (parsed) {
    // A previous version may have left a stale copy behind after a successful
    // workspace write; never let it resurrect on the next migration attempt.
    clearLegacyKeys();
    return parsed;
  }

  if (typeof localStorage === "undefined") return emptyWorkspace();
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const plan = parseStoredPlan(JSON.parse(raw));
      if (plan) {
        const workspace: Workspace = { version: 1, activePlanId: plan.id, plans: [plan] };
        await storageSet(WORKSPACE_KEY, workspace);
        localStorage.removeItem(key);
        return workspace;
      }
      localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
  return emptyWorkspace();
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await storageSet(WORKSPACE_KEY, workspace);
}

export async function deleteWorkspace(): Promise<void> {
  await storageDelete(WORKSPACE_KEY);
  await storageDelete(REVISIONS_KEY);
}

export function upsertPlan(workspace: Workspace, plan: Plan): Workspace {
  const exists = workspace.plans.some((item) => item.id === plan.id);
  const plans = exists
    ? workspace.plans.map((item) => (item.id === plan.id ? plan : item))
    : [...workspace.plans, plan];
  return { ...workspace, activePlanId: workspace.activePlanId ?? plan.id, plans };
}

export async function loadRevisions(): Promise<Record<string, Plan[]>> {
  const raw = await storageGet<unknown>(REVISIONS_KEY);
  if (!raw) return {};
  const parsed = revisionsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export async function saveRevisions(revisions: Record<string, Plan[]>): Promise<void> {
  const pruned = Object.fromEntries(
    Object.entries(revisions).map(([id, plans]) => [id, plans.slice(-MAX_REVISIONS)]),
  );
  try {
    await storageSet(REVISIONS_KEY, pruned);
  } catch {
    // Revisions are a convenience; never block the actual plan save.
  }
}

export function addRevision(revisions: Record<string, Plan[]>, plan: Plan): Record<string, Plan[]> {
  return { ...revisions, [plan.id]: [...(revisions[plan.id] ?? []).slice(-(MAX_REVISIONS - 1)), plan] };
}

export async function maybePersistStorage(): Promise<boolean> {
  return requestPersistentStorage();
}

export function validatePlan(raw: unknown): Plan | null {
  const direct = planSchema.safeParse(raw);
  return direct.success ? direct.data : parseStoredPlan(raw);
}
