import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return <Link href={href} className={cn("group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay", className)} aria-label="Eventas home">
    <svg width="29" height="29" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 19.5C11.5 19.5 12 10 16 10C20 10 20.5 22 24 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="10" r="2.2" fill="#A5533D" />
    </svg>
    <span translate="no" className="font-display text-[25px] font-semibold tracking-[-.03em]">eventas<span className="text-clay">.</span></span>
  </Link>;
}
