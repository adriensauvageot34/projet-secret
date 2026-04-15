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

## Template vs instance liée

- `suspected_template_id`: l'élément théorique soupçonné (définition catalog).
- `related_element_instance_id`: une instance runtime éventuellement associée (ancrage réel).

## Reward vs ledger

- `accusations.reward_tokens` est une valeur informative de gameplay.
- Le solde officiel passe toujours par `token_events.delta_tokens`.
- Toute récompense effective doit créer un `token_event` relié (`related_accusation_id`).
