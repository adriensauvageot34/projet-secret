import { NextResponse } from "next/server";
import { buyAdvantage } from "@/lib/game/services/buy-advantage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      templateId: string;
      participantId: string;
      gmNotes?: string;
    };

    const result = await buyAdvantage(body);
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown advantage purchase error",
      },
      { status: 400 },
    );
  }
}
