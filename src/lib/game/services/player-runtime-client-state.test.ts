import test from "node:test";
import assert from "node:assert/strict";
import { applyServerRuntimeSnapshot } from "@/lib/game/services/player-runtime-client-state";

test("snapshot runtime remplace strictement la réserve précédente", () => {
  const previousRuntime = {
    reserveTemplates: [
      {
        reserveOfferId: "old-offer-1",
        templateId: "t-old-1",
      },
      {
        reserveOfferId: "old-offer-2",
        templateId: "t-old-2",
      },
    ],
    activeElements: [],
  };

  const latestServerRuntime = {
    reserveTemplates: [
      {
        reserveOfferId: "new-offer-1",
        templateId: "t-new-1",
      },
      {
        reserveOfferId: "new-offer-2",
        templateId: "t-new-2",
      },
    ],
    activeElements: [],
  };

  const appliedRuntime = applyServerRuntimeSnapshot(latestServerRuntime);

  assert.deepEqual(appliedRuntime.reserveTemplates, latestServerRuntime.reserveTemplates);
  assert.notDeepEqual(appliedRuntime.reserveTemplates, previousRuntime.reserveTemplates);

  const latestReserveOfferIds = new Set(latestServerRuntime.reserveTemplates.map((offer) => offer.reserveOfferId));
  for (const offer of appliedRuntime.reserveTemplates) {
    assert.equal(latestReserveOfferIds.has(offer.reserveOfferId), true);
  }
});
