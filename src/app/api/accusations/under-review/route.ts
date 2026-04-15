import { NextResponse } from "next/server";
import { markAccusationUnderReview } from "@/lib/game/services/accusations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accusation = await markAccusationUnderReview(body);
    return NextResponse.json({ ok: true, data: accusation });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown accusation under_review error",
      },
      { status: 400 },
    );
  }
}
