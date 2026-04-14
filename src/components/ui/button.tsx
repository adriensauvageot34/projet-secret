import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/formatting";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-950 transition hover:opacity-90 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
