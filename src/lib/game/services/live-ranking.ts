import type { Participant } from "@/types/domain";

export type RankingParticipant = Pick<Participant, "id" | "display_name" | "current_score" | "current_tokens">;

export type LiveRankingEntry = {
  participantId: string;
  displayName: string;
  currentScore: number;
  currentTokens: number;
  position: number;
};

export type LocalRankingWindow = {
  above: LiveRankingEntry | null;
  self: LiveRankingEntry;
  below: LiveRankingEntry | null;
};

export function buildLiveRanking(participants: RankingParticipant[]): LiveRankingEntry[] {
  const sorted = [...participants].sort((a, b) => {
    if (b.current_score !== a.current_score) {
      return b.current_score - a.current_score;
    }

    const displayNameOrder = a.display_name.localeCompare(b.display_name);
    if (displayNameOrder !== 0) {
      return displayNameOrder;
    }

    return a.id.localeCompare(b.id);
  });

  return sorted.map((participant, index) => ({
    participantId: participant.id,
    displayName: participant.display_name,
    currentScore: participant.current_score,
    currentTokens: participant.current_tokens,
    position: index + 1,
  }));
}

export function buildLocalRankingWindow(ranking: LiveRankingEntry[], participantId: string): LocalRankingWindow | null {
  const index = ranking.findIndex((entry) => entry.participantId === participantId);

  if (index < 0) {
    return null;
  }

  return {
    above: index > 0 ? ranking[index - 1] : null,
    self: ranking[index],
    below: index < ranking.length - 1 ? ranking[index + 1] : null,
  };
}
