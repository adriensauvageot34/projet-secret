import { NextResponse } from "next/server";
import { finishSessionForMvp } from "@/lib/game/services/finish-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId: string };
    const session = await finishSessionForMvp(body.sessionId);
    return NextResponse.json({ ok: true, data: session });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown session finish error",
      },
      { status: 400 },
    );
  }
}
