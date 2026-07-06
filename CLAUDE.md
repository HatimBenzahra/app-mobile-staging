# CLAUDE.md — App Mobile ProWin

> Les **règles de qualité, de méthode et Plannotator** sont héritées de `../CLAUDE.md`
> (racine `prowin/`). Ce fichier ne contient QUE le spécifique mobile.

---

## Ce qu'est l'app

App de **prospection mobile** dédiée au **suivi terrain**. Deux espaces :

- **Espace commercial** — l'utilisateur terrain (carte, immeubles/portes, prospection, stats perso).
- **Espace manager** — un **commercial avec le rôle de gestion d'équipe**. Même modèle, capacités de suivi/gestion en plus.

> Le manager n'est PAS un type d'utilisateur distinct : c'est un commercial + rôle. La logique doit refléter ça, sans duplication de modèle.

---

## Commandes

```bash
npm start              # expo start
npm run android        # expo run:android
npm run ios            # expo run:ios
npm run lint           # expo lint
npm test               # jest
npm run codegen        # graphql-codegen (types GraphQL)
npm run deploy:staging # déploiement staging (scripts/deploy-mobile.sh)
npm run deploy:prod    # déploiement prod
```

> Déploiement : **toujours** via `deploy:staging` / `deploy:prod`. Jamais de rebuild serveur manuel.

---

## Stack

- **Expo 54** — RN 0.81, React 19.
- **expo-router** — routing par fichiers, `typedRoutes` activé.
- **New Architecture** + **React Compiler** activés.
- **TypeScript strict**, alias `@/*` → racine du projet.
- **MapLibre** (`@maplibre/maplibre-react-native`) pour la carte terrain.
- **GraphQL maison** (client custom, PAS Apollo).

---

## Architecture des dossiers

```
app/            Routes (file-based). (auth) = login, (app)/(tabs) = espace connecté.
components/     Composants UI réutilisables (carte-terrain, dashboard, immeubles,
                gamification, navigation, network, ui). ← VÉRIFIER ICI avant d'en créer un.
hooks/          Hooks React. hooks/api/* = 1 hook par requête/mutation GraphQL.
services/       Logique métier : api, auth, location, audio, offline, sync, network, core.
modules/        Modules natifs custom (ex: kiosk-bridge, MDM Android).
constants/      env, theme, version.
types/          Types partagés.
utils/          Helpers (business, stats).
```

**Conventions :**
- Un hook `hooks/api/use-xxx.ts` par opération API.
- La logique lourde vit dans `services/`, pas dans les composants.
- Import via `@/...` (jamais de chemins relatifs profonds `../../../`).

---

## Couche données / GraphQL

- Client custom : `services/core/graphql/client.ts` — retry (backoff exponentiel) + **refresh token automatique** sur erreur d'auth.
- Endpoint : `EXPO_PUBLIC_API_URL` → `${API_URL}/graphql` (voir `constants/env.ts`).
- Types générés via `npm run codegen`.
- Services API par domaine : `services/api/{portes,immeubles,commercials,managers,statistics,gamification,gps,recordings}`.

---

## Points sensibles (offline / GPS / audio)

- **Offline-first** : `services/offline/*` (queue, cache tuiles carte, packs offline) + `services/sync/*`. Toute écriture doit fonctionner hors-ligne puis se synchroniser.
- **GPS background** : `services/location/location-tracking.service.ts` (foreground service, permissions background iOS/Android). Fichier chaud — modifier avec prudence.
- **Audio background** : `services/audio/*` (enregistrement + upload queue, foreground service micro).
- **Kiosk / MDM** : `modules/kiosk-bridge` + plugin `with-foreground-service-type`.
