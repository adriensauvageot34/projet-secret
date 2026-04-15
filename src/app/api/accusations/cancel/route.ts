import { NextResponse } from "next/server";
import { cancelAccusation } from "@/lib/game/services/accusations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accusation = await cancelAccusation(body);
    return NextResponse.json({ ok: true, data: accusation });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown accusation cancel error",
      },
      { status: 400 },
    );
  }
}
