import { NextResponse } from "next/server";
import { cancelGMDecision } from "@/lib/game/services/gm-decisions";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const decision = await cancelGMDecision(payload);

    return NextResponse.json({ ok: true, data: decision });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
