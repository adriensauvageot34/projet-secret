import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatElementDuration,
  getElementTypeTagLabel,
  getReserveDescription,
} from "@/components/player/reserve-panel";
import {
  getClaimButtonsForElement,
  getSkipAvailability,
} from "@/components/player/active-elements-panel";

test("réserve joueur: tag FR, durée lisible et fallback de description", () => {
  assert.equal(getElementTypeTagLabel("mission"), "Mission");
  assert.equal(getElementTypeTagLabel("constraint"), "Contrainte");
  assert.equal(formatElementDuration(92), "01:32");
  assert.equal(
    getReserveDescription({
      reserveOfferId: "offer-1",
      templateId: "template-1",
      name: "Filature",
      elementType: "mission",
      basePoints: 5,
      durationSeconds: 90,
      description: "",
    }),
    "Atteins l’objectif avant la fin du chrono.",
  );
});

test("actions des éléments actifs: mission vs contrainte + libellés de passer", () => {
  assert.deepEqual(getClaimButtonsForElement("mission"), ["success", "fail", "skipped"]);
  assert.deepEqual(getClaimButtonsForElement("constraint"), ["broken", "skipped"]);
  assert.equal(getSkipAvailability(null).label, "Passer indisponible");
  assert.equal(getSkipAvailability("2026-01-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z").getTime()).label, "Passer");
  assert.equal(
    getSkipAvailability("2026-01-01T00:00:30.000Z", new Date("2026-01-01T00:00:00.000Z").getTime()).label,
    "Passer dans 00:30",
  );
});

test("projection joueur: pas d'affichage technique/debug sur réserve et actifs", () => {
  const reservePanel = readFileSync("src/components/player/reserve-panel.tsx", "utf8");
  assert.match(reservePanel, /Points : \+\{template\.basePoints\}/);
  assert.match(reservePanel, /Durée : \{formatElementDuration\(template\.durationSeconds\)\}/);
  assert.match(reservePanel, /getReserveDescription\(template\)/);
  assert.match(reservePanel, /"Activer"/);
  assert.doesNotMatch(reservePanel, /offerId:|template\.code|validation|diff /);

  const activePanel = readFileSync("src/components/player/active-elements-panel.tsx", "utf8");
  assert.match(activePanel, /Temps restant : <CountdownValue endsAt=\{instance\.ends_at\} \/>/);
  assert.match(activePanel, /return "Succès"/);
  assert.match(activePanel, /return "Échec"/);
  assert.match(activePanel, /return "Contrainte rompue"/);
  assert.match(activePanel, /Passer dans/);
  assert.doesNotMatch(activePanel, />\s*state:/);
  assert.doesNotMatch(activePanel, />\s*activeSlotIndex:/);
  assert.doesNotMatch(activePanel, />\s*activatedAt:/);
  assert.doesNotMatch(activePanel, />\s*skipAvailableAt:/);
  assert.doesNotMatch(activePanel, />\s*endsAt:/);
});
