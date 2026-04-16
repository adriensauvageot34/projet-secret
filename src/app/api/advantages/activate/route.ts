import { NextResponse } from "next/server";
import { activateAdvantage } from "@/lib/game/services/activate-advantage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      advantageInstanceId: string;
      targetParticipantId?: string | null;
      targetElementInstanceId?: string | null;
    };

    const result = await activateAdvantage({
      advantageInstanceId: body.advantageInstanceId,
      targetParticipantId: body.targetParticipantId ?? null,
      targetElementInstanceId: body.targetElementInstanceId ?? null,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown advantage activation error",
      },
      { status: 400 },
    );
  }
}
