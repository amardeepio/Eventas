import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props }, ref,
) {
  return <button ref={ref} type={type} className={cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-clay-dark hover:shadow-md",
    variant === "secondary" && "border border-line bg-paper text-ink hover:border-clay hover:bg-blush",
    variant === "ghost" && "text-muted hover:bg-soft hover:text-ink",
    variant === "danger" && "bg-red-50 text-red-800 hover:bg-red-100",
    size === "sm" && "min-h-9 px-3.5 text-xs",
    size === "md" && "px-5 text-sm",
    size === "lg" && "min-h-13 px-7 text-[15px]",
    size === "icon" && "size-11 p-0",
    className,
  )} {...props} />;
});
