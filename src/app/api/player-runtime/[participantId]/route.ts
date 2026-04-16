import { NextResponse } from "next/server";
import { getParticipantById } from "@/lib/db/queries/participants";
import { getLevelById, getLevelByNumber } from "@/lib/db/queries/levels";
import { listElementInstancesByParticipant } from "@/lib/db/queries/element-instances";
import { getTemplatesForParticipant } from "@/lib/db/queries/element-templates";
import { getVisibleShopTemplatesForLevel } from "@/lib/db/queries/advantage-templates";
import { getParticipantAdvantageInventory } from "@/lib/db/queries/advantage-instances";
import { canParticipantBuyAdvantage } from "@/lib/game/rules/advantages";

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

    const [instances, templatesForLevel, inventory, shopTemplates] = await Promise.all([
      listElementInstancesByParticipant(participant.id),
      getTemplatesForParticipant(level.level_number),
      getParticipantAdvantageInventory(participant.id),
      getVisibleShopTemplatesForLevel(level.level_number),
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

    const reserveTemplates = templatesForLevel
      .filter((template) => template.can_appear_in_reserve && template.is_active)
      .map((template) => ({
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
