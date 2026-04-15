import { NextResponse } from "next/server";
import { createAccusation } from "@/lib/game/services/accusations";

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
