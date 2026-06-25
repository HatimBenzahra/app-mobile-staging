# Plan — Flow Quartier (v1) — app mobile prospection

**Statut : pending approval** (ne pas exécuter sans go explicite)

## Requirements Summary
Aujourd'hui un quartier n'existe que pour la **création** (poser des pins sur la carte) + le regroupement en base. Il manque la brique essentielle d'une app de prospection : **ouvrir un quartier, voir ses bâtiments regroupés, et aller en prospecter un**.

v1 = vue détail quartier : mini-carte des bâtiments + liste avec progression + tap → fiche de prospection (`/lieu/[id]`, déjà en place). Le commercial choisit librement où aller. L'adresse de chaque bâtiment reste affichée (essentielle pour supervision/data).

**Hors périmètre v1** : itinéraire/route optimisé entre bâtiments (v2, nécessite API routing) ; tracé polygone de zone par l'admin (autre chantier).

## Données (constats backend/mobile)
- Backend : query `quartiers` existe déjà (`immeuble.resolver.ts:54`), **role-scopée et ownership-safe** (`immeuble.service.ts:353` `findQuartiers`). Le type GraphQL `Quartier` expose `immeubles: [Immeuble]` (`immeuble.dto.ts:224`), et `Immeuble` expose `portes`, `typeHabitat`, `nbEtages`, `nbPortesParEtage`, `nbMaisonsPrevu` (`immeuble.dto.ts:28`).
- **BLOQUANT identifié** : `findQuartiers` fait `include: { immeubles: true }` (`immeuble.service.ts:358-362`) → les immeubles reviennent **sans leurs portes** → progression non calculable. À corriger.
- Mobile : **aucune** query quartier (`services/api/immeubles/immeuble.service.ts` n'expose pas de `getQuartiers`). À ajouter.
- Helpers réutilisables existants : `effectiveTypeHabitat` + `getLieuTerms` (`components/immeubles/lieu-terms.ts`), calcul de progression par immeuble (dupliqué dans `app/(app)/(tabs)/immeubles.tsx` `getLieuMeta`/loops). Route fiche `/lieu/[id]` (`app/(app)/lieu/[id].tsx`).

## Acceptance Criteria (testables)
1. Une query mobile `quartiers` renvoie les quartiers du user avec, pour chaque bâtiment : id, adresse, lat/long, typeHabitat, nbEtages, nbPortesParEtage, nbMaisonsPrevu, et **portes (id, statut, etage)**.
2. Sur la carte, les quartiers du user apparaissent comme **marqueurs distincts** (style différent des bâtiments) avec le **nom** + **nb de bâtiments**.
3. Taper un quartier sur la carte ouvre l'écran `/quartier/[id]` en plein écran (back → carte).
4. L'écran quartier affiche : **mini-carte** centrée sur le quartier avec un pin par bâtiment (couleur = avancement/type), **progression globale** du quartier (X/Y bâtiments prospectés ou % portes), et **liste des bâtiments** avec leur progression individuelle + type (Maison/Pavillon/Immeuble via `effectiveTypeHabitat`).
5. Taper un bâtiment de la liste (ou son pin) → ouvre `/lieu/[id]` (la fiche de prospection existante).
6. États gérés : chargement (spinner), quartier introuvable (message + retour), quartier sans bâtiment (empty state).
7. `npx tsc --noEmit` = 0 erreur ; aucun accès cross-user (la query est déjà ownership-scopée).

## Implementation Steps

### Backend (prowin-web) — 1 changement minimal
1. `immeuble.service.ts:358-362` — `findQuartiers` : changer `include: { immeubles: true }` en `include: { immeubles: { include: { portes: true } } }` pour que la progression soit calculable. (Reste ownership-scopé, aucun autre changement.) Vérifier `npm run build`.

### Mobile — data layer
2. `services/api/immeubles/immeuble.queries.ts` (nouveau fichier ou ajout) : `GET_QUARTIERS` GraphQL = `quartiers { id nom latitude longitude immeubles { id adresse latitude longitude typeHabitat nbEtages nbPortesParEtage nbMaisonsPrevu portes { id statut etage } } }`.
3. `services/api/immeubles/immeuble.service.ts` : ajouter `getQuartiers(): Promise<Quartier[]>`.
4. `hooks/api/use-quartiers.ts` (nouveau) : hook via `useApiCall` (pattern existant), cacheKey `quartiers:{role}:{userId}`.

### Mobile — utilitaire partagé (DRY)
5. Extraire le calcul de progression par immeuble (aujourd'hui inline dans `immeubles.tsx`) dans `components/immeubles/lieu-progress.ts` : `getImmeubleProgress(immeuble) -> { total, prospectees, percent, color }` (utilise `effectiveTypeHabitat`). Réutilisé par `immeubles.tsx`, la vue quartier, et la carte.

### Mobile — entrée carte
6. `app/(app)/carte-terrain.tsx` : charger les quartiers (hook), afficher un **marqueur quartier** distinct (icône groupe + nom + count) en mode VISUALISATION ; `onPress` → `router.push('/quartier/${id}')`. Ne pas interférer avec les modes création (BATIMENT/QUARTIER) ni le double-push (réutiliser la garde `navigatingRef`).

### Mobile — écran quartier
7. `app/(app)/quartier/[id].tsx` (nouveau, route Stack plein écran) :
   - `useLocalSearchParams` → id ; `useQuartiers` → trouver par id (pattern identique à `/lieu/[id]`).
   - Header : nom du quartier + progression globale (somme des progrès bâtiments) + bouton retour (`router.back()`).
   - **Mini-carte** MapLibre (réutiliser le style `MAP_STYLE_URL`) centrée sur le barycentre/centre du quartier, un `Marker` par bâtiment (couleur via `getImmeubleProgress`/type), `onPress` pin → `/lieu/[id]`.
   - **Liste** des bâtiments (FlatList) : adresse + chip type (`effectiveTypeHabitat`/`getLieuTerms`) + barre de progression (`getImmeubleProgress`) ; `onPress` → `router.push('/lieu/${immeuble.id}')`.
   - États loading / introuvable / vide.

## Risks & Mitigations
- **R1 — findQuartiers sans portes** (bloquant) → étape 1 (include portes). Sans ça, pas de progression. Mitigation incluse.
- **R2 — Déploiement backend** : la query `quartiers`+portes doit être déployée sur staging pour que le mobile l'exploite. Mitigation : signaler ; le mobile gère un état vide/chargement proprement si la donnée manque.
- **R3 — Encombrement carte** : marqueurs quartier + bâtiments peuvent surcharger. Mitigation : style distinct (icône groupe), et n'afficher les quartiers qu'en mode VISUALISATION.
- **R4 — 2e instance MapLibre** (mini-carte) = coût perf/mémoire. Mitigation : carte légère, non interactive si besoin (zoom limité), `preferredFramesPerSecond` bas comme la carte principale.
- **R5 — Duplication logique progression** → étape 5 (util partagé) avant d'ajouter un 3e site.
- **R6 — Runtime de test** : tablette sur APK release (pas de live reload). Mitigation : itérer en dev client puis rebuild APK, OU rebuild APK en fin.

## Verification Steps
1. `npx tsc --noEmit` (mobile) = 0 erreur ; `npm run build` (backend) OK.
2. Sur device (dev client recommandé pour itérer) : créer un quartier de 2-3 bâtiments → revenir sur la carte → le marqueur quartier apparaît → tap → l'écran quartier montre mini-carte + liste avec progression → tap un bâtiment → fiche `/lieu/[id]` → back revient au quartier → back revient à la carte.
3. Prospecter un bâtiment, revenir au quartier → la progression du bâtiment est à jour (refetch).
4. Vérifier qu'un user ne voit que SES quartiers (query déjà scopée).

## Découpage d'exécution proposé
- Lot A (backend) : étape 1 + déploiement staging.
- Lot B (mobile data + util) : étapes 2-5.
- Lot C (mobile UI) : étapes 6-7.
- Puis rebuild APK staging + test device.
