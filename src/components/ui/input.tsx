import type { InputHTMLAttributes } from "react";
import { cn } from "@/utils/formatting";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2", className)} {...props} />;
}
