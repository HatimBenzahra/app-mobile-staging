# Plan — Couleur card « Se déconnecter ? » + modal création zone en paysage

Deux corrections indépendantes, sans nouveau composant, tokens du thème réutilisés.

---

## 1. Card « Se déconnecter ? » délavée (`components/ProfileSheet.tsx`)

**Constat.** La carte de confirmation de déconnexion (état `confirmingLogout`) utilise
`<Card variant="filled" style={{ backgroundColor: colors.dangerSoft }}>`.
`dangerSoft` = `#FEF2F2` (rose très pâle) **sans bordure** → rendu « délavé ».

**Correction proposée (conserve la sémantique danger, plus nette) :**
- Fond : `colors.dangerSoft` (#FEF2F2) → **`palette.danger[100]`** (#FEE2E2), légèrement
  plus saturé mais toujours doux.
- Ajouter une **bordure définie** : `borderWidth: 1`, `borderColor: "#FECACA"`
  (= `palette.danger` 100/200), cohérente avec la bordure rouge déjà utilisée sur
  `logoutRow` (#FECACA) et le langage danger existant.
- Rien d'autre ne change (icône, titre, sous-titre, boutons Annuler/Confirmer).

> Alternative possible si tu préfères en annotant : garder #FEF2F2 et n'ajouter que la
> bordure #FECACA (correction minimale).

**Fichier :** `components/ProfileSheet.tsx` — l'inline style du `Card` `confirmingLogout`
(remplacer par un style nommé `confirmCard` dans le `StyleSheet` pour rester propre).

---

## 2. Modal de création de zone trop grand en paysage

**Constat.** `ZonePanel` (`components/carte-terrain/panels/ZonePanel.tsx`) est rendu via
`styles.panel` (`components/carte-terrain/styles.ts`) :
`position:absolute; left:14; right:14; bottom:14`. En paysage, la **pleine largeur**
+ tout le contenu (header, sommets, nom, chips d'assignation, bouton) recouvre presque
toute la carte.

**Correction proposée (panneau latéral compact en paysage, portrait inchangé) :**
- Dans `ZonePanel`, détecter l'orientation via `useWindowDimensions` :
  `const landscape = width > height`.
- En paysage, surcharger le style du `Card` :
  - `right: "auto"` + `width: 360` → ancré **en bas à gauche**, la carte reste visible à droite.
  - `maxHeight: height - (insets.top + insets.bottom + 28)` pour ne jamais dépasser l'écran.
- Comme la hauteur est réduite en paysage, envelopper le **corps** du panel
  (input nom + section « Assigner à » + bouton) dans un `ScrollView`
  (`showsVerticalScrollIndicator={false}`) pour que tout reste atteignable.
  Le header et la liste horizontale des sommets restent hors du scroll vertical.
- **Portrait : strictement inchangé** (pas de largeur fixe, pas de maxHeight).

**Fichiers :**
- `components/carte-terrain/panels/ZonePanel.tsx` — hook dimensions + style landscape
  conditionnel + wrapper ScrollView du corps.
- (Styles landscape ajoutés localement dans ZonePanel ou dans `styles.ts` selon cohérence.)

---

## Vérification
- `npx tsc --noEmit` + `npx eslint` sur les fichiers touchés : 0 erreur.
- Profil : la card « Se déconnecter ? » a un rouge net + bordure visible (plus délavé).
- Création zone **portrait** : identique à aujourd'hui.
- Création zone **paysage** : panneau compact à gauche (~360), carte visible à droite,
  contenu scrollable si nécessaire.
