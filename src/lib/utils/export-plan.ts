import type { Plan } from "../domain/types";
import { addDays, formatDate, formatMoney, toISODate } from "./format";
import { formatMuhuratTime } from "../domain/muhurat";
import { GUEST_CSV_HEADER, guestToCsvRow } from "../domain/guests";
import { serializeCsv } from "./csv";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(date: string) {
  return date.replaceAll("-", "");
}

function icsDateTime(date: string, time: string) {
  return `${icsDate(date)}T${time.replace(":", "")}00`;
}

function slug(plan: Plan) {
  return plan.brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "eventas-plan";
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number)[][]) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function planToCalendar(plan: Plan): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventas//Planning Studio//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const [index, fn] of plan.functions.entries()) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${plan.id}-function-${index}@eventas.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(fn.date)}`,
      `DTEND;VALUE=DATE:${icsDate(toISODate(addDays(new Date(`${fn.date}T00:00:00Z`), 1)))}`,
      `SUMMARY:${escapeIcs(fn.name)}`,
      `LOCATION:${escapeIcs(fn.venue || plan.brief.location)}`,
      `DESCRIPTION:${escapeIcs(`${fn.guestCount} guests · ${formatMoney(fn.budget)} target${fn.startTime ? ` · ${fn.startTime}–${fn.endTime}` : ""}`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`One week to ${fn.name}. Reconfirm vendors, guest count, and travel.`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  if (plan.muhurat) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${plan.id}-muhurat@eventas.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDateTime(plan.muhurat.date, plan.muhurat.start)}`,
      `DTEND:${icsDateTime(plan.muhurat.date, plan.muhurat.end)}`,
      `SUMMARY:${escapeIcs(`Muhurat · ${plan.muhurat.label}`)}`,
      `DESCRIPTION:${escapeIcs(`${formatMuhuratTime(plan.muhurat)}. ${plan.muhurat.source}. Confirm with your pandit.`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT3H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Confirm the muhurat window with your pandit and family.",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  for (const [index, task] of plan.timeline.entries()) {
    if (task.status === "done") continue;
    const functionName = plan.functions.find((item) => item.id === task.functionId)?.name;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${plan.id}-task-${index}@eventas.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(task.dueDate)}`,
      `DTEND;VALUE=DATE:${icsDate(toISODate(addDays(new Date(`${task.dueDate}T00:00:00Z`), 1)))}`,
      `SUMMARY:${escapeIcs(task.title)}`,
      `DESCRIPTION:${escapeIcs(`${task.phase}${functionName ? ` · ${functionName}` : ""} · ${task.priority} priority`)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`Due tomorrow: ${task.title}`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

export function planToBudgetCsv(plan: Plan): string {
  return toCsv([
    ["Category", "Suggested", "Planned", "Actual"],
    ...plan.budget.map((item) => [item.name, item.recommended, item.planned, item.actual]),
  ]);
}

export function planToTimelineCsv(plan: Plan): string {
  return toCsv([
    ["Task", "Phase", "Due date", "Status", "Priority", "Function"],
    ...plan.timeline.map((task) => [
      task.title,
      task.phase,
      task.dueDate,
      task.status,
      task.priority,
      plan.functions.find((item) => item.id === task.functionId)?.name ?? "",
    ]),
  ]);
}

export function downloadCalendar(plan: Plan): void {
  downloadText(`${slug(plan)}.ics`, planToCalendar(plan), "text/calendar;charset=utf-8");
}

export function downloadBudgetCsv(plan: Plan): void {
  downloadText(`${slug(plan)}-budget.csv`, planToBudgetCsv(plan), "text/csv;charset=utf-8");
}

export function downloadTimelineCsv(plan: Plan): void {
  downloadText(`${slug(plan)}-timeline.csv`, planToTimelineCsv(plan), "text/csv;charset=utf-8");
}

export function planToGuestCsv(plan: Plan): string {
  return serializeCsv([GUEST_CSV_HEADER, ...plan.guests.map((guest) => guestToCsvRow(plan, guest))]);
}

export function downloadGuestCsv(plan: Plan): void {
  downloadText(`${slug(plan)}-guests.csv`, planToGuestCsv(plan), "text/csv;charset=utf-8");
}

export function planToRunSheetCsv(plan: Plan): string {
  return serializeCsv([
    ["Function", "Start", "End", "Item", "Owner", "Location", "Contact", "Notes"],
    ...plan.runSheet.map((item) => [
      plan.functions.find((fn) => fn.id === item.functionId)?.name ?? "Whole event",
      item.startTime, item.endTime, item.title, item.owner, item.location, item.contact, item.notes,
    ]),
  ]);
}

export function downloadRunSheetCsv(plan: Plan): void {
  downloadText(`${slug(plan)}-run-sheet.csv`, planToRunSheetCsv(plan), "text/csv;charset=utf-8");
}


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

/**
 * Open the print-ready plan in a new tab. Every desktop and mobile browser
 * exposes "Save as PDF" in its print sheet, which keeps typography, Indic
 * scripts, and layout vector-sharp without bundling PDF fonts.
 */
export function downloadPlan(): void {
  const anchor = document.createElement("a");
  anchor.href = "/plan/print?auto=1";
  anchor.target = "_blank";
  anchor.rel = "noopener";
  anchor.click();
}
