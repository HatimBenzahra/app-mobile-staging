# Plan — Optimisation de la fluidité (app-mobile)

**Statut : `pending approval`** — aucune modification de code tant que l'exécution n'est pas explicitement approuvée.
**Date :** 2026-07-01
**Branche courante :** CARTE_PROSPECTION
**Décisions cadrage :** Marqueurs carte = **mémoïsation seule** (pas de migration SymbolLayer). Couche données = **incluse** (dédup + invalidation ciblée), testée soigneusement.

---

## Résumé des exigences

Optimiser la fluidité de toute l'application (rendus, listes, animations, graphiques, réseau) en appliquant **toutes les actions recommandées** issues des 4 audits (carte, listes/détails, navigation/charts, couche données), en écartant les faux positifs déjà identifiés. Implémentation **soignée et progressive**, avec vérification à chaque phase (build TS + lint) et **aucune régression fonctionnelle ou visuelle**.

Objectif transverse : zéro changement de comportement observable pour l'utilisateur, hormis une meilleure fluidité.

---

## Critères d'acceptation (testables)

1. `npx tsc --noEmit` → `TSC_EXIT: 0` après chaque phase.
2. `npm run lint` → 0 erreur nouvelle introduite (warnings préexistants tolérés mais non aggravés).
3. **Aucun changement visuel** : cartes immeubles/quartiers, marqueurs, graphiques, animations header/hamburger/tabs identiques à l'œil.
4. Recherche `immeubles.tsx` : la frappe ne recalcule plus `filteredImmeubles`/`immeublesEnCours`/`mixedRows` à chaque caractère (debounce vérifiable : un seul recalcul ~200 ms après la dernière frappe).
5. Onglet Statistiques : plus de remount du `LineChart` au retour de focus (`chartKey` supprimé), les données s'animent via `animateOnDataChange`.
6. `getImmeubleProgress` n'est plus appelé plus d'une fois par immeuble par cycle de filtrage (pré-calcul en Map).
7. Listes de portes (`ProspectedDoorsList`) virtualisées : les `FloorSection`/`PorteTile` hors écran ne sont pas montés initialement (vérif : `initialNumToRender` borné + rendu incrémental au scroll).
8. `useApiCall` : deux appels concurrents de la même `cacheKey` ne déclenchent qu'**une** requête réseau (dédup in-flight vérifiable via un compteur/log temporaire).
9. Une mutation de porte (`PORTE_UPDATED`) n'invalide plus `workspace-profile`/`quartiers` inutilement (invalidation ciblée), sans casser le rafraîchissement des écrans concernés.
10. Test de non-régression manuel : créer/éditer/déplacer/supprimer un lieu, changer statut de porte, naviguer entre tous les onglets, mode offline (voir carte + queue portes) → tout fonctionne comme avant.

---

## Principe d'implémentation

- **Une phase = un commit atomique** (ou petit groupe), buildé et linté avant de passer à la suivante.
- **Refactors de pure mémoïsation d'abord** (risque quasi nul), **puis** changements de comportement de cache (risque plus élevé) en dernier.
- Chaque nouveau composant `React.memo` extrait conserve **exactement** le même JSX/styles qu'aujourd'hui.
- Les `useCallback`/`useMemo` ajoutés ne doivent pas changer les dépendances fonctionnelles (mêmes valeurs, juste identités stabilisées).

---

## PHASE 0 — Préparation (0 risque)

**Étape 0.1** — Créer une branche de travail depuis `CARTE_PROSPECTION` : `perf/fluidite-app`.
**Étape 0.2** — Snapshot de référence : lancer `npx tsc --noEmit` et `npm run lint` pour capturer l'état initial (baseline d'erreurs/warnings).
**Vérif :** baseline enregistrée.

---

## PHASE 1 — Fluidité immédiate (Priorité 1, gain le plus visible)

