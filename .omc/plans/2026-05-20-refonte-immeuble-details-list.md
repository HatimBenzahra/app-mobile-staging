# Refonte ImmeubleDetailsScreen → liste verticale + audit recording

**Date:** 2026-05-20
**Owner:** k.hamrouni@finanssor.fr
**Status:** draft → ready-to-execute
**Stack:** React Native + Expo + expo-router + Reanimated 3 + Tamagui

---

## 1. Requirements Summary

Replace the horizontal **DoorPager carousel** in `components/immeubles/ImmeubleDetailsScreen.tsx`
with a **vertical sectioned list of prospected portes** grouped by étage. The pager allows
the commercial to swipe between portes and tap a status inline, which **bypasses** the new
prospection session overlay and breaks the audio-segment discipline we just introduced.

Target UX:
- Single entry point for prospecting = FAB → "Nouvelle prospection" → `ProspectionSessionOverlay`
- Existing prospected portes appear in a clean read-only-ish vertical grid (compact tiles)
- Tap a tile → opens the existing `EditPorteSheet` for post-hoc edit (notes, RDV details), **without** opening a new audio segment
- Recording lifecycle: `markDoorStart/End` fired ONLY from the session overlay (audit confirmed 2 stray callsites in current screen)

## 2. Acceptance Criteria (testable)

| # | Criterion | Test |
|---|-----------|------|
| AC1 | The `DoorPager` and `DoorPagerItem` components are removed from `ImmeubleDetailsScreen.tsx` | `grep -c "DoorPager\\|DoorPagerItem" ImmeubleDetailsScreen.tsx` returns `0` |
| AC2 | A new `ProspectedDoorsList` component renders portes grouped by étage descending | Visual: étages 8→1 stacked, each section header shows "Étage N · K portes" |
| AC3 | Empty state appears when 0 portes prospected | Visual: card with icon mic + "Prêt à prospecter ?" + hint pointing to FAB |
| AC4 | Tap on a porte tile opens `EditPorteSheet` (post-hoc edit), does NOT open the session overlay | Tap porte 805 (Absent soir) → sheet opens with rdv/comment fields, no audio counter starts |
| AC5 | `markDoorEnd(editPorte.id, editMode)` is NOT called from `saveEditSheet` | `grep -n "markDoorEnd" ImmeubleDetailsScreen.tsx` shows no callsites in this file |
| AC6 | `markDoorStart` is fired only when user taps "Commencer" in overlay | `grep -rn "markDoorStart" hooks/ components/` → only `use-prospection-session.ts:startActive` |
| AC7 | `markDoorEnd` is fired only on saveStatus/abortActive/cancel inside the overlay | `grep -rn "markDoorEnd" hooks/ components/` → only `use-prospection-session.ts` |
| AC8 | Tile palette matches existing `STATUS_OPTIONS` (réutilisation, pas de duplication) | Inspect imports: `ProspectedDoorsList` reads `STATUS_OPTIONS` or `getDisplayStatus` from screen-level exports |
| AC9 | Layout responsive: 2-col on phone (<700px), 3-col on tablet (≥700px) | Manual: rotate Doogee T30S → grid reflows |
| AC10 | No regression on FAB actions (Ajouter étage / Supprimer porte / Supprimer étage still work) | Manual: tap FAB → 4 actions visible, "Nouvelle prospection" first |
| AC11 | Floor tabs removed (vertical layout makes them redundant) — argument: scroll naturally handles navigation; section headers serve as visual anchors | `grep "FloorTabs" ImmeubleDetailsScreen.tsx` returns `0` |
| AC12 | No TS / lint errors introduced | `mcp__plugin_oh-my-claudecode_t__lsp_diagnostics` returns clean for all touched files |

## 3. Design rules (no slop)

- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 (use these tokens only)
- **Radii:** tile=16, card=20, button=14, pill=999
- **Palette:** keep existing soft palette (#FAFAF7 surface, #0F172A ink, #E2E8F0 borders); reuse `STATUS_OPTIONS` accents from current screen (line 61-116)
- **Typography:**
  - Section header: 12px / 800 / 1.4px letter-spacing / UPPERCASE
  - Porte number: 22px / 800 / tabular-nums / letter-spacing -0.5
  - Status label: 11px / 700
- **Tile dimensions:**
  - Phone: 48% width, ~104px height
  - Tablet: ~31% width, ~120px height
- **Tap target:** ≥48pt (full tile is pressable, no inner mini-buttons)
- **Visual hierarchy per tile:**
  ```
  ┌─────────────────────┐
  │ 805        🌙       │ ← number left, status icon right
  │ Absent soir         │ ← status label below
  │ ━━━━━━━━━━━━━━━━━━ │ ← accent bar bottom (4px) using status accent color
  └─────────────────────┘
  ```

## 4. Implementation Steps

### Step 1 — Audit fix: remove stray `markDoorEnd` callsites

**File:** `components/immeubles/ImmeubleDetailsScreen.tsx`

- Remove `markDoorEnd(editPorte.id, editMode);` at line ~857 (inside `saveEditSheet`). Edit sheet is for post-hoc edits, not audio segment closing.
- Line ~1272 (`markDoorEnd` in `applyStatus`) will be removed automatically when `applyStatus` is deleted along with `DoorPager` in Step 3.

### Step 2 — Create reusable components

**New files** in `components/immeubles/prospection/`:

#### `StatusBadge.tsx`
Pure presentational. Props: `{ statusKey: string; size?: "sm" | "md" }`. Uses the existing `STATUS_OPTIONS` map (lifted into a shared module if needed — see Step 2.5). Renders an icon + label inside a colored pill.

#### `PorteTile.tsx`
Compact tile, ≥48pt tap target. Props:
```ts
{
  porte: Porte;
  onPress: (porte: Porte) => void;
  isTablet?: boolean;
}
```
Layout: number top-left (tabular), status icon top-right (in a 32px rounded square with status accent bg), status label below number, 4px accent bar at the bottom edge using `STATUS_OPTIONS[key].accent`.

#### `FloorSection.tsx`
Section wrapper. Props:
```ts
{
  etage: number;
  portes: Porte[];
  onPorteTap: (porte: Porte) => void;
  isTablet: boolean;
}
```
Renders the section header ("ÉTAGE N · K PORTES") + a flexbox grid of `PorteTile`. Internal gap = 10/14px (phone/tablet).

#### `ProspectedDoorsList.tsx`
Main wrapper. Props:
```ts
{
  portes: Porte[];     // pre-filtered (statut !== NON_VISITE)
  onPorteTap: (porte: Porte) => void;
  isTablet: boolean;
  hasFilters: boolean; // for empty-state copy variant
}
```
Groups portes by étage (desc), renders `FloorSection[]`. Empty state when array empty (variant based on hasFilters: filter-noop vs no-prospection-yet).

### Step 2.5 — Extract `STATUS_OPTIONS` into a shared module

To avoid duplication between `ImmeubleDetailsScreen` and new tile components, **lift** `STATUS_OPTIONS`, `STATUS_DISPLAY`, `DEFAULT_STATUS_OPTION`, `getDisplayStatusKey`, `getDisplayStatus` into:

**New file:** `components/immeubles/prospection/status-display.ts` (zero-runtime helper module)

Update `ImmeubleDetailsScreen.tsx` to import from the new module (delete local definitions). `PorteTile`, `StatusBadge` also import from it.

### Step 3 — Remove DoorPager from ImmeubleDetailsScreen

In `ImmeubleDetailsScreen.tsx`:

- Delete the `DoorPager` and `DoorPagerItem` component definitions (currently lines ~290-480).
- Delete the `handleDoorScrollEnd`, `applyStatus`, `handleStatusSelect`, `handleQuickComment` functions IF they were only used by DoorPager. Keep `handleQuickComment` if it's still wired to something. (Verify via grep after deletion.)
- Delete the `FloorTabs` component AND its render (lines ~250-295 and ~1667 in render).
- Replace the render block (around lines 1645-1682) with:
  ```tsx
  <ProspectedDoorsList
    portes={filteredPortes}
    onPorteTap={handlePorteTap}
    isTablet={isTablet}
    hasFilters={statusFilters.length > 0}
  />
  ```
- Add `handlePorteTap = useCallback((porte) => openEditSheet(porte, "COMMENTAIRE"), [openEditSheet])` (defaults to comment edit mode since the porte already has a status; user can change it within the sheet).
- Keep the `<View style={styles.statusHeaderRow}>` (filter button) above the list.
- Remove `doorPagerRef`, `filteredPortesRef`, `currentPorteRef`, `currentIndex` if they become unused after removal.

### Step 4 — Wire empty state hint

The empty state in `ProspectedDoorsList` mentions tapping "+" (FAB). Make the empty state visually point toward the bottom-right FAB:
- Subtle dashed arrow path (SVG or just `Feather "arrow-down-right"` icon)
- Pill "Nouvelle prospection" in slate

This already exists partially in the current screen (I added it earlier). Move that styling block (`emptyProspectionCard` etc.) from `ImmeubleDetailsScreen` styles into the list component.

### Step 5 — Run diagnostics + manual test

- LSP diagnostics on all 4 modified/created files
- `npx tsc --noEmit` (skip pre-existing `HamburgerMenuOverlay` errors — those were fixed earlier)
- Manual on Doogee T30S: see Test Plan below

## 5. Test Plan

| Test | Steps | Expected |
|------|-------|----------|
| T1 — Empty state | Create new immeuble → enter detail | List shows empty card "Prêt à prospecter ?" with arrow toward FAB |
| T2 — Display existing portes | Open immeuble "Tst" (18 prospected) | Sections "Étage 8 · N portes" .. "Étage 1 · N portes", tiles with proper colors |
| T3 — Tap a porte | Tap tile 805 (Absent soir) | EditPorteSheet opens, NO audio chrono visible, NO segment in tracker (log via `__DEV__`) |
| T4 — New prospection | Tap FAB → "Nouvelle prospection" → fill 9/305 → Commencer | Overlay session opens, segment starts at "Commencer" tap (log: `[useRecording] DOOR_START porteId:...`) |
| T5 — Save status | Tap "Argumenté" → Enregistrer | Segment closes (log: `DOOR_END porteId:... statut: ARGUMENTE`), tile appears in list under Étage 9 |
| T6 — Absent shortcut | New prospection → Commencer → tap "Absent" big card | Segment closes immediately, tile appears under proper étage |
| T7 — Edit existing → save | Tap tile → change comment → Enregistrer | No `DOOR_END` log fires (just porte update) |
| T8 — Tablet layout | Rotate to landscape (≥700px) | Tiles reflow to 3 cols, paddings larger |
| T9 — Filter | Tap "Filtrer" → pick "Refus" | List shows only Refus tiles, empty state variant if zero |
| T10 — Quit immeuble | Tap back arrow | `stopRecording` runs once, all open segments closed (log: `Final door segments: N`) |
| T11 — FAB while session active | Open session → minimize FAB | FAB disabled visually (existing behavior preserved) |

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Removing `applyStatus` / `handleStatusSelect` might break other call paths I haven't seen | Step 3 includes a grep after deletion; restore if usage found |
| Lifting `STATUS_OPTIONS` may break other files importing them | grep `STATUS_OPTIONS` across repo before moving; update imports if any |
| EditPorteSheet expects a status mode (RENDEZ_VOUS_PRIS / CONTRAT_SIGNE / etc.) — using "COMMENTAIRE" default may not let user change status. | Verify EditPorteSheet allows mode switching; if not, add a "Modifier statut" link inside the sheet that re-routes to the prospection session for THIS porte (using `beginFromExisting`) |
| Performance: rendering 100+ tiles may slow on low-end device | Use `FlatList` (sectioned) instead of plain `ScrollView` if porte count > 50; for now ScrollView is OK (existing pager handles ~40) |
| Loss of "current porte" concept — some hooks may reference `currentPorte` | Search and remove all `currentPorte` references downstream of pager removal |

## 7. Recording Lifecycle — Audit Results

From explore agent run on 2026-05-20:

✅ **Lifecycle CLEAN:**
- `useRecording({ enabled: true, immeubleId })` auto-starts on mount, auto-stops on unmount/disabled
- No manual `startRecording` / `stopRecording` callsites outside the hook

✅ **markDoorStart CLEAN:**
- Only callsite: `use-prospection-session.ts:137` inside `startActive()`

⚠️ **markDoorEnd — 2 stray callsites to remove:**
- `ImmeubleDetailsScreen.tsx:857` in `saveEditSheet` → REMOVE (Step 1)
- `ImmeubleDetailsScreen.tsx:1272` in `applyStatus` → DELETED with DoorPager (Step 3)

After Step 1 + Step 3, the only markDoorEnd callsites are inside `use-prospection-session.ts` (cancel/abortActive/saveStatus), which is the desired state.

## 8. Files Touched

| File | Action |
|------|--------|
| `components/immeubles/ImmeubleDetailsScreen.tsx` | Remove DoorPager/DoorPagerItem/FloorTabs/applyStatus/handleStatusSelect/handleQuickComment/handleDoorScrollEnd, remove stray markDoorEnd, add ProspectedDoorsList render, import status-display from new module |
| `components/immeubles/prospection/status-display.ts` | NEW — extract STATUS_OPTIONS + helpers |
| `components/immeubles/prospection/StatusBadge.tsx` | NEW |
| `components/immeubles/prospection/PorteTile.tsx` | NEW |
| `components/immeubles/prospection/FloorSection.tsx` | NEW |
| `components/immeubles/prospection/ProspectedDoorsList.tsx` | NEW |

## 9. Out of Scope (deferred)

- Drag-to-reorder portes (not requested)
- Per-section collapsible étages (not requested; UI is simple scrolling)
- Audio waveform real data integration (faux waveform stays for now)
- Server-side: removing pre-generation in CREATE_IMMEUBLE mutation (this remains client-side filter only, Option B as agreed)

## 10. Execution order

1. Step 2.5 (extract status-display module) — safest first, no behavior change
2. Step 1 (remove stray markDoorEnd in saveEditSheet) — small, targeted
3. Step 2 (create new components in isolation)
4. Step 3 (rewire screen render block + delete pager bits)
5. Step 4 (move empty-state styles)
6. Step 5 (diagnostics + build + manual test on tablet)

---

**Ready to execute? Si oui je lance l'implémentation pas-à-pas avec TaskCreate pour le suivi.**
