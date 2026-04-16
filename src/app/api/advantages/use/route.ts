import { NextResponse } from "next/server";
import { applyAdvantageUse } from "@/lib/game/services/advantage-instance-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      advantageInstanceId: string;
      context?: Record<string, unknown>;
      gmNotes?: string;
    };

    const instance = await applyAdvantageUse({
      advantageInstanceId: body.advantageInstanceId,
      context: body.context,
      gmNotes: body.gmNotes,
    });

    return NextResponse.json({ ok: true, instance }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown advantage use error",
      },
      { status: 400 },
    );
  }
}
