import { NextResponse } from "next/server";
import { listGMDecisions } from "@/lib/db/queries/gm-decisions";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId") ?? undefined;
    const decisionType = (url.searchParams.get("decisionType") as Parameters<typeof listGMDecisions>[0]["decisionType"]) ?? undefined;
    const status = (url.searchParams.get("status") as Parameters<typeof listGMDecisions>[0]["status"]) ?? undefined;
    const madeByParticipantId = url.searchParams.get("madeByParticipantId") ?? undefined;
    const targetParticipantId = url.searchParams.get("targetParticipantId") ?? undefined;
    const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from") as string) : undefined;
    const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to") as string) : undefined;

    const data = await listGMDecisions({
      sessionId,
      decisionType,
      status,
      madeByParticipantId,
      targetParticipantId,
      from,
      to,
    });

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
