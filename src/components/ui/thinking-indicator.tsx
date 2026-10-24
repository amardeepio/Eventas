import { cn } from "@/lib/utils/cn";

/** Animated "planner is thinking" state shared by both chat surfaces. */
export function ThinkingIndicator({ label = "Eventas is thinking", className }: { label?: string; className?: string }) {
  return <div role="status" aria-label={label} className={cn("flex items-center gap-2.5 py-1", className)}>
    <span className="relative grid size-6 shrink-0 place-items-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-2 border-clay/20" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-clay" />
      <span className="size-1.5 animate-pulse rounded-full bg-clay/60" />
    </span>
    <span className="text-[11px] font-medium text-muted">Thinking</span>
    <span className="flex gap-1" aria-hidden="true">
      <i className="typing-dot size-1.5 rounded-full bg-clay" />
      <i className="typing-dot size-1.5 rounded-full bg-clay" />
      <i className="typing-dot size-1.5 rounded-full bg-clay" />
    </span>
  </div>;
}
