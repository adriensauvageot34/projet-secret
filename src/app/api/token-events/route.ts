import { NextResponse } from "next/server";
import { listTokenEvents } from "@/lib/db/queries/token-events";
import { createTokenEvent } from "@/lib/game/services/token-events";
import type { TokenEventType } from "@/lib/game/enums";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("session_id") ?? undefined;
    const participantId = searchParams.get("participant_id") ?? undefined;
    const eventType = (searchParams.get("event_type") ?? undefined) as TokenEventType | undefined;
    const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined;

    const events = await listTokenEvents({
      sessionId,
      participantId,
      eventType,
      from,
      to,
    });

    return NextResponse.json({ ok: true, data: events });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown token event list error",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = await createTokenEvent(body);

    return NextResponse.json({ ok: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown token event creation error",
      },
      { status: 400 },
    );
  }
}
