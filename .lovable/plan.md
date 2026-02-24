

# Unilateral (One-Way) Support Contact Model

## Overview

Replace the current bilateral pin support model with a unilateral contact model. Supports can only push upward (resist gravity) but cannot pull downward. The pipe is free to lift off any support. This requires an iterative active-set solver that determines which supports are actually in contact.

Additionally fix the safety status inconsistency in Find L mode and enhance the deflection plot to show active vs inactive supports.

---

## Changes by File

### 1. `src/lib/fem-solver.ts` -- Active-Set Contact Solver

**New function** `solveWithUnilateralSupports`:

```text
function solveWithUnilateralSupports(
  E_mpa, I, c, q, L_mm, h_mm,
  candidateSupports_mm[],  // all candidate positions
  targetElementsPerSpan,
):
  { result: FEMResult, activeSupports: number[], allSupportStatus: {x_mm, w_fem, w_ref, active}[] }

  tol = 1e-6 * max(1, abs(h_mm))
  activeSet = []  // start with no supports active

  for iter = 0..14:   // max 15 iterations
    // Solve FEM with only active supports constrained
    activeSupportPositions = candidateSupports_mm filtered by activeSet indices
    result = solveFEMCore(E, I, c, q, L_mm, h_mm, activeSupportPositions, targetElem)

    // Check all candidate supports for penetration
    newActiveSet = []
    for each candidate i:
      x_i = candidateSupports_mm[i]
      w_ref_i = h_mm * x_i / L_mm            // settlement line elevation
      w_fem_i = interpolate w at x_i from result.displacements + nodePositions
      if w_fem_i < w_ref_i - tol:             // pipe sags below support
        newActiveSet.push(i)

    if newActiveSet equals activeSet: break    // converged
    activeSet = newActiveSet

  // Final solve with converged active set (adaptive mesh for accuracy)
  return { result, activeSupports: activeSet, allSupportStatus }
```

**Key detail**: To evaluate `w(x_i)` at a candidate support position, we find which element contains `x_i` and use the Hermite shape function interpolation. This reuses the existing `elementDeflection` function.

**New helper** `interpolateDeflection(nodeX, U, x_mm)`: finds the element containing x_mm and returns the interpolated w.

**Update all callers**:
- `solveFEMQuick` -- add a quick version `solveFEMQuickUnilateral` that runs the active-set loop with 8 elements and returns only maxStress. For coarse scan performance, limit to 5 active-set iterations.
- `autoSupportsFEM` -- use unilateral solver
- `findLRangeFEM` -- use unilateral quick solver for coarse scan, unilateral full solver for final results
- `findMaxHFEM` -- use unilateral solver

**Update `FEMResult`** interface:
- Add `activeSupports: number[]` (indices into candidate array)
- Add `supportStatus: { x_mm: number; w_fem: number; w_ref: number; active: boolean }[]`

**Fix Find L safety**: After bisection refinement, verify both endpoints are truly safe (maxStress <= allowable + 0.5 MPa). If not, shrink interval by 0.01m steps until safe.

### 2. `src/lib/calculations.ts` -- Types and Entry Point

**Update `CalculationResults`**:
- Add `activeSupports: number[]` -- indices of active supports
- Add `supportStatus: { x: number; w_fem: number; w_ref: number; active: boolean }[]` -- in meters/mm for display
- Add `candidateSupportPositions: number[]` -- all candidate positions in meters

**Update safety logic in Find L mode**:
- When `calcMode === "findL"` and `computedLmin`/`computedLmax` exist, set `isSafe = true` (the interval itself is feasible)
- Only show NOT SAFE if no feasible interval was found

**Pass through** `activeSupports` and `supportStatus` from FEM result to UI.

### 3. `src/components/DeflectionChart.tsx` -- Active/Inactive Support Markers

**Replace** simple vertical reference lines with scatter-style markers:
- Active supports: filled orange dot at (x, w_ref) position
- Inactive supports: hollow circle at (x, w_ref) position
- Keep the settlement reference line (dashed)

Use Recharts `ReferenceDot` for support markers. For each support in `supportStatus`:
- If active: `<ReferenceDot x={pos} y={w_ref} r={4} fill="hsl(34 100% 51%)" stroke="hsl(34 100% 51%)" />`
- If inactive: `<ReferenceDot x={pos} y={w_ref} r={4} fill="none" stroke="hsl(var(--muted-foreground))" />`

This visually shows that the pipe lifts off inactive supports.

**Update props**: Access `supportStatus` from results.

### 4. `src/components/StressChart.tsx` -- Support Markers

Similarly distinguish active vs inactive supports on the stress chart:
- Active supports: solid vertical reference line
- Inactive supports: lighter/dotted vertical reference line

### 5. `src/components/DebugPanel.tsx` -- Contact Debug Info

Add a new section "Support Contact Status":

```text
-- Support Contact --
Candidates: 3
Active: 2 (indices 0, 2)
Inactive: 1 (index 1)

  Sup #0  x=7500mm  w_fem=625.0  w_ref=625.0  ACTIVE
  Sup #1  x=15000mm w_fem=1255.3 w_ref=1250.0 INACTIVE (lifted 5.3mm)
  Sup #2  x=22500mm w_fem=1875.0 w_ref=1875.0 ACTIVE
```

Show iteration count for convergence.

### 6. `src/components/ResultsPanel.tsx` -- Safety Status Fix

**Find L mode safety**:
- When `computedLmin` and `computedLmax` exist, display "FEASIBLE" badge (green) instead of evaluating stress at an arbitrary L
- Show active/total support count: "Active supports: 2/3"

### 7. `src/pages/Index.tsx` -- Wiring

Pass new fields (`supportStatus`, `activeSupports`, `candidateSupportPositions`) through to components. Minimal changes since most data flows through `CalculationResults`.

---

## Performance Considerations

- Quick unilateral solver uses 8 elements/span and max 5 active-set iterations (vs 15 for full)
- Each active-set iteration is a full FEM solve, so a single quick unilateral call costs ~5x a bilateral quick solve
- Coarse scan with 150 grid points x 21 support counts x 5 iterations = ~15,750 quick solves worst case
- Still under 2-3 seconds on modern hardware (each quick solve is sub-millisecond)
- Web Worker keeps UI responsive

## Files Modified

| File | Summary |
|------|---------|
| `src/lib/fem-solver.ts` | Add `solveWithUnilateralSupports`, `solveFEMQuickUnilateral`, `interpolateDeflection`; update all search functions to use unilateral model |
| `src/lib/calculations.ts` | Add `activeSupports`, `supportStatus` to results; fix Find L safety logic |
| `src/components/DeflectionChart.tsx` | Active/inactive support markers (filled vs hollow dots) |
| `src/components/StressChart.tsx` | Active/inactive support line styling |
| `src/components/DebugPanel.tsx` | Support contact status table |
| `src/components/ResultsPanel.tsx` | Fix safety badge for Find L mode; show active/total supports |
| `src/pages/Index.tsx` | Pass new result fields to components |

