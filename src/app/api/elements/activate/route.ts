import { NextResponse } from "next/server";
import { activateElement } from "@/lib/game/services/activate-element";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      participantId: string;
      reserveOfferId: string;
      slotIndex?: number;
      isFake?: boolean;
    };

    const result = await activateElement(
      body.participantId,
      body.reserveOfferId,
      body.slotIndex,
      body.isFake ?? false,
    );

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown element activation error",
      },
      { status: 400 },
    );
  }
}
