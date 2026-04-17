import { bootstrapInitialSessionReserves } from "@/lib/game/services/session-reserve-bootstrap";

async function main() {
  const sessionId = process.argv[2];

  if (!sessionId) {
    throw new Error("Usage: tsx scripts/bootstrap-session-reserves.ts <sessionId>");
  }

  const result = await bootstrapInitialSessionReserves(sessionId);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown bootstrap error";
  console.error(message);
  process.exitCode = 1;
});
