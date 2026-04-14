import type { HTMLAttributes } from "react";
import { cn } from "@/utils/formatting";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("rounded-full bg-slate-800 px-2 py-1 text-xs", className)} {...props} />;
}
