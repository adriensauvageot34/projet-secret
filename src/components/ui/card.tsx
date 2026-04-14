import type { HTMLAttributes } from "react";
import { cn } from "@/utils/formatting";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-800 bg-panel p-4", className)} {...props} />;
}
