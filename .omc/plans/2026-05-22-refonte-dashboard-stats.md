# Refonte Dashboard + Page Stats — Plan d'exécution

**Date** : 2026-05-22
**Décisions utilisateur** :
- Dashboard = **centre de pilotage rapide** (snapshot + actions, pas motivation)
- Stats manque : **filtre période**, **plusieurs charts**, **top performances/records**
- Ton = **cohérent avec l'app existante** (tokens actuels, pas de nouveau flavor)
- Audience = **commercial + manager** (UI adaptative selon rôle)

---

## Contraintes (à respecter)

- Pas d'objectifs/quotas (pas exposé par le backend) — tout doit être **dérivable côté client** depuis les hooks existants : `useWorkspaceProfile`, `use-commercial-timeline`, `use-commercial-activity`, `use-team-performance-timeline`.
- Pas de doublon avec les autres onglets (Agenda / Immeubles / Historique / Équipe).
- Réutilisation **stricte** du design system : `Card`, `StatTile`, `IconBadge`, `Chip`, `PressableCard`, `ProgressBar`, `colors.*` tokens.
- Pas de nouvelle dépendance (sauf si chart manquant chez `react-native-gifted-charts` déjà installé).

---

## DASHBOARD — nouvelle structure

### Bloc actuel à garder
- ✅ Carte rang + progression vers prochain rang (utile, motivant, pas de doublon)
- ✅ Chart hebdomadaire (utile pour pilotage rapide — différent du chart stats qui sera multi-période)

### Bloc à supprimer / réduire
- ❌ Grille "formule de calcul des points" (trop verbeux, peut aller dans un modal "?" si vraiment nécessaire)
- ❌ Card "info" formule actuelle plein écran → bouton info discret sur la card rang

### Nouveaux blocs (par ordre dans la page)

