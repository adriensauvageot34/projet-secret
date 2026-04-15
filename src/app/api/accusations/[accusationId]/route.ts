import { NextResponse } from "next/server";
import { getAccusationById } from "@/lib/db/queries/accusations";

export async function GET(_request: Request, context: { params: { accusationId: string } }) {
  try {
    const detail = await getAccusationById(context.params.accusationId);

    if (!detail) {
      return NextResponse.json({ ok: false, error: "Accusation not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: detail });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown accusation detail error",
      },
      { status: 400 },
    );
  }
}
