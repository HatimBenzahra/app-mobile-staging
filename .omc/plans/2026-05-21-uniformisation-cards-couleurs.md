# Uniformisation Cards + Couleurs — Plan d'exécution

**Date** : 2026-05-21
**Objectif** : Toutes les pages réutilisent les MÊMES primitives UI (`Card`, `PressableCard`, `StatTile`, `IconBadge`, `Chip`, `ProgressBar`) et les MÊMES tokens couleur (depuis `constants/theme.ts`). Plus aucun hex en dur, plus aucune `StyleSheet` qui ré-invente un fond blanc + border + shadow.

---

## État actuel (déjà fait avant ce plan)

- ✅ `constants/theme.ts` — palette de marque (#005BFF) + tokens (colors / spacing / radius / fontSize / shadows)
- ✅ `components/ui/` — Card, PressableCard, IconBadge, Chip, StatTile, ProgressBar
- ✅ `components/dashboard/StatCard.tsx` et `RankCard.tsx` — déjà migrés vers Card + IconBadge + ProgressBar
- ✅ `immeubles.tsx` — 2 `StatTile` en haut de page (résumé)
- ✅ Couleurs globales sed'd (plus de #2563EB ancien)

## Ce qui reste — pages avec cards "à la main"

Liste exhaustive issue de l'audit page par page.

---

### 1. `app/(app)/(tabs)/dashboard.tsx`

| Style à supprimer | Remplaçant UI kit |
|---|---|
| `mainCard` (hero rang) | `<Card variant="elevated" padding="lg">` |
| `chartCard` | `<Card variant="elevated" padding="lg">` |
| `rankBadge` | `<IconBadge tone="warning" size="lg" />` |
| `infoButton` | `<PressableCard variant="filled" padding="none">` (taille fixe) |
| `conversionBadge` | container `<View>` + `IconBadge tone="success"` |
| `formulaItem` (×3) | `<Card variant="filled" padding="md">` |

Couleurs : tout déjà tokenisé. RAS.

---

### 2. `app/(app)/(tabs)/agenda.tsx`

| Style à supprimer | Remplaçant UI kit |
|---|---|
| `heroCard` | `<Card variant="elevated" padding="md">` |
| `kpiCard` (×2) | `<StatTile emphasis="default" />` |
| `sectionCard` | `<Card variant="elevated" padding="md">` |
| `card` / `cardRdv` (RDV item) | `<PressableCard variant="outlined" padding="sm">` |
| `repassageChip` | `<Chip>` avec tone semantic |
| `timeBadge` | `<IconBadge tone="primary" size="sm" />` (texte inside) |

Couleurs : à passer en tokens (`#FEF2F2` → `colors.dangerSoft`, `#FFFBEB` → `colors.warningSoft`, `#E5EEFF` → `colors.primarySoft`, `#E2E8F0` → `colors.border`).

---

### 3. `app/(app)/(tabs)/immeubles.tsx` (partiellement fait)

| Style à supprimer | Remplaçant UI kit |
|---|---|
| `card` (item immeuble) | `<PressableCard variant="outlined" padding="md">` |
| `filterChip` | `<Chip>` (composant existant) |
| `emptyCard` | `<Card variant="elevated" padding="md">` |
| `searchBar` (fond) | bg → `colors.primarySoft`, border → `colors.border` |

Couleurs `FILTER_CHIPS` (#22C55E, #16A34A) — pas dans le thème. Décision : on les laisse en hex (couleurs sémantiques par progression, hors palette), MAIS on les passe par un import nommé `progressColors` dans `constants/theme.ts` pour centraliser.

---

### 4. `app/(app)/(tabs)/statistiques.tsx`

| Style à supprimer | Remplaçant UI kit |
|---|---|
| `overviewCard` | `<Card variant="elevated" padding="lg">` |
| `sectionCard` | `<Card variant="elevated" padding="md">` |
| `kpiCard` (×6) | `<StatTile emphasis="default" />` |
| `rdvCard` | `<PressableCard variant="outlined" padding="md">` |
| `rdvTimeBadge` | `<IconBadge tone="primary" size="md">` + Text |

Couleurs : hex inlines dans `pieData` / chart props — à remplacer par `colors.primary`, `colors.success`, `colors.warning`, `colors.danger`.

---

### 5. `app/(app)/(tabs)/historique.tsx`

| Style à supprimer | Remplaçant UI kit |
|---|---|
| `card` (immeuble) | `<PressableCard variant="elevated" padding="md">` |
| `statChip` | `<Chip>` tone neutral |
| `historyDoorCard` | `<Card variant="outlined" padding="md">` |
| `timelineChip` (statut) | `<Chip>` avec map `STATUS_STYLE` qui pointe vers tokens |
| `emptyCard` / `historyEmptyPanel` | `<Card variant="outlined">` |

Couleurs : remplacer tous les hex (#FFFFFF, #005BFF, #0F172A, #E2E8F0, #94A3B8, etc.) par `colors.*`. `STATUS_STYLE` map à reconstruire avec tokens semantic (success / warning / danger / info).

---

### 6. `app/(app)/(tabs)/equipe.tsx`

| Style à supprimer | Remplaçant UI kit |
|---|---|
| `kpiCardPrimary` | `<Card variant="primary" padding="md">` |
| `kpiCardSecondary` | `<Card variant="outlined" padding="md">` |
| `kpiCardLight` | `<Card variant="outlined" padding="md">` |
| `performanceCard` | `<Card variant="outlined" padding="md">` |
| `sectionCard` | `<Card variant="outlined" padding="md">` |
| `listCard` (membre) | `<PressableCard variant="elevated" padding="md">` |
| `emptyCard` | `<Card variant="outlined" padding="lg">` |
| `kpiIcon*` (primary/secondary/light) | `<IconBadge tone="..." />` |
| `sectionIcon` | `<IconBadge tone="primary" size="md">` |
| `rankPill` / `pointsPill` | `<Chip>` |

Couleurs : `pointsPill` `#FFF7ED` → `colors.warningSoft`. Couleurs podium (Gold/Silver/Bronze) → conservées en hex mais déplacées dans `constants/theme.ts` sous `podium = { gold, silver, bronze }`.

---

### 7. `components/immeubles/*.tsx` + ProfileSheet/ProfileMenuOverlay

| Fichier | Changements clé |
|---|---|
| `ImmeubleDetailsScreen.tsx` | `progressCardNew*` → `<StatTile emphasis="primary" />`, `floorPlanDoorChip` → `<Chip>` |
| `AddImmeubleSheet.tsx` | `suggestionsCard` → `<Card variant="outlined">`, `summaryCard` → `<Card variant="filled">`, `switchRow` → `<Card variant="outlined">` |
| `AddPorteSheet.tsx` | `card` → `<Card variant="outlined">` |
| `PorteDetailSheet.tsx` | `factCard` → `<Card variant="outlined">`, `detailRow` (RDV) → `<Card variant="filled">` info tone, `commentBlock` → `<Card variant="outlined">` |
| `ConfirmActionOverlay.tsx` | `heroOuter`/`heroInner` → `<IconBadge tone="danger|success" size="lg">`, `highlightChip` → `<Chip>` |
| `PortePickerOverlay.tsx` | `tile` → `<PressableCard>`, `etageBadge` → `<IconBadge>`, `emptyCard` → `<Card variant="filled">` |
| `ProfileSheet.tsx` | `infoCard` → `<Card variant="outlined">`, `confirmCard` → `<Card variant="filled">` (danger soft bg), `roleBadge` → `<Chip>`, `avatarLarge` → `<IconBadge tone="primary" size="lg">` |
| `ProfileMenuOverlay.tsx` | `panel` → `<Card variant="elevated">`, `avatar` → `<IconBadge>`, `rolePill` → `<Chip>`, `confirmBlock` → `<Card variant="filled">` danger |

Couleurs : tous les hex à remplacer par `colors.*`.

---

## Pré-requis avant migration

**P0** — Étendre `constants/theme.ts` avec :
- `podium = { gold: "#FCD34D", silver: "#94A3B8", bronze: "#F5D0AE" }` (+ accents foncés pour text)
- `progressColors = { low: colors.danger, mid: colors.warning, high: "#22C55E", complete: "#16A34A" }` (utilisé par `FILTER_CHIPS` dans immeubles.tsx)

**P0** — Vérifier que `Card` accepte un override `style` (déjà OK, vérifié)
**P0** — Vérifier que `Chip` supporte un tone "neutral" + "danger" + "warning" + "info" + "success"

---

## Ordre d'exécution (page par page, du plus simple au plus complexe)

1. **Étape 1** — Étendre `theme.ts` (podium + progressColors)
2. **Étape 2** — Étendre `Chip.tsx` avec tones semantic si manquants
3. **Étape 3** — `dashboard.tsx` (déjà tokenisé, juste swap composants)
4. **Étape 4** — `agenda.tsx`
5. **Étape 5** — `historique.tsx`
6. **Étape 6** — `immeubles.tsx` (finir item card + filter chips)
7. **Étape 7** — `statistiques.tsx`
8. **Étape 8** — `equipe.tsx` (le plus gros — 1411 lignes)
9. **Étape 9** — `components/immeubles/*` (8 fichiers) + ProfileSheet/MenuOverlay
10. **Étape 10** — Sweep final : `grep -rn "#[0-9A-Fa-f]\{6\}" app/ components/` pour traquer les hex restants
11. **Étape 11** — `npx tsc --noEmit` pour vérifier la compilation
12. **Étape 12** — Build local + déploiement adb sur tablette

À chaque étape : marquer ✅ ici, build TS pour vérifier, passer à la suivante.

---

## Suivi d'avancement

- [x] Étape 1 — theme.ts (podium + progressColors)
- [x] Étape 2 — Chip.tsx tones
- [x] Étape 3 — dashboard.tsx
- [x] Étape 4 — agenda.tsx
- [x] Étape 5 — historique.tsx
- [x] Étape 6 — immeubles.tsx (item card)
- [x] Étape 7 — statistiques.tsx
- [x] Étape 8 — equipe.tsx
- [x] Étape 9 — components/immeubles/* + ProfileSheet/MenuOverlay
- [ ] Étape 10 — grep hex final (sweep neutrals + ImmeubleDetailsScreen)
- [ ] Étape 11 — tsc --noEmit
- [ ] Étape 12 — build + adb install
