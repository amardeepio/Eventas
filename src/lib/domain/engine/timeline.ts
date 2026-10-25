import type { Brief, DomainPack, Task, WeddingFunction } from "../types";
import { addDays, parseISODate, toISODate } from "@/lib/utils/format";
import { resolveFunctions } from "../functions";

/**
 * Converts relative phase templates into concrete, timezone-safe task dates.
 * Tasks can be anchored to a specific function (mehndi, sangeet, baraat) so a
 * multi-day wedding does not put every deadline on the ceremony date.
 */
export function generateTimeline(
  pack: DomainPack,
  brief: Brief,
  now = new Date(),
  functions?: WeddingFunction[],
): Task[] {
  const resolved = functions ?? resolveFunctions(brief);
  const eventDate = parseISODate(brief.date);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const tasks = pack.timeline.flatMap((phase) => {
    return phase.tasks.map((task, index) => {
      const anchor = task.functionKind
        ? resolved.find((item) => item.kind === task.functionKind)
        : undefined;
      const anchorDate = anchor ? parseISODate(anchor.date) : eventDate;
      const target = addDays(anchorDate, -phase.weeksBefore * 7);
      const due = target < today ? today : target;
      return {
        id: `${phase.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
        title: task.title,
        description: task.description,
        dueDate: toISODate(due),
        phase: phase.name,
        owner: task.owner ?? pack.terminology.host,
        status: "todo" as const,
        priority: task.priority ?? (target < today ? "high" as const : "normal" as const),
        functionId: anchor?.id,
      };
    });
  });

  // Stable sort by date preserves the pack's phase order for tasks clamped to today.
  return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
