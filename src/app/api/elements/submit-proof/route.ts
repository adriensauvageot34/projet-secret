import { NextResponse } from "next/server";
import { submitProof } from "@/lib/game/services/submit-proof";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { instanceId: string };
    const result = await submitProof(body.instanceId);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown submit proof error",
      },
      { status: 400 },
    );
  }
}
