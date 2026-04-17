import { NextResponse } from "next/server";
import { getGmRuntimeView } from "@/lib/game/services/get-gm-runtime-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export async function GET() {
  try {
    const data = await getGmRuntimeView();
    return NextResponse.json({ ok: true, data }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown GM runtime retrieval error",
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
