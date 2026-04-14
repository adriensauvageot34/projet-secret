import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {children}
    </Card>
  );
}
