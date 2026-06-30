# Plan — Lieux (tri + « Tous »), contour carte gaté, et « Voir sur la carte »

**Statut : pending approval** — aucun fichier source ne sera modifié avant ton accord explicite.

## Demandes (4 points)

1. **Tri par récence** dans l'onglet Lieux : du plus récent au plus ancien, en tenant compte de `createdAt` **et** `updatedAt` (un bâtiment anciennement créé mais récemment **modifié** doit remonter). → clé de tri = **max(createdAt, updatedAt)** décroissant.
2. **Filtre « Tous »** : doit montrer **les quartiers ET tous les types de bâtiments** ensemble (pas seulement les bâtiments).
3. **Contour quartier sur la carte gaté par le toggle équipe** : aujourd'hui les contours de quartiers d'équipe s'affichent même quand le toggle « équipe » est OFF. → le contour ne doit englober que les **bâtiments visibles**.
4. **Lien card → carte** : depuis une card de l'onglet Lieux, un passage vers la carte qui **centre** le point du bâtiment (`easeTo`) et le **met en évidence** (couleur/anneau), pour le visualiser.

## Faits (vérifiés)

- `Quartier` type a `commercialId/managerId/createdAt/updatedAt` ; `Immeuble` a `updatedAt` (parfois `createdAt`). `GET_QUARTIERS` (`services/api/immeubles/immeuble.queries.ts`) **ne sélectionne pas** `createdAt` → à ajouter (additif, le champ existe backend).
- Onglet Lieux : `app/(app)/(tabs)/immeubles.tsx` — `TYPE_CHIPS` (all/MAISON/PAVILLON/IMMEUBLE/quartiers), `filteredImmeubles` (déjà dédupliqué des membres de quartier), `filteredQuartiers`, routage quartier→`/quartier/[id]`, lieu→`/lieu/[id]`.
- Carte : `components/carte-terrain/QuartierContours.tsx` (contours), `TerrainMarkers.tsx` (marqueurs), `useCarteTerrain.ts` expose `immeubles` (déjà gaté par `showTeam`) et `quartiers`.
- Onglets : `app/(app)/index.tsx` (`AppContent`) détient `index`/`setIndex` des `SwipeTabs` ; `SwipeTabs` reçoit `index`/`onIndexChange` et a déjà un `handleNavigateToImmeuble`. Pattern de contexte partagé existant : `hooks/use-profile-sheet.tsx`. Caméra : `cameraRef.easeTo({center,zoom})` dans `useCarteTerrain`.

## Acceptance criteria (testables)

- [ ] Dans chaque filtre de Lieux, les items sont triés du plus récent au plus ancien selon **max(createdAt, updatedAt)** ; un bâtiment récemment modifié remonte.
- [ ] Le filtre **« Tous »** affiche à la fois des cards **quartier** et des cards bâtiment (Maison/Pavillon/Immeuble), triées ensemble par récence ; les bâtiments membres d'un quartier restent exclus (montrés sous leur quartier).
- [ ] Toggle équipe **OFF** → aucun contour de quartier d'équipe (le contour n'entoure que des bâtiments visibles) ; **ON** → contours d'équipe réapparaissent.
- [ ] Depuis une card bâtiment, une action « Voir sur la carte » bascule sur l'onglet carte, **centre** la caméra sur le point et le **met en évidence** quelques secondes.
- [ ] `npx tsc --noEmit` = 0 erreur ; `npx eslint` sur les fichiers touchés = clean.

## Implémentation

### Partie 1 — Tri par récence + « Tous » mixte (`immeubles.tsx`)
1. Helper `recencyMs(item)` = `Math.max(Date.parse(createdAt ?? 0), Date.parse(updatedAt ?? 0))`, fallback `item.id` (proxy si dates absentes). Appliqué aux immeubles ET quartiers.
2. Trier `filteredImmeubles` et `filteredQuartiers` par `recencyMs` décroissant.
3. **« Tous »** : construire une liste **mixte** `{type:'quartier'|'lieu', item}` = quartiers + immeubles standalone (dédup membres conservée), triée par `recencyMs` desc, rendue avec la bonne card selon le type et le bon routage (`/quartier/[id]` vs `/lieu/[id]`).
4. Ajouter `createdAt` à `GET_QUARTIERS` (additif) pour un tri correct des quartiers.

