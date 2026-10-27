import type { Plan, Task } from "./types";
import { daysUntil } from "../utils/format";

export interface ReminderBuckets {
  overdue: Task[];
  today: Task[];
  next7: Task[];
  later: Task[];
  done: number;
}

export function getReminderBuckets(plan: Plan, now = new Date()): ReminderBuckets {
  const buckets: ReminderBuckets = { overdue: [], today: [], next7: [], later: [], done: 0 };
  for (const task of plan.timeline) {
    if (task.status === "done") { buckets.done += 1; continue; }
    const days = daysUntil(task.dueDate, now);
    if (days < 0) buckets.overdue.push(task);
    else if (days === 0) buckets.today.push(task);
    else if (days <= 7) buckets.next7.push(task);
    else buckets.later.push(task);
  }
  const sort = (items: Task[]) => items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  sort(buckets.overdue); sort(buckets.today); sort(buckets.next7); sort(buckets.later);
  return buckets;
}

export function getWeeklyDigest(plan: Plan, now = new Date()) {
  const buckets = getReminderBuckets(plan, now);
  const open = plan.timeline.length - buckets.done;
  return {
    ...buckets,
    open,
    top: [...buckets.overdue, ...buckets.today, ...buckets.next7].slice(0, 3),
    message: buckets.overdue.length > 0
      ? `${buckets.overdue.length} overdue · ${buckets.today.length} due today · ${buckets.next7.length} this week`
      : buckets.today.length + buckets.next7.length > 0
        ? `${buckets.today.length + buckets.next7.length} milestone${buckets.today.length + buckets.next7.length === 1 ? "" : "s"} in the next seven days`
        : open > 0 ? "Nothing due this week. A good moment to get ahead." : "Every milestone is complete.",
  };
}
