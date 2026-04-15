import { NextResponse } from "next/server";
import { resolveElementClaim } from "@/lib/game/services/resolve-element-claim";
import type { FinalResult } from "@/lib/game/enums";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      instanceId: string;
      finalResult: FinalResult;
    };

    const result = await resolveElementClaim(body.instanceId, body.finalResult);
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
