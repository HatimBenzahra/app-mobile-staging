# Plan — Rendre la sidebar (NavigationRail) scrollable

## Contexte
`components/navigation/NavigationRail.tsx` est le rail vertical gauche (largeur 80),
toujours visible (`app/(app)/index.tsx`). Il liste jusqu'à **9 items** (mode manager).
Aujourd'hui les items vivent dans une `View` (`navSection`, `flex: 1`) **sans scroll** :
sur petit écran / portrait, les derniers items débordent et sont coupés.

Le `HamburgerMenuOverlay` a déjà un `ScrollView` → rien à faire de ce côté.

## Objectif
Le **logo reste fixe** en haut ; **seule la liste des items scrolle** verticalement
quand elle dépasse la hauteur disponible.

## Contrainte technique (à ne pas casser)
L'indicateur actif est une `Animated.View` **absolue** (`indicatorWrap` +
`indicatorPill`) dont le `translateY` est interpolé à partir des positions
`itemYs[i]` mesurées via `onLayout` de chaque item. Ces `y` sont relatifs au
conteneur parent des items. **L'indicateur DOIT donc rester dans le même
conteneur de scroll que les items**, sinon il se désaligne dès qu'on scrolle.

## Changement proposé
Dans `NavigationRail.tsx` :

1. Importer `ScrollView` depuis `react-native`.
2. Remplacer la `View style={styles.navSection}` par un `ScrollView` :
   - `style={styles.navSection}` (garde `flex: 1` → hauteur bornée = zone scrollable)
   - `contentContainerStyle={styles.navSectionContent}` (porte `alignItems: center`
     + `gap: 4` qui étaient sur `navSection`)
   - `showsVerticalScrollIndicator={false}`
3. Garder **l'indicateur ET les items comme enfants du contentContainer** (ordre
   inchangé) → mesures `onLayout` et `translateY` restent cohérents, l'indicateur
   scrolle avec les items.
4. Styles :
   - `navSection` : `{ flex: 1, alignSelf: "stretch" }` (le ScrollView prend la
     largeur pour un scroll confortable ; `alignItems` déplacé vers le content).
   - nouveau `navSectionContent` : `{ alignItems: "center", gap: 4 }`.

Aucune modif de `index.tsx` ni de l'API du composant. Aucun nouveau composant.

## Vérification
- `npm run lint` + typecheck OK.
- Manager (9 items) : la liste scrolle, logo fixe, indicateur suit le swipe **et**
  reste aligné après scroll.
- Commercial (8 items) : comportement identique, pas de scroll inutile si ça tient.
