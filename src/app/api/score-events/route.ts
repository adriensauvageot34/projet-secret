import { NextResponse } from "next/server";
import { listScoreEvents } from "@/lib/db/queries/score-events";
import { createScoreEvent } from "@/lib/game/services/score-events";
import type { ScoreEventType } from "@/lib/game/enums";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("session_id") ?? undefined;
    const participantId = searchParams.get("participant_id") ?? undefined;
    const eventType = (searchParams.get("event_type") ?? undefined) as ScoreEventType | undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined;
    const relatedElementInstanceId = searchParams.get("related_element_instance_id") ?? undefined;
    const relatedAccusationId = searchParams.get("related_accusation_id") ?? undefined;
    const relatedGmDecisionId = searchParams.get("related_gm_decision_id") ?? undefined;

    const events = await listScoreEvents({
      sessionId,
      participantId,
      eventType,
      from,
      to,
      relatedElementInstanceId,
      relatedAccusationId,
      relatedGmDecisionId,
    });

    return NextResponse.json({ ok: true, data: events });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown score event list error",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = await createScoreEvent(body);

    return NextResponse.json({ ok: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown score event creation error",
      },
      { status: 400 },
    );
  }
}
