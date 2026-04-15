# Token events ledger

`token_events` est le **ledger historique officiel** des mouvements de jetons :

- un événement = un mouvement unitaire (`delta_tokens` signé, non nul)
- positif = gain, négatif = dépense/perte
- rattaché à un participant et une session
- avec cause métier (`event_type`) et liens optionnels (`accusation`, `advantage_instance`, `gm_decision`, `element_instance`)

`participants.current_tokens` reste un **cache runtime de lecture rapide**. Il est mis à jour par le backend à chaque création de `token_events`, mais la vérité auditable reste la somme du ledger.

## Event types

- `accusation_correct`: gain suite à accusation correcte
- `shop_purchase`: dépense en boutique
- `refund`: remboursement (gain)
- `fake_bait_bonus`: bonus de faux appât
- `manual_adjustment`: correction manuelle GM (+/-)
- `bonus_effect`: effet bonus (+/-)
- `cancellation`: compensation/annulation (+/-)
- `other`: cas divers documentés via `notes`

## Conventions clés

- Les corrections rétroactives doivent privilégier des événements compensatoires (`cancellation`, `refund`, `manual_adjustment`) plutôt que modifier l’historique.
- Les lookups Airtable sont exposés en lecture enrichie côté requêtes/services (pas stockés comme colonnes redondantes).
