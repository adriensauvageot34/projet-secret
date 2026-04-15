import { NextResponse } from "next/server";
import { getScoreEventById } from "@/lib/db/queries/score-events";

export async function GET(_: Request, context: { params: { scoreEventId: string } }) {
  try {
    const event = await getScoreEventById(context.params.scoreEventId);

    if (!event) {
      return NextResponse.json({ ok: false, error: "Score event not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: event });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown score event detail error",
      },
      { status: 400 },
    );
  }
}
