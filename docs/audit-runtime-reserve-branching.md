# Audit de branchement runtime — réserve persistée

Date d'audit: 2026-04-17

## Périmètre audité
- Lecture runtime joueur
- Activation d’un élément
- Résolution terminale d’un élément
- Remplacement d’offre
- Bootstrap initial de session

---

## 1) Lecture runtime joueur

### État réel
- Le runtime joueur charge bien les offres persistées (`listVisibleReserveForParticipant`) et les transforme en `reserveTemplates`.
- Mais un fallback calculé est toujours présent: si aucune offre persistée n’est visible, la réserve est reconstruite à la volée avec `buildVisibleReserveTemplates`.
- Le payload runtime n’expose que des `template.id` (pas `offer.id`).

### Conclusion
- **Partiellement branché**.
- La source primaire est la réserve persistée **seulement si elle n’est pas vide**.
- Le modèle historique calculé est encore actif en fallback.

---

## 2) Activation d’un élément

### État réel
- Le front envoie `templateId` à `/api/elements/activate`.
- L’API relaie `participantId + templateId` au service `activateElement`.
- `activateElement` recharge directement le template depuis `element_templates` et vérifie activité / éligibilité / niveau / slots.
- Aucun passage par `participant_reserve_offers`:
  - pas de vérification que l’offre est visible pour ce joueur,
  - pas de consommation/révocation d’offre au moment de l’activation.

### Conclusion
- **Encore sur template brut** (pas activé depuis une offre persistée identifiée).
- Ce chemin permet de contourner la logique "offres visibles" si un `templateId` valide est soumis.

---

## 3) Résolution terminale d’un élément

### État réel
- `claim-result` appelle `resolveElementClaim`.
- `resolveElementClaim` gère le claim, l’auto-résolution selon le mode, les score events, combo, recompute slots, level up.
- Aucun appel à un service de remplacement d’offre, ni création/révocation de `participant_reserve_offers` en sortie terminale.

### Conclusion
- **Pas de remplacement immédiat automatique branché** à la résolution terminale.

---

## 4) Remplacement d’offre

### État réel
- Le service `replaceVisibleReserveOffer` existe et implémente bien: création d’une nouvelle offre + révocation de l’ancienne avec lien `replaced_by_offer_id`.
- En revanche, aucun flux runtime/API n’appelle ce service aujourd’hui.

### Conclusion
- **Implémenté en service, non branché dans les flux produit**.

---

## 5) Bootstrap initial de session

### État réel
- `bootstrapInitialSessionReserves` applique bien:
  - quotas par bucket (type+difficulté),
  - unicité inter-joueurs visible simultanément,
  - blacklist locale par succès,
  - indisponibilité globale.
- Mais ce bootstrap est appelé dans un script dédié (`scripts/bootstrap-session-reserves.ts`) et pas dans un flux runtime applicatif observé.

### Conclusion
- **Mécanique correcte côté service**, mais **exécution non automatiquement branchée** dans le cycle de session (d’après le code audité).

---

## Écarts restants (voulu vs réel)

1. **Activation depuis offre persistée (voulu)** vs **activation depuis templateId brut (réel)**.
2. **Consommation/révocation d’offre à l’activation (voulu)** vs **aucune mutation d’offre à l’activation (réel)**.
3. **Remplacement immédiat post-résolution (voulu)** vs **aucun trigger de remplacement (réel)**.
4. **Réserve persistée source de vérité stricte (voulu)** vs **fallback calculé actif si réserve vide (réel)**.
5. **Bootstrap initial intégré au démarrage de session (voulu)** vs **bootstrap surtout disponible via script manuel (réel)**.
6. **Blocage strict des contournements produit (voulu)** vs **API activation acceptant tout template éligible sans appartenance à une offre visible (réel)**.

---

## Fichiers/services exacts à corriger ensuite

### Priorité haute
1. `src/app/api/elements/activate/route.ts`
   - Faire accepter un `offerId` (pas seulement `templateId`) et propager au service métier.
2. `src/lib/game/services/activate-element.ts`
   - Vérifier que l’offre existe, appartient au participant, est visible (non révoquée), puis activer depuis cette offre.
   - Révoquer/consommer l’offre activée.
3. `src/app/api/player-runtime/[participantId]/route.ts`
   - Exposer les `offerId` dans `reserveTemplates`.
   - Décider explicitement la stratégie sur fallback (désactiver ou limiter strictement au bootstrap absent).

### Priorité haute (résolution)
4. `src/lib/game/services/resolve-element-claim.ts`
   - Brancher le remplacement immédiat (appel `replaceVisibleReserveOffer` ou orchestration dédiée) quand un élément devient terminal.
   - Respecter les règles de disponibilité globale + blacklist locale au moment du remplacement.

### Priorité moyenne
5. `src/lib/game/services/participant-reserve-offers.ts`
   - Service déjà prêt: consolider son usage comme unique porte d’entrée des transitions d’offre.
6. `src/lib/game/services/session-reserve-bootstrap.ts`
   - Conserver tel quel côté logique, mais l’invoquer automatiquement au bon moment de cycle de session.
7. `scripts/bootstrap-session-reserves.ts`
   - Garder pour ops/recovery, mais ne pas dépendre exclusivement de ce script pour le runtime nominal.

---

## Résumé exécutif
- **Déjà OK**: modèle DB des offres visibles, règles d’unicité inter-joueurs, service de création/remplacement d’offre, bootstrap par bucket côté service.
- **Partiel**: lecture runtime (persisté + fallback calculé).
- **Manquant critique**: activation depuis offre persistée, consommation d’offre à activation, remplacement automatique à résolution terminale, branchement automatique du bootstrap.
