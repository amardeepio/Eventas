"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, Circle, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { findFunction } from "@/lib/domain/functions";
import { daysUntil, formatDate } from "@/lib/utils/format";
import type { Task } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

const EMPTY_DRAFT = {
  title: "",
  description: "",
  dueDate: "",
  phase: "My tasks",
  owner: "You",
  priority: "normal" as Task["priority"],
  status: "todo" as Task["status"],
  functionId: "",
};

type TaskDraft = typeof EMPTY_DRAFT;

export function TimelineView() {
  const { plan, updatePlan } = usePlan();
  const [filter, setFilter] = useState<"open" | "all" | "done">("open");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const phases = useMemo(() => plan ? [...new Set(plan.timeline.map((task) => task.phase))] : [], [plan]);
  if (!plan) return null;

  const completed = plan.timeline.filter((task) => task.status === "done").length;
  const visible = plan.timeline.filter((task) => {
    if (filter === "done" && task.status !== "done") return false;
    if (filter === "open" && task.status === "done") return false;
    if (functionFilter !== "all" && task.functionId !== functionFilter) return false;
    return true;
  });
  const groups = visible.reduce<Map<string, Task[]>>((map, task) => {
    map.set(task.phase, [...(map.get(task.phase) ?? []), task]);
    return map;
  }, new Map());

  function toggle(task: Task) {
    updatePlan((current) => ({
      ...current,
      timeline: current.timeline.map((item) => item.id === task.id ? { ...item, status: item.status === "done" ? "todo" : "done" } : item),
    }));
  }

  function startAdd() {
    setEditingId("new");
    setDraft({ ...EMPTY_DRAFT, phase: phases[0] ?? "My tasks" });
    setError("");
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      phase: task.phase,
      owner: task.owner,
      priority: task.priority,
      status: task.status,
      functionId: task.functionId ?? "",
    });
    setError("");
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
  }

  function save() {
    if (draft.title.trim().length < 2 || !draft.dueDate) {
      setError("Add a task name and due date.");
      return;
    }
    const values = {
      title: draft.title.trim(),
      description: draft.description.trim() || "Added by you.",
      dueDate: draft.dueDate,
      phase: draft.phase.trim() || "My tasks",
      owner: draft.owner.trim() || "You",
      priority: draft.priority,
      status: draft.status,
      functionId: draft.functionId || undefined,
    };
    if (editingId === "new") {
      const task: Task = {
        id: globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}`,
        ...values,
        source: "custom",
        edited: false,
      };
      updatePlan((current) => ({ ...current, timeline: [...current.timeline, task].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }));
    } else if (editingId) {
      updatePlan((current) => ({
        ...current,
        timeline: current.timeline.map((item) => item.id === editingId ? { ...item, ...values, edited: true } : item),
      }));
    }
    closeEditor();
  }

  function remove(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    updatePlan((current) => ({
      ...current,
      timeline: current.timeline.filter((item) => item.id !== task.id),
      dismissedTaskIds: task.source === "generated" ? [...current.dismissedTaskIds, task.id] : current.dismissedTaskIds,
    }));
    if (editingId === task.id) closeEditor();
  }

  const editor = editingId !== null && <Card className="animate-rise border-clay/25 p-6">
    <div className="flex items-start justify-between gap-4">
      <div><Eyebrow>{editingId === "new" ? "New milestone" : "Edit milestone"}</Eyebrow><h2 className="mt-1 font-display text-2xl font-medium">{editingId === "new" ? "Add your own task" : "Keep this one accurate."}</h2></div>
      <Button variant="ghost" size="icon" onClick={closeEditor} aria-label="Close task editor"><X size={18} /></Button>
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Field label="Task" htmlFor="task-title"><Input id="task-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={160} placeholder="Confirm the rehearsal" /></Field>
      <Field label="Due date" htmlFor="task-date"><Input id="task-date" type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></Field>
      <Field label="Phase" htmlFor="task-phase"><Input id="task-phase" value={draft.phase} onChange={(event) => setDraft({ ...draft, phase: event.target.value })} maxLength={80} /></Field>
      <Field label="Owner" htmlFor="task-owner"><Input id="task-owner" value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} maxLength={80} placeholder="You, family, planner…" /></Field>
      <Field label="Function" htmlFor="task-function"><Select id="task-function" value={draft.functionId} onChange={(event) => setDraft({ ...draft, functionId: event.target.value })}><option value="">Whole event</option>{plan.functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Priority" htmlFor="task-priority"><Select id="task-priority" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Task["priority"] })}><option value="normal">Normal</option><option value="high">High</option></Select></Field>
      <Field label="Status" htmlFor="task-status"><Select id="task-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Task["status"] })}><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></Select></Field>
      <div className="md:col-span-2"><Field label="Notes" htmlFor="task-description"><Textarea id="task-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={1200} placeholder="What exactly needs to happen?" /></Field></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button onClick={save}><Check size={16} /> {editingId === "new" ? "Add task" : "Save changes"}</Button><Button variant="ghost" onClick={closeEditor}>Cancel</Button></div>
  </Card>;

  return <div className="space-y-6">
    <section className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center" data-tour="timeline-hero">
      <Card className="p-6 sm:p-7"><div className="flex items-center gap-6"><div className="relative grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-sage) ${completed / Math.max(1, plan.timeline.length) * 360}deg, var(--color-soft) 0deg)` }} role="img" aria-label={`${completed} of ${plan.timeline.length} tasks complete`}><div className="grid size-[62px] place-items-center rounded-full bg-paper font-display text-xl">{Math.round(completed / Math.max(1, plan.timeline.length) * 100)}%</div></div><div><Eyebrow>One thing at a time</Eyebrow><h2 className="mt-2 font-display text-3xl font-medium">{plan.timeline.length - completed} milestones ahead</h2><p className="mt-1 text-xs text-muted">{completed} complete · Ordered around {formatDate(plan.brief.date)}</p></div></div></Card>
      <Button size="lg" onClick={editingId === "new" ? closeEditor : startAdd} aria-expanded={editingId === "new"}>{editingId === "new" ? <X size={17} /> : <Plus size={17} />}{editingId === "new" ? "Close" : "Add a task"}</Button>
    </section>

    {editor}

    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><div className="flex rounded-full border border-line bg-paper p-1" role="group" aria-label="Filter tasks">{(["open", "all", "done"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={cn("min-h-9 rounded-full px-4 text-xs font-semibold capitalize", filter === item ? "bg-ink text-white" : "text-muted")}>{item}</button>)}</div>{plan.functions.length > 1 && <Select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)} aria-label="Filter by function" className="w-44 py-2 text-xs"><option value="all">All functions</option>{plan.functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}</div><p className="text-xs text-muted">{visible.length} shown</p></div>

    {groups.size === 0 ? <Card className="p-12 text-center"><CheckCircle2 className="mx-auto text-sage" size={34} /><h2 className="mt-4 font-display text-3xl">Nothing in this view.</h2><p className="mt-2 text-sm text-muted">Try another filter or add a task of your own.</p></Card> : <div className="space-y-6">{[...groups.entries()].map(([group, tasks]) => <section key={group} aria-labelledby={`phase-${group.replace(/\W/g, "")}`}><div className="mb-3 flex items-center gap-3"><h2 id={`phase-${group.replace(/\W/g, "")}`} className="font-display text-xl font-medium">{group}</h2><span className="h-px flex-1 bg-line" /><span className="text-[10px] font-bold tracking-wider text-muted uppercase">{tasks.length} tasks</span></div><Card className="divide-y divide-line overflow-hidden">{tasks.map((task) => { const taskDays = daysUntil(task.dueDate); const overdue = taskDays < 0 && task.status !== "done"; const today = taskDays === 0 && task.status !== "done"; const soon = taskDays > 0 && taskDays <= 14 && task.status !== "done"; const taskFunction = findFunction(plan.functions, task.functionId); return <article key={task.id} className={cn("flex gap-4 p-5 sm:px-6", task.status === "done" && "bg-bone/40")}><button onClick={() => toggle(task)} aria-label={task.status === "done" ? `Reopen “${task.title}”` : `Mark “${task.title}” complete`} className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full transition", task.status === "done" ? "text-sage" : "text-muted hover:bg-[#e8ede6] hover:text-sage")}>{task.status === "done" ? <CheckCircle2 size={22} /> : <Circle size={21} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={cn("text-sm font-semibold", task.status === "done" && "text-muted line-through")}>{task.title}</h3>{taskFunction && <Badge className="bg-bone font-normal">{taskFunction.name}</Badge>}{task.priority === "high" && task.status !== "done" && <Badge className="border-clay/20 bg-blush text-clay">Priority</Badge>}{overdue && <Badge className="border-red-200 bg-red-50 text-red-700">Do now</Badge>}{today && <Badge className="border-clay/20 bg-blush text-clay">Due today</Badge>}{soon && <Badge>Coming up</Badge>}{task.source === "custom" && <Badge className="bg-bone font-normal">Yours</Badge>}</div><p className={cn("mt-1.5 text-xs leading-5 text-muted", task.status === "done" && "line-through")}>{task.description}</p><div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted"><span className="flex items-center gap-1.5"><Clock3 size={12} />{formatDate(task.dueDate)}</span><span>{task.owner}</span></div></div><div className="flex items-start gap-1"><Select value={task.status} onChange={(event) => updatePlan((current) => ({ ...current, timeline: current.timeline.map((item) => item.id === task.id ? { ...item, status: event.target.value as Task["status"] } : item) }))} aria-label={`Status for ${task.title}`} className="hidden w-28 px-3 py-2 text-xs sm:block"><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></Select><Button variant="ghost" size="icon" onClick={() => startEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task"><Pencil size={15} /></Button><Button variant="ghost" size="icon" onClick={() => remove(task)} aria-label={`Delete ${task.title}`} title="Delete task"><Trash2 size={15} /></Button></div></article>; })}</Card></section>)}</div>}
    <div className="flex items-center gap-2 text-xs text-muted"><Check size={14} className="text-sage" />Changes save automatically on this device.</div>
  </div>;
}