### 1.1 — Debounce de la recherche (`app/(app)/(tabs)/immeubles.tsx`)
- **Problème** : `query` (l.140) alimente directement `filteredImmeubles` (l.247-257), `immeublesEnCours` (l.270-282), `mixedRows` (l.341-362) → recalcul + re-render complet à chaque frappe.
- **Action** : introduire un `deferredQuery` (via `useDeferredValue` de React 19, déjà dispo — `react@19.1.0`) et utiliser `deferredQuery` dans les `useMemo` de filtrage, tout en gardant `query` pour le `TextInput` (réactivité visuelle du champ conservée).
- **Alternative** si `useDeferredValue` insuffisant : debounce manuel 200 ms via `useEffect` + timer sur un état `debouncedQuery`.
- **Fichiers** : `immeubles.tsx` (l.140, 247-362).
- **Vérif** : la frappe reste fluide sur un gros parc ; résultat filtré identique après stabilisation.

### 1.2 — Pré-calcul unique de `getImmeubleProgress` (`immeubles.tsx`)
- **Problème** : `immeublesEnCours` (l.270-282) appelle `getImmeubleProgress` dans le `filter`, puis `progressByImmeubleId` (l.403-425) le rappelle → double calcul par immeuble.
- **Action** : construire une Map `progressByImmeubleId` à partir de `filteredImmeubles` **avant** le filtrage par progression, et lire cette Map dans le prédicat de `immeublesEnCours` (plus aucun appel `getImmeubleProgress` dans le filter).
- **Fichiers** : `immeubles.tsx` (l.270-282, 403-425).
- **Vérif** : mêmes listes qu'avant ; `getImmeubleProgress` appelé 1×/immeuble.

### 1.3 — Suppression du remount du graphique Statistiques (`app/(app)/(tabs)/statistiques.tsx`)
- **Problème** : `setChartKey(prev => prev + 1)` au focus force un remount complet du `LineChart` (200-400 ms de jank) ; deux `useEffect` déclenchent un double refetch (l.231-271).
- **Action** :
  a. Retirer `chartKey` et la prop `key={...}` du `LineChart` ; s'appuyer sur `isAnimated` + `animateOnDataChange` pour animer les changements de données sans remount.
  b. **Fusionner les deux `useEffect`** (subscribe dataSync + refetch-on-focus) en un seul effet cohérent, sans double refetch.
- **Fichiers** : `statistiques.tsx` (l.231-271, ~597, ~680-729).
- **Vérif** : retour sur l'onglet Stats fluide, graphique animé sans clignotement/remount ; une seule série de refetch au focus.

