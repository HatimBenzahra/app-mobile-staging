# Plan — Sidebar collapsible (toggle étroit ↔ large)

## Objectif
Rendre le `NavigationRail` (`components/navigation/NavigationRail.tsx`) pliable via un
bouton chevron :
- **Étroit (défaut)** : icônes seules, largeur ~72.
- **Large** : icône + **label à côté** (rangée horizontale), largeur ~220.
- Transition animée fluide. Pas de persistance (démarre toujours étroit).

## Contraintes à préserver (le rail est déjà animé)
1. **Indicateur actif** qui glisse verticalement en suivant le swipe des tabs
   (`position`, RN `Animated`, native driver, via `itemYs` mesurés en `onLayout`).
2. **Crossfade icône/label par proximité** pendant le swipe.
3. Le **scroll vertical** ajouté récemment (rail scrollable).

## Approche technique
- **Reanimated 4** (déjà présent) pilote un `progress` (`useSharedValue`, 0=étroit,
  1=large) via `withTiming(220ms)` sur toggle. On garde `useState(false)` pour l'état.
- On **imbrique** les deux systèmes d'animation, jamais sur le même noeud :
  - `Reanimated.View` pour la **largeur** du container et de l'indicateur + l'**opacité/largeur**
    des labels.
  - RN `Animated.View` reste pour le **translateY vertical** de l'indicateur (inchangé).
  - L'indicateur = `Animated.View` (RN, translateY) **contenant** un `Reanimated.View`
    (largeur animée). Aucun noeud ne mélange les deux libs.

## Changements — `NavigationRail.tsx`

### État & animation
- `const [expanded, setExpanded] = useState(false)` (défaut étroit).
- `const progress = useSharedValue(0)` ; `useEffect([expanded])` →
  `progress.value = withTiming(expanded ? 1 : 0, { duration: 220 })`.
- Constantes : `COLLAPSED_WIDTH = 72`, `EXPANDED_WIDTH = 220`.

### Container
- Devient `Reanimated.View` ; `useAnimatedStyle` →
  `width: interpolate(progress, [0,1], [72, 220])`. Reste en `flexDirection` colonne,
  `space-between` (logo haut / nav / toggle bas).

### NavItem (passe en RANGÉE)
- Nouveau layout **row** : `[iconPill]` à gauche (paddingLeft 12, aligné sur l'indicateur),
  puis un **bloc label animé** (`Reanimated.View`) à droite :
  `opacity: progress`, `width: interpolate(progress,[0,1],[0, LABEL_W])`, `overflow:hidden`
  → invisible et sans place en étroit, révélé en large.
- Items en `alignItems: stretch` (pleine largeur du rail) → contenu aligné à gauche.
- Le **crossfade proximité** existant est conservé (opacité RN `Animated` sur les copies
  icône/label), multiplié par l'opacité `progress` du conteneur label.
- **Couleur label actif = blanc** (`ICON_ACTIVE`) : en large, le label se trouve AU-DESSUS
  de l'indicateur orange → le blanc donne le bon contraste (le label n'apparaît qu'en large).

### Indicateur actif
- `indicatorWrap` : `left: 12` (au lieu de centré) pour s'aligner sur l'icône dans les deux modes.
- `indicatorPill` : hauteur 32 inchangée ; **largeur animée** (Reanimated interne)
  `interpolate(progress,[0,1],[48, EXPANDED_WIDTH-24])` → derrière l'icône seule en étroit,
  derrière toute la rangée (icône+label) en large. `translateY` vertical inchangé.
- En étroit : `left 12 + width 48` dans 72 → visuellement centré (12/12).

### Bouton toggle
- Ajouté **en bas** du rail (après le ScrollView) : `Pressable` avec `Feather`
  `chevron-right` (étroit → déplier) / `chevron-left` (large → replier). Style discret
  cohérent avec les FAB/pills du thème (`sidebar.*`).

## Effet de bord assumé
Le rail est **en flux** (`appLayout` en row) : déplier pousse `mainContent` (la carte se
réajuste). Ça n'arrive qu'au **toggle manuel** (pas pendant le swipe), défaut étroit →
impact minimal. (Alternative overlay = refonte plus lourde, non retenue.)

## Vérification
- `npx tsc --noEmit` + `npx eslint` sur `NavigationRail.tsx` : 0 erreur.
- Étroit : icônes seules, indicateur suit le swipe, scroll OK.
- Toggle : largeur s'anime 72↔220, labels apparaissent/disparaissent proprement.
- Large : rangées icône+label, indicateur orange derrière la rangée active, label blanc lisible.
- Test device requis pour valider le rendu/anim (je proposerai un lancement).
