import { NextResponse } from "next/server";
import { activateElement } from "@/lib/game/services/activate-element";

export async function POST(request: Request) {
  let participantId = "";
  let reserveOfferId = "";
  try {
    const body = (await request.json()) as {
      participantId: string;
      reserveOfferId: string;
      offerId?: string;
      templateId?: string;
      slotIndex?: number;
      isFake?: boolean;
    };
    participantId = body.participantId;
    reserveOfferId = body.reserveOfferId ?? body.offerId ?? body.templateId ?? "";

    if (!participantId || !reserveOfferId) {
      throw new Error(`Missing activation payload fields (participantId=${participantId || "missing"}, reserveOfferId=${reserveOfferId || "missing"})`);
    }

    const result = await activateElement(
      participantId,
      reserveOfferId,
      body.slotIndex,
      body.isFake ?? false,
    );

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown element activation error";
    console.error("Element activation failed", {
      participantId,
      reserveOfferId,
      reason,
    });

    return NextResponse.json(
      {
        ok: false,
        error: reason,
      },
      { status: 400 },
    );
  }
}
