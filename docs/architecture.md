# Architecture MVP

## Séparation catalogue / runtime
- Catalogue: `levels`, `element_templates`, `advantage_templates`, `wheel_outcome_templates`.
- Runtime: `participants`, `element_instances`, `advantage_instances`, `accusations`.

## Séparation identité / participation sessionnelle
- `players` = identité durable.
- `participants` = état runtime dans une session.

## Séparation cause gameplay / ledger
- `participants.current_score` et `participants.current_tokens` = cache runtime rapide.
- `score_events` et `token_events` = ledger historique officiel.

## Séparation décision humaine / effet produit
- `gm_decisions` trace la décision.
- Les effets de score/jetons sont matérialisés par events dédiés.

## Stratégie timestamps
- UTC stocké en base (`timestamptz`) pour toutes bornes runtime.
- `expires_at`, `ends_at`, `skip_available_at`, `cooldown_until` sont stockés.

## claimed_result vs final_result
- `claimed_result` = déclaration du participant.
- `final_result` = résultat final arbitré/validé.
