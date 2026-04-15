import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/db/queries/sessions";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ ok: true, data: null });
    }

    return NextResponse.json({ ok: true, data: session });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown session retrieval error",
      },
      { status: 400 },
    );
  }
}
