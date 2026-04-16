# Domain model

## Advantage catalog vs runtime instances

`advantage_templates` is the official shop catalog.

It contains only definition data:
- identity, progression, cost, activation flags
- effect metadata (`effect_family`, `effect_code`, `target_type`, `duration_seconds`)
- consumption defaults (`is_consumable`, `max_uses`)
- player/admin documentation fields

`advantage_instances` is runtime execution.

It contains only ownership/execution state:
- purchaser/owner and optional runtime target
- activation timestamps, expiration timestamps
- runtime state transitions and remaining uses

## Backend pivot contracts

- `effect_code` is the backend pivot for wiring effect handlers.
- Runtime effect dispatch must use `effect_code`, never template name.
- `target_type` is the targeting contract for the engine (`self`, `other_participant`, `other_player`, `element`, `none`).

## MVP catalog conventions

Current real catalog convention:
- consumable by default (`is_consumable = true`)
- single-use by default (`max_uses = 1`)
- visible while locked (`visible_if_locked = true`)
- active by default (`is_active = true`)

The real catalog currently contains **36** advantage templates in definition, with **15** templates active for the Friday MVP shop catalog.

## Advantage runtime invariants (MVP)

`advantage_templates` remains the catalog definition layer.

`advantage_instances` is runtime-only and starts empty by default:
- real acquisition source (`shop`, `bonus`, `fake_bait`, `manual`)
- real paid amount (`cost_paid`)
- runtime ownership and activation state
- runtime expiration truth (`expires_at`)
- runtime consumptions (`remaining_uses`)
- optional runtime targeting (`target_participant_id`, `target_element_instance_id`)

Identity split is explicit and mandatory:
- `assigned_player_id` = durable player identity
- `participant_id` = session incarnation

Expiration hierarchy:
1. `instance.expires_at` is the runtime truth.
2. `activated_at + template.duration_seconds` is only a derived helper for validation/audit fallback.

Usage hierarchy:
- `remaining_uses` is explicit runtime state and is always persisted.
- `remaining_uses = 0` is a valid business value and must never fallback to template max uses.

Airtable-style lookup/formula fields are not persisted in SQL and must be rebuilt with query helpers/joins.
