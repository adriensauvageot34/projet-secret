import { NextResponse } from "next/server";
import { getTokenEventById } from "@/lib/db/queries/token-events";

export async function GET(_: Request, context: { params: { tokenEventId: string } }) {
  try {
    const event = await getTokenEventById(context.params.tokenEventId);

    if (!event) {
      return NextResponse.json({ ok: false, error: "Token event not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: event });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown token event detail error",
      },
      { status: 400 },
    );
  }
}
