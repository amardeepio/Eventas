import type { Plan } from "../domain/types";
import { formatDate, formatMoney } from "./format";
import { formatMuhuratTime } from "../domain/muhurat";

export function planToMarkdown(plan: Plan): string {
  const { brief } = plan;
  const functions = plan.functions.length
    ? `## Functions\n\n${plan.functions.map((item) => `- **${item.name}** — ${formatDate(item.date)}, ${item.startTime || "TBC"}–${item.endTime || "TBC"} · ${item.venue || "Venue TBC"} · ${item.guestCount} guests · ${formatMoney(item.budget)} target`).join("\n")}\n\n`
    : "";
  const muhurat = plan.muhurat
    ? `## Muhurat\n\n${formatDate(plan.muhurat.date)} · ${formatMuhuratTime(plan.muhurat)} · ${plan.muhurat.label}\n\n${plan.muhurat.source}\n\n`
    : "";
  return `# ${brief.title}\n\n${brief.guests} guests · ${formatDate(brief.date)} · ${brief.location}\nBudget: ${formatMoney(brief.budget)}\n\n${plan.ai.headline}\n\n${muhurat}${functions}## Budget\n\n| Category | Planned | Actual |\n| --- | ---: | ---: |\n${plan.budget.map((item) => `| ${item.name} | ${formatMoney(item.planned)} | ${formatMoney(item.actual)} |`).join("\n")}\n\n## Timeline\n\n${plan.timeline.map((task) => `- [${task.status === "done" ? "x" : " "}] **${formatDate(task.dueDate)} — ${task.title}** (${task.phase})${task.functionId ? ` · ${plan.functions.find((item) => item.id === task.functionId)?.name ?? ""}` : ""}\n  ${task.description}`).join("\n")}\n\n## Vendor checklist\n\n${plan.vendors.map((vendor) => `### ${vendor.category} — ${vendor.status}${vendor.quote ? ` · ${formatMoney(vendor.quote)} quoted` : ""}\n${vendor.questions.map((question) => `- ${question}`).join("\n")}${vendor.notes ? `\n\nNotes: ${vendor.notes}` : ""}`).join("\n\n")}\n\n## Ideas\n\n${plan.ideas.filter((idea) => idea.saved).map((idea) => `- **${idea.title}**: ${idea.description}`).join("\n") || "No saved ideas yet."}\n\n---\nGenerated locally by Eventas. Vendor prices are planning estimates, not quotes. Confirm muhurat, legal, tax, and permit details with the right authority.\n`;
}

export function downloadPlan(plan: Plan): void {
  const blob = new Blob([planToMarkdown(plan)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${plan.brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-plan.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
