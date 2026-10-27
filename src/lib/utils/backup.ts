import { backupSchema, type PlanBackup } from "../validation/schemas";

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export function parseBackupText(text: string): PlanBackup {
  if (text.length > MAX_BACKUP_BYTES) throw new Error("That backup is larger than 10 MB.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("That does not look like an Eventas backup. Choose the .eventas.json file you downloaded.");
  }
  return parsed.data;
}

export function backupFilename(backup: PlanBackup): string {
  const active = backup.workspace.plans.find((plan) => plan.id === backup.workspace.activePlanId) ?? backup.workspace.plans[0];
  const title = active?.brief.title ?? "eventas";
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "eventas";
  return `${slug}-backup-${backup.exportedAt.slice(0, 10)}.eventas.json`;
}

export function downloadBackup(backup: PlanBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupFilename(backup);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
