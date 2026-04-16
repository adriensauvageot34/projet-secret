import { NextResponse } from "next/server";
import { getGmRuntimeView } from "@/lib/game/services/get-gm-runtime-view";

export async function GET() {
  try {
    const data = await getGmRuntimeView();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown GM runtime retrieval error",
      },
      { status: 400 },
    );
  }
}
