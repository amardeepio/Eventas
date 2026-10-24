import type { Plan } from "../domain/types";
import { formatDate, formatMoney } from "./format";

export function planToMarkdown(plan: Plan): string {
  const { brief } = plan;
  return `# ${brief.title}\n\n${brief.guests} guests · ${formatDate(brief.date)} · ${brief.location}\nBudget: ${formatMoney(brief.budget)}\n\n${plan.ai.headline}\n\n## Budget\n\n| Category | Planned | Actual |\n| --- | ---: | ---: |\n${plan.budget.map((item) => `| ${item.name} | ${formatMoney(item.planned)} | ${formatMoney(item.actual)} |`).join("\n")}\n\n## Timeline\n\n${plan.timeline.map((task) => `- [${task.status === "done" ? "x" : " "}] **${formatDate(task.dueDate)} — ${task.title}** (${task.phase})\n  ${task.description}`).join("\n")}\n\n## Vendor checklist\n\n${plan.vendors.map((vendor) => `### ${vendor.category} — ${vendor.status}\n${vendor.questions.map((question) => `- ${question}`).join("\n")}`).join("\n\n")}\n\n## Ideas\n\n${plan.ideas.filter((idea) => idea.saved).map((idea) => `- **${idea.title}**: ${idea.description}`).join("\n") || "No saved ideas yet."}\n\n---\nGenerated locally by Eventas. Vendor prices are planning estimates, not quotes.\n`;
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
