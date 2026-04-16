import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getParticipantById } from "@/lib/db/queries/participants";
import { getLevelById, getLevelByNumber } from "@/lib/db/queries/levels";
import { listElementInstancesByParticipant } from "@/lib/db/queries/element-instances";
import { getActiveTemplates, getTemplatesForParticipant } from "@/lib/db/queries/element-templates";
import { getVisibleShopTemplatesForLevel } from "@/lib/db/queries/advantage-templates";
import { getParticipantAdvantageInventory } from "@/lib/db/queries/advantage-instances";
import { canParticipantBuyAdvantage } from "@/lib/game/rules/advantages";
import { buildVisibleReserveTemplates } from "@/lib/game/services/reserve-templates";
import { buildLiveRanking, buildLocalRankingWindow, type RankingParticipant } from "@/lib/game/services/live-ranking";

async function listSessionRankingParticipants(sessionId: string): Promise<RankingParticipant[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name, current_score, current_tokens")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(`Failed to load session ranking participants: ${error.message}`);
  }

  return (data ?? []) as RankingParticipant[];
}

async function listAccusationTargets(sessionId: string, selfParticipantId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name, role")
    .eq("session_id", sessionId)
    .neq("id", selfParticipantId)
    .neq("role", "gm")
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load accusation targets: ${error.message}`);
  }

  return (data ?? []).map((participant) => ({
    id: participant.id as string,
    displayName: participant.display_name as string,
  }));
}

export async function GET(_request: Request, context: { params: { participantId: string } }) {
  try {
    const participant = await getParticipantById(context.params.participantId);

    if (!participant) {
      return NextResponse.json({ ok: false, error: "Participant not found" }, { status: 404 });
    }

    const level = participant.current_level_id
      ? await getLevelById(participant.current_level_id)
      : await getLevelByNumber(1);

    if (!level) {
      return NextResponse.json({ ok: false, error: "Participant level not found" }, { status: 400 });
    }

    const [instances, templatesForLevel, inventory, shopTemplates, rankingParticipants, accusationTargets, activeTemplates] = await Promise.all([
      listElementInstancesByParticipant(participant.id),
      getTemplatesForParticipant(level.level_number),
      getParticipantAdvantageInventory(participant.id),
      getVisibleShopTemplatesForLevel(level.level_number),
      listSessionRankingParticipants(participant.session_id),
      listAccusationTargets(participant.session_id, participant.id),
      getActiveTemplates(),
    ]);

    const templatesById = new Map(templatesForLevel.map((template) => [template.id, template]));

    const activeElements = instances
      .filter((instance) => instance.state === "active")
      .map((instance) => {
        const template = templatesById.get(instance.element_template_id) ?? null;

        return {
          instance,
          template: template
            ? {
                id: template.id,
                name: template.name,
                code: template.code,
                elementType: template.element_type,
                validationMode: template.validation_mode,
              }
            : null,
        };
      });

    const reserveTemplates = buildVisibleReserveTemplates(templatesForLevel, level).map((template) => ({
      id: template.id,
      name: template.name,
      code: template.code,
      elementType: template.element_type,
      difficulty: template.difficulty,
      durationSeconds: template.duration_seconds,
      validationMode: template.validation_mode,
    }));

    const shop = shopTemplates.map((template) => {
      const check = canParticipantBuyAdvantage(
        template,
        level.level_number,
        participant.current_tokens,
        level.shop_tier_max,
      );

      return {
        template,
        canBuy: check.ok,
        reasons: check.reasons,
      };
    });

    const ranking = buildLiveRanking(rankingParticipants);
    const localRanking = buildLocalRankingWindow(ranking, participant.id);

    if (!localRanking) {
      throw new Error("Participant missing from session ranking");
    }

    const accusableTemplates = activeTemplates
      .filter((template) => template.element_type === "mission" || template.element_type === "constraint")
      .map((template) => ({
        id: template.id,
        name: template.name,
        elementType: template.element_type,
      }));

    return NextResponse.json({
      ok: true,
      data: {
        participant,
        level: {
          id: level.id,
          levelNumber: level.level_number,
          label: level.label,
          shopTierMax: level.shop_tier_max,
        },
        reserveTemplates,
        activeElements,
        shop,
        inventory,
        ranking: {
          self: localRanking.self,
          above: localRanking.above,
          below: localRanking.below,
        },
        accusationTargets,
        accusableTemplates,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown player runtime retrieval error",
      },
      { status: 400 },
    );
  }
}
