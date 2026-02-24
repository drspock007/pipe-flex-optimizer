
# Admissible Length Range [Lmin, Lmax] and Minimum Supports

## Overview

Transform "Find L" mode from finding a single maximum length to computing the full admissible range [Lmin, Lmax] with the minimum number of intermediate supports. The key physics: settlement stress scales as ~1/L^2 (dangerous at small L) while self-weight stress scales as ~L^2 (dangerous at large L), creating a safe "window" in between.

The theme color #ff8e04 is already applied (HSL 34 100% 51%).

---

## Changes by File

### 1. `src/lib/fem-solver.ts` -- Core Algorithm

**Replace** `findMaxLFEM` with `findLRangeFEM`:

```text
Export interface FindLRangeResult {
  Lmin: number;        // meters
  Lmax: number;        // meters
  numSupports: number; // minimum supports needed
  resultAtLmax: FEMResult;  // full FEM data for plotting (at Lmax)
  resultAtLmin: FEMResult;  // full FEM data at Lmin (for reference)
}
```

**Algorithm** (iterates support counts 0..20, stops at first feasible):

```text
for supports = 0 .. MAX_SUPPORTS:

  // Coarse scan: L from 1m to 1000m
  // Steps: 1m increments to 100m, then 5m increments to 300m, then 10m to 1000m
  safePoints = []
  for each L_m in coarseGrid:
    L_mm = L_m * 1000
    supportPos = buildEqualSupports(L_mm, supports)
    stress = solveFEMQuick(E, I, c, q, L_mm, h_mm, supportPos)
    if stress <= allowable:
      safePoints.push(L_m)

  if safePoints is empty: continue to next support count

  // Found feasible support count!
  Lmin_guess = min(safePoints)
  Lmax_guess = max(safePoints)

  // Refine Lmin: bisect between (last unsafe below Lmin_guess) and Lmin_guess
  // Refine Lmax: bisect between Lmax_guess and (first unsafe above Lmax_guess)
  // 20 iterations each, 10mm precision

  // Full adaptive solve at Lmax for plots
  return { Lmin, Lmax, numSupports: supports, resultAtLmax, resultAtLmin }

If no support count works: return undefined
```

**Keep** `solveFEMQuick` for fast stress-only evaluation during search. Keep `findMaxHFEM` mostly unchanged (it already works with auto-supports).

### 2. `src/lib/calculations.ts` -- Types and Entry Point

**Update `CalcMode`**: Keep `"findL"` string value (avoids breaking existing UI wiring), but change its semantics to "find L range".

**Update `PipeInputs`**: No changes needed (L field is ignored in findL mode, h is the given input).

**Update `CalculationResults`**:
- Remove `computedL?: number`
- Add `computedLmin?: number` and `computedLmax?: number`

**Update `DebugInfo`**:
- Add `searchSupportsUsed?: number`
- Add `searchLminGuess?: number`, `searchLmaxGuess?: number` (coarse scan results for debug)

**Update `calculate()` findL branch**:
- Call `findLRangeFEM(...)` instead of `findMaxLFEM(...)`
- Set `computedLmin`, `computedLmax`, `numSupports`
- Use `resultAtLmax` for stress/deflection plot data (representative case)
- Set `L = Lmax` for debug theory calculations

### 3. `src/components/GeometryCard.tsx` -- Input Panel

**Find L mode changes**:
- The L input field becomes **two read-only fields**: Lmin and Lmax (or a single field showing "Lmin -- Lmax")
- Show "No solution" only when both are undefined
- The h input remains editable (it's the given parameter in Find L mode)

Layout change for L field in findL mode:

```text
  Lmin (m)           Lmax (m)
  [  25.32  ]        [  87.14  ]
  (read-only, primary border)
```

**Props update**: Replace `computedL` with `computedLmin` and `computedLmax`.

### 4. `src/components/ResultsPanel.tsx` -- Results Display

**Find L result block** -- replace single "Computed Max Length" with:

```text
  ADMISSIBLE LENGTH RANGE
  Lmin: 25.32 m    Lmax: 87.14 m
  Supports Used: 3 (minimum)
  Span at Lmax: 21.79 m
  Note: Intermediate supports are pins on settlement line w(x) = h*x/L
```

Show utilization at Lmax (the plotted case).

**Props**: Update to use `computedLmin`/`computedLmax` instead of `computedL`.

### 5. `src/components/DebugPanel.tsx` -- Debug Info

Add rows when in Find L mode:
- `Lmin guess` (from coarse scan)
- `Lmax guess` (from coarse scan)
- `Supports tested` (the minimum found)
- Settlement-only stress estimate: `sigma_settle ~ 6*E*h*c / L^2`

### 6. `src/pages/Index.tsx` -- Wiring

- Pass `computedLmin` and `computedLmax` to `GeometryCard` instead of `computedL`
- No other structural changes needed

---

## Files Modified

| File | Summary |
|------|---------|
| `src/lib/fem-solver.ts` | Replace `findMaxLFEM` with `findLRangeFEM`; new `FindLRangeResult` interface |
| `src/lib/calculations.ts` | Update `CalculationResults` (Lmin/Lmax), `DebugInfo`, `calculate()` findL branch |
| `src/components/GeometryCard.tsx` | Show Lmin/Lmax fields in findL mode |
| `src/components/ResultsPanel.tsx` | Show admissible range block with supports info |
| `src/components/DebugPanel.tsx` | Add search debug rows |
| `src/pages/Index.tsx` | Pass new props |

---

## Technical Notes

- The coarse scan grid uses ~150 points (1m steps to 100m, 5m steps to 300m, 10m to 1000m). Each point calls `solveFEMQuick` which is fast (8 elements, no post-processing). With up to 21 support counts, worst case is ~3000 quick solves -- still under 1 second on modern hardware.
- Bisection refinement adds ~40 more quick solves per boundary (20 iterations x 2 boundaries).
- Full adaptive solves are only done at the final Lmin and Lmax values.
- The stress/deflection plots show the solution at Lmax (the more interesting boundary case).