**1. Hero compact** (remplace l'actuel header verbeux)
- Salutation rapide ("Bonjour Hatim") + rôle (Chip)
- Rang + delta points 7 derniers jours (`+24 pts cette semaine` calculé depuis timeline)

**2. Prochain RDV** (commercial uniquement)
- Source : 1er item de `rdvToday.data` (le plus proche dans le temps, futur)
- Card unique : compte-à-rebours ("dans 47 min") + adresse + nom prospect + 2 actions (Itinéraire, Appeler si tel dispo)
- Si aucun RDV aujourd'hui → card état vide "Pas de RDV aujourd'hui — créer un RDV"

**3. Alertes intelligentes** (calculées client-side)
- "X immeubles inactifs depuis +14 jours" (depuis `immeubles` data + dernière visite)
- "Taux conversion : Y% cette semaine (Δ vs sem. dernière)" (timeline)
- "Z RDV demain à confirmer" (rdv futurs)
- Render : max 3 chips/cards en row scrollable, tons semantic (warning/danger/info)
- Si aucune alerte → bloc masqué

**4. Raccourcis création** (commercial)
- 3 quick actions : Nouvel immeuble / Nouvelle porte / Nouveau RDV
- Render : 3 `PressableCard` en row, IconBadge primary + label
- Ouvre les sheets existants (`AddImmeubleSheet`, etc.)

**5. Rang + progression** (compact, version condensée de l'actuel)
- Conserver `mainCard` mais réduire visuellement (rang badge + progress + "+X pts pour rang suivant" — supprimer la grille formule)
- Bouton "?" discret en haut à droite → modal explication formule (réutiliser le BottomSheet conversion existant)

**6. Chart hebdomadaire** (existant, conserver)
- Carousel barres semaine + portes + RDV + contrats (déjà OK)

**7. Record personnel** (1 line dans une card)
- "🔥 Record : X portes le DD/MM" — calculé depuis timeline
- 1 seul stat, dans un slim Card outlined

### Variante manager
- Bloc "Prochain RDV" remplacé par "Agenda équipe aujourd'hui" (count RDV total équipe + X RDV vs hier)
- Alertes orientées équipe : "Commercial inactif depuis 3j", "Refus collectifs en hausse"
- Raccourcis : Ajouter commercial / Créer immeuble / Voir équipe
- Record perso → record équipe (meilleur perf du mois)

---

## PAGE STATS — refonte

### Bloc actuel à garder
- ✅ KPI grid 6 tiles (Immeubles / Portes / RDV / Contrats / Refus / Absents) → MAIS chaque StatTile devra recevoir un **delta vs période précédente** (`hint` prop déjà dispo, format `↗ +12%` / `↘ -5%` / `= stable`)
- ✅ Liste RDV récents en bas (conserver telle quelle)

### Bloc à supprimer
- ❌ Le chart actuel unique (sera remplacé par 4 charts)

### Nouvelle structure

**1. Header avec filtre période**
- Segmented control (`Chip` selected pattern) : **Jour | Semaine | Mois | Année | Personnalisé**
- "Personnalisé" → date range picker dans un BottomSheet
- Période par défaut : **Semaine**
- Toutes les KPI + charts dépendent de la période sélectionnée

**2. KPI grid (existant, enrichi)**
- 6 StatTile actuels + ajout du `hint` delta vs période précédente
- Si delta indispo (pas assez d'historique), masquer juste le hint

**3. Section "Évolution"** (nouveau)
- Line chart multi-séries : Portes / RDV / Contrats sur la période
- Toggle legend pour activer/désactiver chaque série
- Lib : `react-native-gifted-charts` (déjà utilisée pour stats)

**4. Section "Répartition statuts"** (nouveau)
- Pie chart : NON_VISITE / ABSENT / RDV_PRIS / CONTRAT / REFUS / À_REVOIR
- Légende compacte à droite avec %

**5. Section "Funnel de conversion"** (nouveau)
- Visu funnel : Portes visitées → RDV pris → Contrats signés
- Avec % de conversion entre chaque étape
- Render simple : 3 barres horizontales décroissantes + % au milieu

**6. Section "Activité par jour"** (nouveau)
- Bar chart : portes par jour de la semaine (Lun → Dim)
- Identifie les jours les plus productifs

**7. Section "Top performances / Records"** (nouveau)
- 4 cards `StatTile`-style sans valeur, mais avec :
  - 🔥 Meilleur jour : X portes le DD/MM
  - 📅 Meilleure semaine : X contrats (S+W)
  - 🎯 Plus haut taux conversion : Y% (sem. du DD/MM)
  - ⏰ Créneau le plus productif : 14h-16h (si data dispo)

**8. Liste RDV** (existante, conserver)

### Variante manager
- Toggle au-dessus du filtre période : **Mes stats / Équipe**
- Mode "Équipe" : KPI = somme équipe, charts = courbes par membre, top performances = meilleurs membres
- Records adaptés équipe ("Meilleur jour équipe", "Top contributeur", etc.)

---

## Pré-requis (à faire avant le UI)

### Helpers de calcul (créer `utils/stats/`)

- `utils/stats/period.ts`
  - `type StatsPeriod = "day" | "week" | "month" | "year" | "custom"`
  - `getPeriodRange(period: StatsPeriod, custom?: { from: Date; to: Date }): { from: Date; to: Date }`
  - `getPreviousPeriodRange(period, custom?)` (pour deltas)

- `utils/stats/aggregations.ts`
  - `computeDelta(current: number, previous: number): { value: number; trend: "up"|"down"|"flat"; formatted: string }`
  - `filterTimelineByPeriod(timeline, from, to)`
  - `groupByDay(timeline)` / `groupByDayOfWeek(timeline)`

- `utils/stats/records.ts`
  - `findBestDay(timeline): { date, value }`
  - `findBestWeek(timeline): { weekLabel, value }`
  - `findPeakHour(timeline): { hour, count }` (si donnée horaire dispo)

- `utils/insights.ts` (pour dashboard)
  - `getInactiveImmeubles(immeubles, days = 14)`
  - `getConversionRateDelta(timeline)`
  - `getUpcomingUnconfirmedRdv(rdvs)`

### Composants UI nouveaux (créer `components/ui/`)

- `PeriodSelector.tsx` — segmented control jour/sem/mois/an/custom (basé sur Chip)
- `Funnel.tsx` — 3 barres horizontales décroissantes
- `DeltaBadge.tsx` — petit chip "↗ +12%" / "↘ -5%" / "= stable" avec tone semantic

### Vérifier disponibilité dans `react-native-gifted-charts`
- BarChart ✓
- LineChart ✓
- PieChart ✓

---

## Ordre d'exécution

1. **Étape 1** — Helpers `utils/stats/*` (period, aggregations, records, insights)
2. **Étape 2** — Composants UI (`PeriodSelector`, `Funnel`, `DeltaBadge`) dans `components/ui/`
3. **Étape 3** — Refonte **dashboard.tsx** (commercial puis manager)
4. **Étape 4** — Refonte **statistiques.tsx** (filtre + KPI deltas + 4 charts + records)
5. **Étape 5** — Variante manager sur les deux écrans
6. **Étape 6** — `npx tsc --noEmit`
7. **Étape 7** — Build local + adb install + test sur tablette

À chaque étape : ✅ cocher + build TS, passer à la suivante.

---

## Suivi d'avancement

- [x] Étape 1 — Helpers stats
- [x] Étape 2 — Composants UI (PeriodSelector, Funnel, DeltaBadge)
- [x] Étape 3 — Dashboard (commercial)
- [x] Étape 4 — Stats (filtre + charts + records)
- [ ] Étape 5 — Variante manager
- [ ] Étape 6 — tsc --noEmit clean
- [ ] Étape 7 — Build + adb install
