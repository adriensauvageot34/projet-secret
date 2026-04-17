import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("claim mutation protège double-claim + évite .single() fragile", () => {
  const mutation = readFileSync("src/lib/db/mutations/element-instances.ts", "utf8");
  const claimResultBlock = mutation.split("export async function claimResult")[1]?.split("export async function submitProof")[0] ?? "";

  assert.match(claimResultBlock, /\.is\("claimed_result", null\)/);
  assert.match(claimResultBlock, /\.maybeSingle\(\)/);
  assert.doesNotMatch(
    claimResultBlock,
    /\.single\(\)/,
    "claimResult ne doit plus utiliser .single() pour éviter les erreurs de coercition",
  );
});
