# Score Events Ledger

`score_events` est le **ledger historique officiel** des mouvements de score:
- une ligne = un mouvement unitaire (`delta_points` signé);
- `participants.current_score` reste un **cache runtime**;
- la vérité comptable/audit est la somme du ledger.

## Distinction fondamentale GM

Deux relations différentes coexistent volontairement:

- `score_events.related_gm_decision_id`: décision GM **cause** de la création d'un score event.
- `gm_decisions.target_score_event_id`: décision GM qui **cible un score event existant** (audit, annulation rétroactive, requalification).

Elles ne sont pas fusionnées, car elles servent des sens métiers opposés (cause vs ciblage).

## Lookups Airtable: ce qui est reproduit, ce qui ne l'est pas

Les lookups utiles sont exposés en lecture via queries/services (`session_name`, `participant_display_name`, etc.).

Le lookup Airtable cassé `Related_Element_Type_Lookup` n'est pas reproduit en colonne:
- on remonte plutôt le type réel via la chaîne relationnelle
  `score_event -> related_element_instance -> element_template -> element_type`.
