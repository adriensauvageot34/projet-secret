import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("runtime joueur: la query des actifs repose sur state=active (sans filtre final_result)", () => {
  const queryFile = readFileSync("src/lib/db/queries/element-instances.ts", "utf8");

  assert.match(queryFile, /\.eq\("state", "active"\)/);
  assert.doesNotMatch(queryFile, /\.is\("final_result", null\)/);
});
