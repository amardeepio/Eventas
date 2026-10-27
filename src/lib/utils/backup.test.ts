import { describe, expect, it, vi } from "vitest";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";
import { backupFilename, downloadBackup, MAX_BACKUP_BYTES, parseBackupText } from "./backup";

const plan = buildPlan(getSampleBrief("birthday"));

function backup() {
  return {
    app: "eventas" as const,
    kind: "backup" as const,
    version: 1 as const,
    exportedAt: "2026-10-27T10:00:00.000Z",
    workspace: { version: 1 as const, activePlanId: plan.id, plans: [plan] },
  };
}

describe("backup files", () => {
  it("round-trips a valid workspace backup", () => {
    const parsed = parseBackupText(JSON.stringify(backup()));
    expect(parsed.workspace.plans[0]?.brief.title).toContain("Rina");
    expect(backupFilename(parsed)).toBe("rina-s-40th-birthday-backup-2026-10-27.eventas.json");
  });

  it("rejects malformed, oversized, and unrelated files", () => {
    expect(() => parseBackupText("{")).toThrow("valid JSON");
    expect(() => parseBackupText("x".repeat(MAX_BACKUP_BYTES + 1))).toThrow("10 MB");
    expect(() => parseBackupText(JSON.stringify({ hello: "world" }))).toThrow("Eventas backup");
  });

  it("downloads a JSON blob", () => {
    let name = "";
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download;
    });
    const create = vi.fn(() => "blob:eventas");
    const revoke = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    downloadBackup(backup());
    expect(create).toHaveBeenCalled();
    expect(name).toContain(".eventas.json");
    click.mockRestore();
  });
});
