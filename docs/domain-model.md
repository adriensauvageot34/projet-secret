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

The real catalog currently contains **36** advantage templates.
