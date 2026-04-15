# Domain model

## Catalogue boutique : `advantage_templates`

`advantage_templates` est le catalogue officiel, stable et paramétrique des avantages boutique.

La table décrit uniquement :
- l’identité (`name`)
- la progression (`tier`, `min_player_level`)
- le coût (`cost_tokens`)
- la logique d’effet (`effect_family`, `effect_code`)
- le contrat de ciblage (`target_type`)
- la durée théorique (`duration_seconds`)
- la politique de consommation (`is_consumable`, `max_uses`)
- la visibilité catalogue (`visible_if_locked`, `is_active`)
- la documentation joueur/admin (`description_player`, `description_admin`)

## Runtime session : `advantage_instances`

`advantage_instances` porte l’exécution réelle en session :
- possession
- activation
- expiration
- usages restants
- cible effectivement choisie

Le template définit ; l’instance exécute.

## Pivot backend : `effect_code`

`effect_code` est la clé technique principale pour connecter un template au moteur d’effet.

Le backend doit brancher la logique métier sur `effect_code` (et non sur `name`).

## Contrat de ciblage : `target_type`

`target_type` formalise explicitement la cible attendue par le moteur (`self`, `other_player`, `other_participant`, `element`, `none`).

La distinction `other_player` vs `other_participant` est conservée pour éviter les ambiguïtés de runtime.

## Convention MVP actuelle

Le catalogue est préparé pour la convention MVP par défaut :
- consommable (`is_consumable = true`)
- mono-usage (`max_uses = 1`)
- visible même verrouillé (`visible_if_locked = true`)
- actif par défaut (`is_active = true`)
