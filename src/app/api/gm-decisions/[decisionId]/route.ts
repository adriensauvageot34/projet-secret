import { NextResponse } from "next/server";
import { getGMDecisionById } from "@/lib/db/queries/gm-decisions";

export async function GET(_req: Request, context: { params: { decisionId: string } }) {
  try {
    const data = await getGMDecisionById(context.params.decisionId);

    if (!data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
