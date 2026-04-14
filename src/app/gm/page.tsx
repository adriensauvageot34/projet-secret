import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { GmSessionHeader } from "@/components/gm/gm-session-header";
import { GmParticipantList } from "@/components/gm/gm-participant-list";
import { GmLiveElements } from "@/components/gm/gm-live-elements";
import { GmAccusationsQueue } from "@/components/gm/gm-accusations-queue";
import { GmDecisionsPanel } from "@/components/gm/gm-decisions-panel";
import { GmScoreboard } from "@/components/gm/gm-scoreboard";

export default function GmPage() {
  return (
    <AppShell>
      <Header title="Console GM" subtitle="Pilotage de la session en direct" />
      <GmSessionHeader />
      <GmParticipantList />
      <GmLiveElements />
      <GmAccusationsQueue />
      <GmDecisionsPanel />
      <GmScoreboard />
    </AppShell>
  );
}
