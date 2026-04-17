import { NextResponse } from "next/server";
import { activateElement } from "@/lib/game/services/activate-element";
import { getVisibleReserveOfferById } from "@/lib/db/queries/participant-reserve-offers";

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
    reserveOfferId = body.reserveOfferId ?? "";

    if (!participantId || !reserveOfferId) {
      throw new Error(`Missing activation payload fields (participantId=${participantId || "missing"}, reserveOfferId=${reserveOfferId || "missing"})`);
    }

    console.info("[elements.activate] payload", {
      participantId,
      reserveOfferId,
      hasLegacyOfferId: typeof body.offerId === "string" && body.offerId.length > 0,
      hasLegacyTemplateId: typeof body.templateId === "string" && body.templateId.length > 0,
    });

    const preActivationLookup = await getVisibleReserveOfferById(reserveOfferId);
    console.info("[elements.activate] visible offer lookup by reserveOfferId", {
      participantId,
      reserveOfferId,
      dbLookup: preActivationLookup,
    });

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
