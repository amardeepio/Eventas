import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-line/80 bg-paper shadow-[0_1px_2px_rgba(45,38,30,.03),0_12px_40px_rgba(45,38,30,.035)]", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[11px] font-bold tracking-[.18em] text-clay uppercase", className)} {...props} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-soft px-2.5 py-1 text-[11px] font-semibold text-muted", className)} {...props} />;
}
