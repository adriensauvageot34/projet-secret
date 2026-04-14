import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-3 p-3">{children}</main>;
}
