import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { GmDashboard } from "@/components/gm/gm-dashboard";

export default function GmPage() {
  return (
    <AppShell>
      <Header title="Console GM" subtitle="Pilotage de la session en direct" />
      <GmDashboard />
    </AppShell>
  );
}
