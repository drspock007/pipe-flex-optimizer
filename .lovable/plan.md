

## Plan : Sélecteurs NPS / Schedule avec option Custom

### Vue d'ensemble

Remplacer les champs `D₀` et `t` libres par deux menus déroulants chaînés (NPS → Schedule) avec option "Custom" qui révèle un champ de saisie manuelle. Les données proviennent du fichier ASME B36.10M uploadé.

### Fichier à créer

**1. `src/lib/pipe-presets.ts`** (~370 lignes)
- Copie adaptée du fichier uploadé `pipePresets.ts`
- Supprimer l'import `UnitsSystem` (on n'en a pas besoin, tout est en SI interne)
- Garder `PIPE_SIZES` (avec `od_mm` uniquement utilisé en interne), `WALL_THICKNESS_BY_NPS`, `getWallThicknessOptions(nps)`
- Supprimer les helpers liés à `UnitsSystem` (`getPipeOD`, `getWallThickness`, `getSMYS`) — la conversion est gérée par `UnitContext`
- Supprimer `STEEL_GRADES` (déjà géré dans `MaterialCard`)

### Fichier à modifier

**2. `src/components/GeometryCard.tsx`** (refactoring majeur)

Le fichier fait actuellement 113 lignes. Avec les deux `Select` + logique Custom, il va dépasser 180 lignes. Il faut donc le **splitter** :

- **`src/components/geometry/PipeSizeSelect.tsx`** (~60 lignes) — Select NPS avec option Custom + NumericInput D₀
- **`src/components/geometry/WallThicknessSelect.tsx`** (~60 lignes) — Select Schedule (filtré par NPS sélectionné) avec option Custom + NumericInput t
- **`src/components/GeometryCard.tsx`** (~80 lignes) — Orchestrateur : state local `selectedNps` et `selectedSchedule`, compose les sous-composants

### Comportement UX

```text
┌─────────────────────────────────┐
│ NPS     [▼ NPS 4" (114.3 mm) ] │  ← Select avec label NPS + OD dans l'unité active
│ D₀ (mm) [    114.30          ] │  ← Visible uniquement si NPS = "Custom"
├─────────────────────────────────┤
│ Schedule [▼ Sch 40/STD       ] │  ← Select filtré par le NPS sélectionné
│ t (mm)   [    6.020          ] │  ← Visible uniquement si Schedule = "Custom"
└─────────────────────────────────┘
```

- Quand l'utilisateur choisit un NPS : `Do` est mis à jour avec `od_mm`, le select Schedule se réinitialise au premier schedule disponible, `t` se met à jour automatiquement
- Quand l'utilisateur choisit un Schedule : `t` est mis à jour avec `wt_mm`
- Quand NPS = "CUSTOM" : le Select Schedule disparaît, les deux `NumericInput` (D₀ et t) apparaissent
- Quand Schedule = "Custom" : seul le `NumericInput` t apparaît pour saisie libre
- Les labels dans les Select affichent les valeurs dans l'unité active via `conv()` et `label()`

### État local vs état global

- `selectedNps` et `selectedSchedule` : **état local** dans `GeometryCard`
- `Do` et `t` : restent dans `PipeInputs` (état global, toujours en mm SI)
- Au montage, déduire `selectedNps` et `selectedSchedule` à partir des valeurs initiales `Do=114.3` et `t=6.02` (match NPS 4", Sch 40/STD)

### Détails techniques

- Utiliser le composant `Select` / `SelectItem` existant de shadcn/ui
- Le label de chaque option NPS affiche : `NPS {nps}" ({conv(od_mm, "mm")} {label("mm")})` — exemple : `NPS 4" (4.50 in)` en Imperial
- Le label de chaque option Schedule affiche : `{schedule} — {conv(wt_mm, "mm")} {label("mm")}` — exemple : `Sch 40/STD — 0.237 in`
- Dernière option de chaque Select : "Custom"

