import type { ReactNode } from "react";

export function Tabs({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function TabList({ children }: { children: ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

export function TabPanel({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
