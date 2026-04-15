import { NextResponse } from "next/server";
import { getParticipantById } from "@/lib/db/queries/participants";

export async function GET(_request: Request, context: { params: { participantId: string } }) {
  try {
    const participant = await getParticipantById(context.params.participantId);

    if (!participant) {
      return NextResponse.json({ ok: false, error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: participant });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown participant retrieval error",
      },
      { status: 400 },
    );
  }
}
