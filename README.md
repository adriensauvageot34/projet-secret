# projet-secret

Application web **mobile-first** pour piloter un jeu social compétitif en soirée.

## Objectif

`projet-secret` est un MVP pour superposer une couche de gameplay secrète à une vraie soirée:
- vue joueur (missions/contraintes, score, jetons, niveau, boutique, accusations)
- vue GM (pilotage session, arbitrage, suivi runtime, clôture)
- backend léger prêt pour Supabase

## Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Déploiement cible: Vercel

## Lancement local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Structure du projet

- `src/app`: pages, layouts, API routes
- `src/components`: UI réutilisable + blocs Player / GM
- `src/lib/db`: queries / mutations de persistance
- `src/lib/game`: enums, règles, state machines, services métier
- `src/types`: types domaine/API/DB
- `supabase/migrations`: schéma SQL versionné
- `docs`: architecture et périmètre MVP

## Conventions importantes

- **Séparation catalogue/runtime**: templates vs instances
- **Séparation identité/session**: `players` vs `participants`
- **Séparation runtime/ledger**: `participants.current_*` (cache), `*_events` (vérité historique)
- **Décision humaine explicite**: `gm_decisions` documente, les effets passent par events
- UTC partout, colonnes en `snake_case` côté SQL

## Inclus dans ce MVP

- Arborescence complète Next.js + Tailwind
- Pages player/GM minimales utilisables
- API routes placeholders cohérentes
- Types métiers principaux
- Services métier avec signatures et TODO ciblés
- Migration SQL initiale des tables clés

## Non implémenté (encore)

- Auth complète (RLS, rôles Supabase)
- Moteur de règles complet de scoring/validation
- Gestion temps réel (websockets/realtime)
- Tests unitaires/intégration complets
- UI finale/branding
