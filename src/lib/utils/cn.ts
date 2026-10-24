import { twMerge } from "tailwind-merge";

/** Joins conditional class names and resolves conflicting Tailwind utilities. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
