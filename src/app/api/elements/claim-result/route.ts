import { NextResponse } from "next/server";
import { resolveElementClaim } from "@/lib/game/services/resolve-element-claim";
import type { ClaimedResult } from "@/lib/game/enums";
import { getElementInstanceById } from "@/lib/db/queries/element-instances";
import { getElementTemplateById } from "@/lib/db/queries/element-templates";
import { resolveExpiredElementInstance } from "@/lib/game/services/resolve-expired-elements";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      instanceId: string;
      claimedResult: ClaimedResult;
    };

    const autoResolvedExpiration = await resolveExpiredElementInstance(body.instanceId);
    if (autoResolvedExpiration) {
      return NextResponse.json({ ok: true, data: autoResolvedExpiration });
    }

    const instance = await getElementInstanceById(body.instanceId);
    if (!instance) {
      throw new Error("Element instance not found");
    }

    if (instance.ends_at && new Date(instance.ends_at).getTime() <= Date.now()) {
      throw new Error("Element timer has expired");
    }

    const template = await getElementTemplateById(instance.element_template_id);
    if (!template) {
      throw new Error(`Element template not found for instance template ${instance.element_template_id}`);
    }

    if (template.element_type === "constraint" && body.claimedResult === "success") {
      throw new Error("Constraint elements cannot be manually claimed as success");
    }

    const result = await resolveElementClaim(body.instanceId, body.claimedResult);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown element claim error",
      },
      { status: 400 },
    );
  }
}
