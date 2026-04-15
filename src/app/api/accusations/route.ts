import { NextResponse } from "next/server";
import { listAccusations } from "@/lib/db/queries/accusations";
import { createAccusation } from "@/lib/game/services/accusations";
import type { AccusationDecision, AccusationStatus, AccusationVerdict } from "@/lib/game/enums";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const status = (searchParams.get("status") ?? undefined) as AccusationStatus | undefined;
    const decision = (searchParams.get("decision") ?? undefined) as AccusationDecision | undefined;
    const verdict = (searchParams.get("verdict") ?? undefined) as AccusationVerdict | undefined;

    const data = await listAccusations({
      sessionId: searchParams.get("session_id") ?? undefined,
      status,
      decision,
      verdict,
      accuserParticipantId: searchParams.get("accuser_participant_id") ?? undefined,
      accusedParticipantId: searchParams.get("accused_participant_id") ?? undefined,
      adjudicatedByParticipantId: searchParams.get("adjudicated_by_participant_id") ?? undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown accusation list error",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accusation = await createAccusation(body);
    return NextResponse.json({ ok: true, data: accusation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown accusation creation error",
      },
      { status: 400 },
    );
  }
}
