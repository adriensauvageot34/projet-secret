import test from "node:test";
import assert from "node:assert/strict";
import type { ElementInstance } from "@/types/domain";
import {
  applyActivationRuntimeOptimisticUpdate,
  applyServerRuntimeSnapshot,
} from "@/lib/game/services/player-runtime-client-state";

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

test("activation réussie: runtime local ajoute immédiatement l'élément actif et retire l'offre réserve", () => {
  const runtime = {
    reserveTemplates: [
      {
        reserveOfferId: "offer-1",
        templateId: "template-1",
        name: "Mission Alpha",
        code: "M_ALPHA",
        elementType: "mission",
        validationMode: "self_attest",
      },
      {
        reserveOfferId: "offer-2",
        templateId: "template-2",
        name: "Mission Beta",
        code: "M_BETA",
        elementType: "mission",
        validationMode: "proof_required",
      },
    ],
    activeElements: [] as Array<{
      instance: ElementInstance;
      template: {
        id: string;
        name: string;
        code: string;
        elementType: string;
        validationMode: string;
      } | null;
    }>,
  };

  const activated = applyActivationRuntimeOptimisticUpdate(runtime, {
    reserveOfferId: "offer-1",
    instance: {
      id: "instance-1",
      participant_id: "participant-1",
      session_id: "session-1",
      element_template_id: "template-1",
      state: "active",
      active_slot_index: 0,
      is_fake: false,
      claimed_result: null,
      final_result: null,
      proof_status: "pending",
      activated_at: "2026-01-01T00:00:00.000Z",
      skip_available_at: "2026-01-01T00:10:00.000Z",
      ends_at: "2026-01-01T01:00:00.000Z",
      cooldown_until: null,
      points_gained: 0,
      points_lost: 0,
      tokens_gained: 0,
      was_retroactively_invalidated: false,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  });

  assert.ok(activated);
  if (!activated) {
    throw new Error("activation optimistic update should return a runtime snapshot");
  }
  assert.equal(activated.reserveTemplates.length, 1);
  assert.equal(activated.reserveTemplates[0].reserveOfferId, "offer-2");
  assert.equal(activated.activeElements.length, 1);
  assert.equal(activated.activeElements[0].instance.id, "instance-1");
  assert.equal(activated.activeElements[0].template?.id, "template-1");
});
