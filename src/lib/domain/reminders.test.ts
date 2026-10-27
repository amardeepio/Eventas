import { describe, expect, it } from "vitest";
import { buildPlan } from "./engine/plan";
import { getSampleBrief } from "./packs";
import { getReminderBuckets, getWeeklyDigest } from "./reminders";
import { addDays, toISODate } from "../utils/format";

const now = new Date("2026-10-27T10:00:00Z");
const base = buildPlan(getSampleBrief("wedding"), now);

function withDates(dates: Array<[string, "todo" | "done"]>) {
  return {
    ...base,
    timeline: dates.map(([dueDate, status], index) => ({
      id: `task-${index}`,
      title: `Task ${index}`,
      description: "",
      dueDate,
      phase: "Test",
      owner: "You",
      status,
      priority: "normal" as const,
      source: "custom" as const,
      edited: false,
    })),
  };
}

describe("reminders", () => {
  it("splits overdue, today, this week, and later work", () => {
    const plan = withDates([
      [toISODate(addDays(now, -2)), "todo"],
      [toISODate(now), "todo"],
      [toISODate(addDays(now, 3)), "todo"],
      [toISODate(addDays(now, 20)), "todo"],
      [toISODate(now), "done"],
    ]);
    const buckets = getReminderBuckets(plan, now);
    expect(buckets.overdue).toHaveLength(1);
    expect(buckets.today).toHaveLength(1);
    expect(buckets.next7).toHaveLength(1);
    expect(buckets.later).toHaveLength(1);
    expect(buckets.done).toBe(1);
  });

  it("writes a weekly digest for each situation", () => {
    const overdue = getWeeklyDigest(withDates([[toISODate(addDays(now, -1)), "todo"]]), now);
    expect(overdue.message).toContain("overdue");
    expect(overdue.top).toHaveLength(1);

    const thisWeek = getWeeklyDigest(withDates([[toISODate(addDays(now, 2)), "todo"]]), now);
    expect(thisWeek.message).toContain("seven days");

    const clear = getWeeklyDigest(withDates([[toISODate(addDays(now, 30)), "todo"]]), now);
    expect(clear.message).toContain("Nothing due");

    const finished = getWeeklyDigest(withDates([[toISODate(now), "done"]]), now);
    expect(finished.message).toContain("complete");
  });
});
