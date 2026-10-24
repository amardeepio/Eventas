import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const base = "w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/60 hover:border-muted/50 focus:border-clay focus:ring-4 focus:ring-clay/10 aria-invalid:border-red-600";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, className)} {...props} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-28 resize-y", className)} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(base, "cursor-pointer", className)} {...props} />;
});

export function Field({ label, hint, error, children, htmlFor }: {
  label: string; hint?: string; error?: string; htmlFor?: string; children: React.ReactNode;
}) {
  return <div className="space-y-2">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">{label}</label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
    {children}
    {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
  </div>;
}
