import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/formatting";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2", className)} {...props} />;
}
