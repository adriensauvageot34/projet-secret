# GM decisions (gouvernance manuelle)

`gm_decisions` trace l'acte d'arbitrage GM, pas les effets comptables eux-mêmes.

## Décision vs effet comptable

- `gm_decisions`: qui décide, pourquoi, sur quoi, dans quelle session, et avec quels impacts déclarés.
- `score_events` / `token_events`: ledger officiel des mouvements de score/jetons effectivement appliqués.

Concrètement:
- une décision peut rester `logged` sans effet comptable immédiat;
- l'application (`status = applied`) peut créer des `score_events` / `token_events` liés via `related_gm_decision_id`;
- une annulation passe en `cancelled` sans supprimer l'historique.

## Sens des champs `related_*` vs `target_*`

- `related_element_instance_id`: élément de contexte (référence informative).
- `target_element_instance_id`: élément explicitement visé par la décision.
- `target_score_event_id` / `target_token_event_id`: événements existants ciblés.

Les événements **produits** par la décision ne sont pas stockés en liste dans `gm_decisions`; ils sont obtenus par les relations inverses:
- `score_events.related_gm_decision_id = gm_decisions.id`
- `token_events.related_gm_decision_id = gm_decisions.id`
