import type { Brief, DomainPack, Task } from "../types";
import { addDays, parseISODate, slugify, toISODate } from "@/lib/utils/format";

/** Converts relative phase templates into concrete, timezone-safe task dates. */
export function generateTimeline(pack: DomainPack, brief: Brief, now = new Date()): Task[] {
  const eventDate = parseISODate(brief.date);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tasks = pack.timeline.flatMap((phase) => {
    const target = addDays(eventDate, -phase.weeksBefore * 7);
    const due = target < today ? today : target;
    return phase.tasks.map((task, index) => ({
      id: `${slugify(phase.name)}-${slugify(task.title)}-${index}`,
      title: task.title,
      description: task.description,
      dueDate: toISODate(due),
      phase: phase.name,
      owner: pack.terminology.host,
      status: "todo" as const,
      priority: task.priority ?? (target < today ? "high" as const : "normal" as const),
    }));
  });

  // Stable sort by date preserves the pack's phase order for tasks clamped to today.
  return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
