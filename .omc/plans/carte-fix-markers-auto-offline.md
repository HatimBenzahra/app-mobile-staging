# Plan — Réparer l'affichage des bâtiments + offline automatique (carte mobile)

**Statut : pending approval** — aucun fichier source ne sera modifié avant ton accord explicite.

## Contexte / problèmes

1. **RÉGRESSION (bloquant)** : les bâtiments créés n'apparaissent plus sur la carte terrain — on ne voit que le fond. Apparu après la migration des marqueurs React `<Marker>` → couches natives `GeoJSONSource` clusterisées (`components/carte-terrain/TerrainMarkers.tsx`).
2. **UX** : trop de boutons sur la carte ; le FAB « télécharger zone offline » déroute. L'utilisateur veut un téléchargement offline **automatique**, sans bouton.

## Diagnostic (faits vérifiés, lecture seule)

L'API MapLibre est utilisée correctement côté JS — donc le bug n'est pas un mauvais nom de prop :
- `GeoJSONSource` accepte un objet GeoJSON : `data: string | GeoJSON.GeoJSON`, stringifié en interne (`GeoJSONSource.tsx:97,231`).
- La source **injecte `source` dans ses `<Layer>` enfants** via `cloneReactChildrenWithProps(children, { source: frozenId })` (`GeoJSONSource.tsx:241`) ; notre `source={...}` explicite est redondant mais identique → sans effet néfaste.
- `Layer` accepte bien `source`, `filter`, `paint`, `layout` (`Layer.tsx:94`).
- Le memo `immeubles` (`useCarteTerrain.ts:90-119`) renvoie toujours les bâtiments (own = MINE, team = TEAM), dédupliqués, coords non-nulles. Donnée présente.

**Cause racine** : on a échangé un rendu connu-fonctionnel (`<Marker>`, overlay React toujours au-dessus) contre des **couches de style natives** dont le rendu dépend de facteurs natifs non vérifiables statiquement :
- ordre d'insertion des couches (peuvent passer sous des couches du style),
- `text-field` avec **emoji** (🏢/🏠/🏡/🏘) qui requiert les glyphs du style — souvent non rendus, et selon le moteur peut perturber la couche `symbol`,
- timing de clustering au zoom initial.

Le rendu natif ne se valide qu'avec un **build device + logs**. La régression était le risque « device-only » signalé.

## Décision recommandée

**Restaurer un rendu de marqueurs connu-fonctionnel (React `<Marker>`) en conservant les gains visuels** (couleur = propriétaire turquoise/ambre, glyph = type, légende), et traiter le **clustering natif comme une amélioration séparée et optionnelle** validée plus tard sur device. Cela rétablit immédiatement la visibilité des bâtiments, sans dépendre d'un device pour avoir confiance (c'est le chemin de rendu d'avant cette session).

## Acceptance criteria (testables)

- [ ] Les bâtiments existants (miens + équipe pour un manager) réapparaissent sur la carte en mode VISUALISATION.
- [ ] Encodage visuel conservé : pastille turquoise = mes lieux, ambre = lieux de l'équipe ; icône d'habitat (🏢/🏠/🏡 ou `HabitatIcon`) lisible ; quartiers distincts (violet).
- [ ] Légende toujours présente et cohérente avec le rendu.
- [ ] Tap sur un bâtiment en VISUALISATION → ouvre le panneau (seam `setSelectedExistingLieu` préservé). Création/édition/déplacement/suppression inchangés.
- [ ] Plus de FAB « télécharger » sur la carte. Le téléchargement offline se déclenche **automatiquement** (au chargement de la carte / quand en ligne) autour de la zone courante, en silencieux.
- [ ] `npx tsc --noEmit` = 0 erreur ; `npx eslint` sur les fichiers touchés = clean.

## Étapes d'implémentation

### Partie A — Réparer l'affichage des marqueurs (`TerrainMarkers.tsx`)
1. Revenir à un rendu par `<Marker>` (overlay React) pour les immeubles persistés et les quartiers (réutiliser la logique d'avant la migration, mais en gardant l'encodage à 2 axes) :
   - couleur de fond = appartenance (`#0D9488` MINE / `#D97706` TEAM) via `immeuble.ownership` (déjà tamponné dans le hook) ;
   - icône d'habitat via `HabitatIcon` (`components/immeubles/habitat-icon.tsx`) — fiable, pas de dépendance aux glyphs emoji ;
   - quartiers : badge violet `#7C3AED` + icône quartier, tap → `onSelectQuartier`.
2. Conserver `onSelectLieu` (tap en VISUALISATION uniquement) et le seam pour la future modal. Conserver les props de feature/données déjà stampées (`creatorName`, `commercialId`, KPI) pour la modal.
3. Supprimer le code `GeoJSONSource`/`Layer`/cluster de ce fichier (ou le garder derrière un flag désactivé). Retirer `cameraRef`/`getClusterExpansionZoom` devenus inutiles côté tap.
4. (Optionnel, séparé) Garder une note/issue : « clustering natif à réintroduire et valider sur device » si le nombre de marqueurs devient un problème de perf côté manager.

### Partie B — Offline automatique + retrait du bouton
5. `components/carte-terrain/MapFabs.tsx` : retirer le FAB de téléchargement + le badge `%` (et styles associés `offlineProgress`/`offlineProgressText` si plus utilisés).
6. `hooks/carte-terrain/useCarteTerrain.ts` : transformer `downloadCurrentArea` (manuel) en déclenchement **automatique** :
   - au montage de la carte / dès que `mapCenter` est connu ET qu'on est en ligne (`connectivity.service`), lancer `downloadAreaPack` **une seule fois** par zone (réutiliser `getAreaPackName` + `listOfflinePacks` pour ne pas re-télécharger si le pack existe déjà) ;
   - silencieux : pas d'`Alert` en cas d'échec (juste `__DEV__` warn) ; pas d'UI bloquante.
   - garder l'état de progression interne si utile, mais sans bouton.
7. Conserver `map-offline-pack.service.ts` (logique inchangée), seul le **déclencheur** passe de manuel à auto.

### Vérification
8. `npx tsc --noEmit` + `npx eslint` sur tous les fichiers touchés.
9. **Validation device (obligatoire, par toi)** : build dev → ouvrir la carte → vérifier que les bâtiments s'affichent (miens + équipe), couleurs/icônes correctes, tap → panneau ; couper le réseau après chargement → carte + données toujours là.

## Risques & mitigations
- *Le revert ré-introduit le problème de perf (pas de clustering) côté manager avec beaucoup de marqueurs* → acceptable court terme ; clustering natif ré-évalué séparément sur device. **Mitigation** : limiter/centrer si besoin, mesurer.
- *Auto-download consomme de la data sans action utilisateur* → borné à 1 pack ~3 km, vectoriel seulement, une fois par zone, uniquement en ligne ; satellite ESRI toujours exclu (CGU).
- *Double-déclenchement du download* → garde via `getAreaPackName` + vérification d'existence avant `createPack`.

## Hors périmètre (à planifier ensuite, comme demandé)
- Modal de consultation au clic (créateur, statuts, durées par porte, KPI) — le seam et les données sont déjà prêts ; nécessitera d'étendre `GET_MANAGER_PERSONAL` (portes des immeubles d'équipe) ou un fetch paresseux.