### 1.4 — Virtualisation des listes de portes
- **Problème** : `ProspectedDoorsList.tsx` (l.118-129) rend les `FloorSection` via `.map()` dans une `View`, et `FloorSection.tsx` (l.42-49/117-124) rend les `PorteTile` via `.map()` → tout monté d'un coup.
- **Action** :
  a. Dans `ProspectedDoorsList`, remplacer le `.map()` des sections par une `FlatList`/`SectionList` (ou `FlashList` si déjà dispo — sinon FlatList) avec `keyExtractor`, `windowSize`, `removeClippedSubviews`.
  b. Stabiliser `onPorteTap` en amont via `useCallback` ; mémoïser le rendu des tuiles dans `FloorSection` (`useMemo` sur `portes`).
  c. Vérifier que `PorteTile` est bien `React.memo` (l'audit indique un `memo` déjà présent — confirmer et rendre `onPress` stable).
- **Fichiers** : `ProspectedDoorsList.tsx`, `FloorSection.tsx`, `PorteTile.tsx`.
- **⚠️ Point d'attention** : ces listes sont probablement dans un conteneur scrollable (ImmeubleDetailsScreen). Vérifier l'imbrication de scroll (VirtualizedList dans ScrollView) → utiliser `scrollEnabled={false}` + laisser le parent scroller, ou remonter la virtualisation au niveau parent. **Ne pas introduire l'avertissement "VirtualizedLists should never be nested".**
- **Vérif** : scroll fluide sur immeuble à 100+ portes ; rendu incrémental ; pas de warning de nesting.

**Gate Phase 1** : build TS + lint verts, test manuel écrans Immeubles / Stats / détail immeuble.

---

## PHASE 2 — Re-renders en cascade (Priorité 2, sûr)

### 2.1 — Mémoïsation des composants de la carte
- **TerrainMarkers.tsx** : envelopper `TerrainMarkers` dans `React.memo` ; extraire le `.filter().map()` dans un `useMemo` ; mémoïser `PulsingMarkerBadge` (`React.memo`). **Garder les `<Marker>` React** (décision : pas de SymbolLayer).
- **DraftPins.tsx** : `React.memo` + `useMemo` sur le `.map()` des `quartierPins`.
- **QuartierContours.tsx** : `React.memo` (le `useMemo` interne existe déjà).
- **useCarteTerrain.ts** : passer `handleMapPress`, `updateActivePin`, `selectQuartierPin`, `removeActiveQuartierPin`, `handleCreateBatiment`, `handleCreateQuartier` en `useCallback`.
- **carte-terrain.tsx** : stabiliser les arrow inline (`onSelectLieu` l.97, `onToggleSatellite` l.119, etc.) via handlers `useCallback`.
- **Fichiers** : `TerrainMarkers.tsx`, `DraftPins.tsx`, `QuartierContours.tsx`, `useCarteTerrain.ts`, `carte-terrain.tsx`.
- **Vérif** : marqueurs identiques visuellement, highlight/pulse fonctionne, pas de re-render des marqueurs lors de la frappe dans un panneau.

### 2.2 — Cartes de liste isolées (`immeubles.tsx`)
- **Problème** : `renderItem` inline (l.782) + `renderLieuCard`/`renderQuartierCard` retournent du JSX non mémoïsé → toutes les cartes montées re-render à chaque changement d'état.
- **Action** : extraire `LieuCard` et `QuartierCard` en composants `React.memo` distincts (mêmes props/JSX), sortir `renderItem` en fonction stable. Conserver l'animation d'apparition (`getCardAnimation`) — l'attacher au composant extrait via prop `anim`.
- **Fichiers** : `immeubles.tsx` (l.458-641, 782-936).
- **Vérif** : animations d'apparition conservées, scroll plus fluide, pas de re-render des cartes lors du toggle filtres.

### 2.3 — Stabilité du retour de `useApiCall` + deps d'effets écrans
- **Problème** : `useApiCall` renvoie un objet neuf à chaque render (l.255-260) ; `agenda.tsx` (l.120,134,148) et `statistiques.tsx` (l.252) mettent l'objet complet en deps → effets ré-exécutés/re-souscrits à chaque render (churn, pas fuite).
- **Action** :
  a. Dans `useApiCall`, mémoïser le retour via `useMemo` et stabiliser `refetch` (l'exposer comme référence stable, ex. `useCallback(() => run(true), [run])` — noter que `run` dépend de `fn`).
  b. **Stabiliser `fn`** : dans les hooks appelants (ex. `use-workspace-profile.ts`), envelopper la `fn` inline dans `useCallback([...deps])` pour que `run` (et donc l'effet l.218 + la souscription l.248) ne se recrée pas à chaque render.
  c. Dans `agenda.tsx`/`statistiques.tsx`, réduire les deps des `useEffect`/`onRefresh` (ne garder que `isFocused` + valeurs primitives), en capturant `refetch` désormais stable.
- **Fichiers** : `use-api-call.ts`, `use-workspace-profile.ts`, `use-commercial-activity.ts` (et autres hooks passant une `fn` inline — à recenser via `grep "useApiCall"`), `agenda.tsx`, `statistiques.tsx`.
- **⚠️ Point d'attention** : `run` dépend de `depsHash` et `fn`. Après stabilisation de `fn`, vérifier que le refetch se déclenche toujours quand `userId`/`role`/période changent réellement. **Test critique** : changement d'utilisateur/rôle → données rechargées.
- **Vérif** : plus de re-souscription par render ; données toujours rafraîchies aux bons moments.

### 2.4 — Providers mémoïsés
- **use-map-focus.tsx** (l.42) et **use-profile-sheet.tsx** : envelopper la `value` du Provider dans `useMemo`.
- **Fichiers** : `use-map-focus.tsx`, `use-profile-sheet.tsx`.
- **Vérif** : comportement focus/sheet identique.

**Gate Phase 2** : build TS + lint verts, test manuel Carte / Immeubles / Agenda / Stats + changement d'utilisateur.

---

## PHASE 3 — Animations & navigation (Priorité 2-3, modéré)

### 3.1 — AnimatedHeader : réduire les animations parallèles
- **Problème** (`AnimatedHeader.tsx` l.36-85) : 7 `Animated.Value` fade + 7 translate, 14 animations parallèles par changement d'onglet ; deps `fadeAnims`/`translateAnims` inutiles.
- **Action** : conserver le comportement visuel (fade/slide du titre actif) mais nettoyer les deps de l'effet (ne dépendre que de `currentIndex`) et ne pas recréer les tableaux d'`Animated.Value`. Garder `useNativeDriver: true`.
- **Vérif** : transition de titre identique, deps stables.

### 3.2 — HamburgerMenuOverlay : dimensionner les anims sur `menuItems.length`
- **Problème** (`HamburgerMenuOverlay.tsx` l.177-220) : 7 anims fixes, deps `itemAnims`/`menuItems.length` re-triggent.
- **Action** : générer les `Animated.Value` selon `menuItems.length`, effet dépendant de `isVisible` uniquement. Conserver le stagger visuel.
- **Vérif** : ouverture/fermeture menu identiques.

### 3.3 — SwipeTabs : réduire les deps de `renderScene`
- **Problème** (`SwipeTabs.tsx`) : `renderScene` a 10+ deps dont `index` → `useCallback` recréé à chaque changement d'onglet, lazy partiellement inefficace.
- **Action** : réduire les deps (`handleNavigateToImmeuble`, `headerHeight` seulement) ; passer l'info d'onglet actif via `route.key` plutôt que `index`. Conserver `lazy`.
- **⚠️** : ne PAS convertir les imports statiques en `React.lazy()` (l'audit le suggère mais RN/Metro gère le bundling différemment et `lazy` sur écrans de TabView peut casser le SSR-less mount — hors scope, risque > gain).
- **Vérif** : navigation onglets identique, pas de remount visible.

### 3.4 — BottomTabs : mémoïser les interpolations
- **Problème** (`BottomTabs.tsx` l.20-92) : interpolations recréées dans le render.
- **Action** : pré-calculer les interpolations par onglet dans un `useMemo` (dep = nombre d'onglets). Impact faible (natif) mais propre.
- **Note** : classé faible ; à faire si temps disponible.
- **Vérif** : animation d'onglet identique.

### 3.5 — EquipeScreen : isoler le calcul lourd
- **Problème** (`equipe.tsx` l.554-612) : triple boucle recalculée à chaque changement de période.
- **Action** : extraire `computeTeamSnapshot` en fonction pure hors composant (déjà en `useMemo`, garder deps `[team, period, periodStartKey, periodEndKey]`). Vérifier qu'aucune allocation inutile n'est faite hors changement de période. Optionnel : mémo intermédiaire par commercial si `team` stable.
- **Vérif** : classement/stats équipe identiques.

**Gate Phase 3** : build TS + lint verts, test manuel navigation complète + menu + équipe.

---

## PHASE 4 — Autres écrans de liste (Priorité 3)

### 4.1 — historique.tsx
- Optimiser `historyMetaByImmeuble` (l.546-555) : ne reconstruire `buildHistoryMeta` que si l'historique de l'immeuble a changé (cache par id/ref).
- Simplifier le comparateur `memo` de `HistoriqueImmeubleCard` (l.287-296).
- **Vérif** : historique identique, filtre 24h/all plus fluide.

### 4.2 — agenda.tsx
- Virtualiser la `cardList` (l.410-512) si le nombre d'items le justifie, sinon extraire `RdvCard`/`RepassageCard` en `React.memo` avec handler stable.
- **Vérif** : agenda identique, switch section fluide.

### 4.3 — quartier/[id].tsx
- Pré-calculer une Map `progress` (l.151-177, 202-227) ; mémoïser `renderItem` de la FlatList.
- **Vérif** : écran quartier identique.

### 4.4 — StatusGrid.tsx
- Stabiliser `onPress` (l.205-219) : handler `useCallback(handleSelectStatus)`.
- **Vérif** : sélection de statut identique.

### 4.5 — ImmeubleDetailsScreen.tsx & BuildingSheet.tsx
- `ImmeubleDetailsScreen` : combiner `sortedPortes`/`prospectedPortes`/`filteredPortes` (l.682-705) en passes minimales ; s'assurer que `updateLocalPorte` ne crée pas un nouvel état si rien ne change.
- `BuildingSheet.tsx` : mémoïser `counts`/`porteRows` (l.260-334), extraire `PorteItem` en `React.memo`.
- **Vérif** : détail immeuble + sheet identiques, changement de statut fluide.

**Gate Phase 4** : build TS + lint verts, test manuel Historique / Agenda / Quartier / détail.

---

## PHASE 5 — Couche données (Priorité 3, risque élevé, testé soigneusement)

### 5.1 — Request coalescing (dédup in-flight) dans `useApiCall`
- **Problème** : deux consommateurs de la même `cacheKey` déclenchent deux requêtes réseau parallèles ; aucune vérif "requête déjà en cours".
- **Action** : ajouter une Map module-level `pendingRequests: Map<string, Promise<T>>`. Dans `run`, si `cacheKey` présent dans `pendingRequests` et non `forceRefresh`, réutiliser la promesse en cours ; nettoyer en `finally`.
- **⚠️ Point d'attention** : bien gérer `forceRefresh` (invalidation explicite doit pouvoir relancer), le nettoyage sur succès **et** erreur, et l'unicité par `cacheKey` (pas par instance de hook).
- **Fichiers** : `use-api-call.ts`.
- **Vérif** : compteur temporaire → une seule requête pour N consommateurs simultanés ; refetch explicite fonctionne toujours.

### 5.2 — Invalidation ciblée dans `data-sync.ts`
- **Problème** : `invalidateWorkspaceCaches` (l.4-10) invalide 5 préfixes pour **toute** mutation, même une simple porte.
- **Action** : rendre l'invalidation dépendante de `eventType` :
  - `PORTE_*` → invalider `workspace-profile:` + `commercial-activity:` (données de prospection), **pas** `quartiers:` sauf si nécessaire.
  - `IMMEUBLE_*` → `workspace-profile:` + `quartiers:` + `commercial-activity:`.
  - `commercial-statistics:`/`commercial-timeline:` → invalider seulement sur événements pertinents.
- **⚠️ Point d'attention** : **régression = données périmées à l'écran**. Chaque type d'événement doit invalider au minimum tout ce dont dépend l'affichage impacté. Tester chaque flux (créer immeuble → liste + carte + quartiers à jour ; changer porte → détail + stats + agenda à jour).
- **Fichiers** : `data-sync.ts`, en croisant avec les appelants (`use-update-porte.ts`, `use-create-immeuble.ts`, `use-add/remove-etage`, `use-remove-porte.ts`).
- **Vérif** : tous les écrans se rafraîchissent correctement après chaque type de mutation (test manuel exhaustif).

### 5.3 — Debounce du flush offline sur reconnexion (`offline-queue.service.ts`)
- **Action** : garder une seule souscription connectivité (garde `connectivityUnsubscribe`) et débouncer `flushOfflineQueue` (~500 ms) pour éviter les flushes en rafale sur WiFi↔4G.
- **Fichiers** : `offline-queue.service.ts` (l.86-96).
- **Vérif** : la queue portes se vide bien à la reconnexion, sans double flush.

**Gate Phase 5** : build TS + lint verts + **test de non-régression données complet** (matrice mutation × écran).

---

## PHASE 6 — Vérification finale

- **6.1** — `npx tsc --noEmit` → `TSC_EXIT: 0`.
- **6.2** — `npm run lint` → pas de nouvelle erreur.
- **6.3** — `npm test` (si suite existante) → vert.
- **6.4** — Revue par agent `code-reviewer` sur le diff complet (lane séparée).
- **6.5** — Passe QA manuelle guidée : parcours utilisateur complet incl. offline.
- **6.6** — Comparaison visuelle avant/après (captures) sur écrans clés : Carte, Immeubles, Détail, Stats, Agenda, Équipe, Historique.

---

## PHASE 7 — Déploiement STAGING (uniquement)

**Contrainte utilisateur : déploiement STAGING seulement. JAMAIS prod.**

- **7.1** — Pré-requis : Phases 1-6 terminées et vertes (TS + lint + tests + QA).
- **7.2** — Déployer via : `npm run deploy:staging` (→ `./scripts/deploy-mobile.sh staging`).
- **7.3** — **Interdit** : `npm run deploy:prod` / `deploy-mobile.sh prod` — ne jamais exécuter.
- **7.4** — Vérifier la sortie du script de déploiement (succès, version publiée en staging).
- **7.5** — Rapporter le résultat du déploiement à l'utilisateur.
- **Vérif** : déploiement staging réussi, aucune commande prod exécutée.

---

## Risques & mitigations

| Risque | Prob. | Impact | Mitigation |
|---|---|---|---|
| Virtualisation portes → warning "VirtualizedList nested in ScrollView" | Moyen | Moyen | Vérifier l'imbrication parent ; `scrollEnabled={false}` ou remonter la liste au parent scrollable (Étape 1.4 ⚠️). |
| Stabilisation `fn`/`useApiCall` casse le refetch conditionnel (userId/rôle/période) | Moyen | Élevé | Test critique changement d'utilisateur/rôle/période après 2.3 ; garder `depsHash` fonctionnel. |
| Invalidation ciblée → données périmées à l'écran | Moyen | Élevé | Matrice mutation×écran (5.2), invalider au minimum toutes les dépendances d'affichage ; rollback facile (revenir à l'invalidation large). |
| Request coalescing → promesse partagée non nettoyée (blocage refetch) | Faible | Élevé | Nettoyage en `finally` (succès+erreur) ; `forceRefresh` bypass la dédup. |
| Régression visuelle sur cartes/anim après extraction `React.memo` | Faible | Moyen | JSX/styles copiés à l'identique ; comparaison visuelle (6.6). |
| Debounce recherche perçu comme "lag" du champ | Faible | Faible | Le `TextInput` reste piloté par `query` (réactif) ; seul le filtrage est différé. |

---

## Étapes de vérification (récapitulatif commandes)

```bash
# Après CHAQUE phase :
cd /Users/hatimbenzahra/Desktop/PRO_WIN/prowin/app-mobile
npx tsc --noEmit; echo "TSC_EXIT: $?"
npm run lint
# Phase 6 :
npm test
```

---

## Séquencement d'exécution recommandé

Phases **1 → 2 → 3 → 4** (fluidité UI, risque croissant maîtrisé), puis **5** (couche données, isolée et testée à part), puis **6** (vérif finale). Chaque phase est un point de commit/rollback indépendant.

## Ordre de priorité si le temps est limité

1. Phase 1 (impact ressenti maximal)
2. Phase 2.1 + 2.2 (carte + cartes liste)
3. Phase 5.1 + 5.2 (réseau)
4. Le reste (3, 4, 2.3, 2.4)

---

## Faux positifs écartés (ne PAS implémenter)

- `getItemLayout` "objets inline" (`immeubles.tsx`) — comportement normal, aucun impact.
- "Memory leak / listeners zombies" — les `useEffect` nettoient bien leurs souscriptions ; churn ≠ fuite.
- BottomTabs "18 interpolations" comme critique — natif, imperceptible (traité en 3.4 seulement par propreté).
- Migration `React.lazy()` des écrans de TabView — risque > gain, hors scope (3.3 ⚠️).
- Migration TanStack Query — chantier séparé, non inclus.
- Migration marqueurs → SymbolLayer — **exclue** par décision (mémoïsation seule en 2.1).
