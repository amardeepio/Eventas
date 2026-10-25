"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Check, CheckCircle2, Circle, Clock3, Plus, X } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { findFunction } from "@/lib/domain/functions";
import { daysUntil, formatDate } from "@/lib/utils/format";
import type { Task } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

export function TimelineView() {
  const { plan, updatePlan } = usePlan();
  const [filter, setFilter] = useState<"open" | "all" | "done">("open");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [phase, setPhase] = useState("My tasks");
  const [taskFunctionId, setTaskFunctionId] = useState("");
  const [error, setError] = useState("");
  const phases = useMemo(() => plan ? [...new Set(plan.timeline.map((task) => task.phase))] : [], [plan]);
  if (!plan) return null;
  const completed = plan.timeline.filter((task) => task.status === "done").length;
  const visible = plan.timeline.filter((task) => {
    if (filter === "all") {
      // keep everything
    } else if (filter === "done" && task.status !== "done") return false;
    else if (filter === "open" && task.status === "done") return false;
    if (functionFilter !== "all" && task.functionId !== functionFilter) return false;
    return true;
  });
  const groups = visible.reduce<Map<string, Task[]>>((map, task) => {
    map.set(task.phase, [...(map.get(task.phase) ?? []), task]);
    return map;
  }, new Map());

  function toggle(task: Task) {
    updatePlan((current) => ({ ...current, timeline: current.timeline.map((item) => item.id === task.id ? { ...item, status: item.status === "done" ? "todo" : "done" } : item) }));
  }
  function addTask() {
    if (title.trim().length < 2 || !dueDate) { setError("Add a task name and due date."); return; }
    const task: Task = { id: crypto.randomUUID(), title: title.trim(), description: "Added by you.", dueDate, phase, owner: "You", status: "todo", priority: "normal", functionId: taskFunctionId || undefined };
    updatePlan((current) => ({ ...current, timeline: [...current.timeline, task].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }));
    setTitle(""); setDueDate(""); setAdding(false); setError(""); setTaskFunctionId("");
  }

  return <div className="space-y-6">
    <section className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center"><Card className="p-6 sm:p-7"><div className="flex items-center gap-6"><div className="relative grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-sage) ${completed / plan.timeline.length * 360}deg, var(--color-soft) 0deg)` }} role="img" aria-label={`${completed} of ${plan.timeline.length} tasks complete`}><div className="grid size-[62px] place-items-center rounded-full bg-paper font-display text-xl">{Math.round(completed / plan.timeline.length * 100)}%</div></div><div><Eyebrow>One thing at a time</Eyebrow><h2 className="mt-2 font-display text-3xl font-medium">{plan.timeline.length - completed} milestones ahead</h2><p className="mt-1 text-xs text-muted">{completed} complete · Ordered around {formatDate(plan.brief.date)}</p></div></div></Card><Button size="lg" onClick={() => setAdding((value) => !value)} aria-expanded={adding}>{adding ? <X size={17} /> : <Plus size={17} />}{adding ? "Close" : "Add a task"}</Button></section>

    {adding && <Card className="animate-rise border-clay/25 p-6"><h2 className="font-display text-2xl font-medium">Add your own milestone</h2><div className="mt-5 grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-end"><Field label="Task" htmlFor="new-task"><Input id="new-task" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Confirm the rehearsal" /></Field><Field label="Due date" htmlFor="new-date"><Input id="new-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field><Field label="Phase" htmlFor="new-phase"><Select id="new-phase" value={phase} onChange={(event) => setPhase(event.target.value)}><option>My tasks</option>{phases.map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Function" htmlFor="new-function"><Select id="new-function" value={taskFunctionId} onChange={(event) => setTaskFunctionId(event.target.value)}><option value="">Whole wedding</option>{plan.functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Button onClick={addTask}><CalendarPlus size={16} /> Add</Button></div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</Card>}

    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><div className="flex rounded-full border border-line bg-paper p-1" role="group" aria-label="Filter tasks">{(["open", "all", "done"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={cn("min-h-9 rounded-full px-4 text-xs font-semibold capitalize", filter === item ? "bg-ink text-white" : "text-muted")}>{item}</button>)}</div>{plan.functions.length > 1 && <Select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)} aria-label="Filter by function" className="w-44 py-2 text-xs"><option value="all">All functions</option>{plan.functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}</div><p className="text-xs text-muted">{visible.length} shown</p></div>

    {groups.size === 0 ? <Card className="p-12 text-center"><CheckCircle2 className="mx-auto text-sage" size={34} /><h2 className="mt-4 font-display text-3xl">Nothing in this view.</h2><p className="mt-2 text-sm text-muted">Try another filter or add a task of your own.</p></Card> : <div className="space-y-6">{[...groups.entries()].map(([group, tasks]) => <section key={group} aria-labelledby={`phase-${group.replace(/\W/g, "")}`}><div className="mb-3 flex items-center gap-3"><h2 id={`phase-${group.replace(/\W/g, "")}`} className="font-display text-xl font-medium">{group}</h2><span className="h-px flex-1 bg-line" /><span className="text-[10px] font-bold tracking-wider text-muted uppercase">{tasks.length} tasks</span></div><Card className="divide-y divide-line overflow-hidden">{tasks.map((task) => { const taskDays = daysUntil(task.dueDate); const overdue = taskDays < 0 && task.status !== "done"; const today = taskDays === 0 && task.status !== "done"; const soon = taskDays > 0 && taskDays <= 14 && task.status !== "done"; const taskFunction = findFunction(plan.functions, task.functionId); return <article key={task.id} className={cn("flex gap-4 p-5 sm:px-6", task.status === "done" && "bg-bone/40")}><button onClick={() => toggle(task)} aria-label={task.status === "done" ? `Reopen “${task.title}”` : `Mark “${task.title}” complete`} className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full transition", task.status === "done" ? "text-sage" : "text-muted hover:bg-[#e8ede6] hover:text-sage")}>{task.status === "done" ? <CheckCircle2 size={22} /> : <Circle size={21} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={cn("text-sm font-semibold", task.status === "done" && "text-muted line-through")}>{task.title}</h3>{taskFunction && <Badge className="bg-bone font-normal">{taskFunction.name}</Badge>}{task.priority === "high" && task.status !== "done" && <Badge className="border-clay/20 bg-blush text-clay">Priority</Badge>}{overdue && <Badge className="border-red-200 bg-red-50 text-red-700">Do now</Badge>}{today && <Badge className="border-clay/20 bg-blush text-clay">Due today</Badge>}{soon && <Badge>Coming up</Badge>}</div><p className={cn("mt-1.5 text-xs leading-5 text-muted", task.status === "done" && "line-through")}>{task.description}</p><div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted"><span className="flex items-center gap-1.5"><Clock3 size={12} />{formatDate(task.dueDate)}</span><span>{task.owner}</span></div></div><Select value={task.status} onChange={(event) => updatePlan((current) => ({ ...current, timeline: current.timeline.map((item) => item.id === task.id ? { ...item, status: event.target.value as Task["status"] } : item) }))} aria-label={`Status for ${task.title}`} className="hidden w-28 px-3 py-2 text-xs sm:block"><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></Select></article>; })}</Card></section>)}</div>}
    <div className="flex items-center gap-2 text-xs text-muted"><Check size={14} className="text-sage" />Changes save automatically on this device.</div>
  </div>;
}