### Partie 2 — Contour gaté sur les bâtiments visibles (`QuartierContours.tsx`, `carte-terrain.tsx`)
5. `QuartierContours` reçoit en plus `immeubles: Immeuble[]` (la liste **déjà gatée** par `showTeam`). Construire `visibleIds = Set(immeubles.map(i=>i.id))`.
6. Pour chaque quartier, ne garder que ses `immeubles` dont l'`id ∈ visibleIds`, et construire le polygone à partir de **ces** points. 0 visible → pas de contour. → quand toggle OFF, les quartiers d'équipe (bâtiments masqués) n'ont plus de contour.
7. `carte-terrain.tsx` : passer `immeubles={immeubles}` à `<QuartierContours>`.

### Partie 3 — « Voir sur la carte » (centrer + mettre en évidence)
8. Nouveau contexte `hooks/use-map-focus.tsx` (sur le modèle de `use-profile-sheet`) exposant `{ focusTarget: {id, longitude, latitude} | null, focusOnMap(immeuble), clearFocus() }`.
9. `app/(app)/index.tsx` : englober dans `MapFocusProvider` ; quand `focusOnMap` est appelé, **basculer l'onglet** sur « carte » (`setIndex(carteIdx)`) — soit via un callback fourni au provider, soit en faisant écouter `AppContent` au `focusTarget`.
10. `immeubles.tsx` : sur chaque card bâtiment (pas quartier), une action **« Voir sur la carte »** (icône `map-pin`/`crosshair`) → `focusOnMap(immeuble)`.
11. `useCarteTerrain.ts` / `carte-terrain.tsx` : consommer `focusTarget` ; à son changement, `cameraRef.easeTo({center:[lng,lat], zoom:~17})` puis `clearFocus()` après recentrage. Exposer un `highlightedId` (= focusTarget.id) pendant quelques secondes.
12. `TerrainMarkers.tsx` : le marqueur dont l'`id === highlightedId` reçoit un style **mis en évidence** (anneau/halo, taille accrue, ou couleur d'accent temporaire). Disparaît après ~3 s ou au prochain tap.

## Risques & points d'attention
- *Tri mixte « Tous »* : deux types d'items dans une même liste → bien typer l'union et router correctement par type. (Risque faible.)
- *Contour gaté* : le polygone épouse désormais les bâtiments visibles → un quartier partiellement visible aura un contour partiel (acceptable et cohérent avec « ce qu'on voit »).
- *Cross-tab focus* : la carte est montée en lazy (TabView). Au 1ᵉʳ accès, `cameraRef` peut ne pas être prêt → re-tenter le `easeTo` à la prochaine frame / au focus de l'onglet. À valider device.
- *Highlight* : nettoyage du timer (éviter setState après démontage). 
- Tout le rendu carte (contour, easeTo, highlight) n'est **vérifiable que sur device**.

## Séquencement (exécution parallélisable)
- **Stream 1** (`immeubles.tsx` + `GET_QUARTIERS`) : Parties 1 (tri + « Tous »).
- **Stream 2** (`QuartierContours.tsx` + `carte-terrain.tsx`) : Partie 2 (gating contour).
- **Stream 3** (nouveau contexte + `index.tsx` + `immeubles.tsx` action + `useCarteTerrain`/`carte-terrain`/`TerrainMarkers`) : Partie 3 (focus).
- ⚠️ Streams 1 et 3 touchent **tous deux `immeubles.tsx`** → à NE PAS paralléliser entre eux (faire 1 puis 3, ou les fusionner en un seul stream). Stream 2 est disjoint et peut tourner en parallèle.
- Plan d'exécution proposé : **Stream 2 en parallèle** de **(Stream 1 → Stream 3)** séquentiels sur `immeubles.tsx`.

## Hors périmètre
- Visualisation des quartiers sur le **web** (supervision) — discuté séparément ; la donnée le permet, le frontend web n'a pas encore d'UI quartier.
- Backend « temps par porte » (fast-follow déjà identifié).
