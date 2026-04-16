# Accusations (couche métier)

`accusations` formalise le soupçon social (qui accuse qui, sur quoi, pourquoi), puis son arbitrage.

## Rôle métier

- Objet social structuré: auteur, cible, objet soupçonné, justification.
- Workflow d'arbitrage explicite (`status`, `decision`, `verdict`).
- Conséquences déclaratives (`reward_tokens`, `triggered_fake_bait`, `cancelled_previous_validation`).
- `token_events` / `score_events` restent la vérité comptable officielle.

## Champs critiques

- `status`: état de workflow (`submitted`, `under_review`, `validated`, `rejected`, `cancelled`).
- `decision`: décision logique finale (`correct`, `incorrect`, `fake_bait_triggered`, `not_receivable`, `cancelled_by_gm`).
- `verdict`: restitution métier lisible (`reçue`, `en arbitrage`, `juste`, `fausse`, etc.).

Ces trois champs sont volontairement distincts.

## Convention MVP `is_receivable` (champ miroir)

- `is_receivable` est un miroir métier simple, **pas** une source de vérité autonome.
- La vérité principale reste le triplet: `status` + `decision` + `verdict`.
- Convention de lecture:
  - `NULL` = recevabilité non tranchée (ou annulation GM)
  - `TRUE` = accusation recevable
  - `FALSE` = accusation irrecevable
- Mapping imposé par `decision`:
  - `correct` -> `is_receivable = true`
  - `incorrect` -> `is_receivable = true`
  - `fake_bait_triggered` -> `is_receivable = true`
  - `not_receivable` -> `is_receivable = false`
  - `cancelled_by_gm` -> `is_receivable = null`

## Template vs instance liée

- `suspected_template_id`: l'élément théorique soupçonné (définition catalog).
- `related_element_instance_id`: une instance runtime éventuellement associée (ancrage réel).

## Reward vs ledger

- `accusations.reward_tokens` est une valeur informative de gameplay.
- Le solde officiel passe toujours par `token_events.delta_tokens`.
- Toute récompense effective doit créer un `token_event` relié (`related_accusation_id`).
