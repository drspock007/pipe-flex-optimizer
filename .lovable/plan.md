

# Fix h Sign Convention, Unify FindL, and Make Plots Physical

## Overview

Three interrelated fixes:
1. User input `h` means "right end is higher by h mm" (positive upward). FEM uses w positive downward, so `h_fem = -h_up`.
2. Create a single `evaluateCandidate` function used by FindL scan, bisection, and display -- no separate quick path.
3. Deflection plot shows physical elevation (up is up) as default, with correct h mapping.

Plus: contact sanity checks after convergence and FindL display at L_plot = midpoint of interval.

---

## Changes by File

### 1. `src/lib/calculations.ts` -- h Mapping

**Line 7**: Add comment clarifying `h` in `PipeInputs` is positive upward (right end higher).

**In `calculate()` (line 136+)**:
- After extracting `inputs.h`, compute `h_fem = -inputs.h` (negate for FEM).
- Pass `h_fem` to all FEM calls instead of raw `h`.
- All theory checks that reference h must also use `h_fem` or `abs(h)` as appropriate.

**FindL branch (line 178-207)**:
- Pass `h_fem` to `findLRangeFEM`.
- Change display: use `resultAtMid` (at L_plot = (Lmin+Lmax)/2) for stress/deflection data.
- Add `L_plot` to results or debug.

**Add to `CalculationResults`**:
- `h_up_mm: number` -- the user's positive-upward h for plots.
- `L_plot?: number` -- the display L in findL mode.

**Add to `DebugInfo`**:
- `stressAtLmin?: number`
- `stressAtLmax?: number`  
- `stressAtLplot?: number`
- `L_plot?: number`

### 2. `src/lib/fem-solver.ts` -- Single evaluateCandidate + Contact Checks

**New exported function `evaluateCandidate`** (replaces separate quick/full paths):

```text
export function evaluateCandidate(
  E_mpa, I, c, q, L_m, h_fem_mm, supportsCount, allowable
): {
  maxStress: number;
  isSafe: boolean;
  result: FEMResult;  // full result with plots
  contactValid: boolean;
  contactWarnings: string[];
}
```

Inside:
1. `L_mm = L_m * 1000`
2. `candidates = buildEqualSupports(L_mm, supportsCount)`
3. `{ result, activeSupports, supportStatus } = solveWithUnilateralSupports(E, I, c, q, L_mm, h_fem_mm, candidates, 16)`
4. Run contact sanity checks:
   - For inactive supports: verify `w(x_i) <= w_ref(x_i) + tol`
   - For active supports: verify `|w(x_i) - w_ref(x_i)| <= 10*tol`
   - If violated: set `contactValid = false`, add warnings
5. `isSafe = result.maxStress <= allowable + 0.5 && contactValid`
6. Return everything.

**Update `findLRangeFEM`**:
- Remove `solveFEMQuickUnilateral` calls in coarse scan and bisection.
- Replace with `evaluateCandidate(...)`. Since evaluateCandidate does a full solve (16 elem/span), the scan is slower but correct. For the ~150-point coarse scan this is acceptable (each solve is sub-ms with banded solver).
- After finding Lmin/Lmax, compute `L_plot = (Lmin + Lmax) / 2` and return `resultAtMid` from `evaluateCandidate(L_plot)`.
- Also return `stressAtLmin`, `stressAtLmax`, `stressAtLplot`.

**Update `FindLRangeResult`**:
- Replace `resultAtLmax` with `resultAtMid: FEMResult`.
- Add `stressAtLmin`, `stressAtLmax`, `L_plot`.
- Keep `resultAtLmin` for reference.

**Update `autoSupportsFEM`** and `findMaxHFEM`**: use `evaluateCandidate` internally.

**Remove** `solveFEMQuick` and `solveFEMQuickUnilateral` (no longer needed -- single source of truth).

**Contact sanity check helper**:
```text
function validateContact(
  supportStatus: SupportStatus[], h_fem_mm: number
): { valid: boolean; warnings: string[] }
```

**Sign convention header update** (lines 1-14):
- Clarify: `h_fem_mm` is the FEM value (negative when right end is higher).
- `w_ref(x) = h_fem_mm * x / L` (will be negative when h_up > 0).
- Contact: active if `w(x_i) > w_ref(x_i) + tol` -- this still works correctly because with h_fem negative, w_ref is negative (upward), and self-weight makes w more positive (downward), so `w > w_ref` means pipe sags below support.

### 3. `src/lib/calculations.ts` -- FindL Branch Update

The findL branch currently uses `resultAtLmax` for display. Change to:
- Use `r.resultAtMid` for stressData, deflectionData.
- Set `L = r.L_plot` for debug theory calculations.
- Set `maxStress = r.stressAtLplot`.
- Add `r.stressAtLmin` and `r.stressAtLmax` to debug.

### 4. `src/components/DeflectionChart.tsx` -- Physical Elevation Plot

**h_up_mm** is now available in results. Use it for correct elevation:

```text
// Physical elevation reference line (up-positive):
//   y_ref(x) = h_up_mm * x / L
// Pipe elevation:
//   y_pipe(x) = y_ref(x) - w(x)
// (subtracting w because w is positive downward)
```

**Elevation mode** (default):
- `ref = h_up_mm * (d.x / L_m)` -- physical reference line going up
- `value = ref - d.w` -- pipe position (deflects down from reference)

**Sag mode**:
- `value = d.w - w_fem_ref` where `w_fem_ref = h_fem * x/L = -h_up * x/L`
- Simplifies to: `value = d.w + h_up * x/L` ... but actually sag = w - w_ref_fem. Since w_ref_fem is negative (for h_up > 0), sag = w - (-h_up*x/L) = w + h_up*x/L. Positive sag means pipe below the settlement line.

**Raw mode**: show w(x) as-is with inverted Y axis (unchanged).

**Support markers**: Use `h_up_mm` to compute marker positions in elevation mode.

### 5. `src/components/ResultsPanel.tsx` -- FindL Display

- Show stress at L_plot (midpoint) as the "display stress".
- Add subtitle text: "Shown at L = XX.XX m (midpoint)".
- Safety badge logic remains: feasible if window exists.

### 6. `src/components/DebugPanel.tsx` -- Extended Debug

Add rows:
- `h_up (mm)`: user input
- `h_fem (mm)`: negated value passed to FEM
- `L_plot (m)`: display L for findL
- `σ(Lmin)`, `σ(Lmax)`, `σ(L_plot)`: stress at each boundary and midpoint
- Contact validation: PASS/FAIL

### 7. `src/pages/Index.tsx` -- No changes needed

Results flow through `CalculationResults` which already passes to all components.

---

## Files Modified

| File | Summary |
|------|---------|
| `src/lib/fem-solver.ts` | Add `evaluateCandidate`, contact validation, remove quick solvers, update FindL/FindH/Auto to use evaluateCandidate, update sign convention docs |
| `src/lib/calculations.ts` | Add `h_fem = -h` mapping, pass h_fem to FEM, add `h_up_mm`/`L_plot` to results, update FindL branch to use midpoint |
| `src/components/DeflectionChart.tsx` | Use `h_up_mm` for correct elevation plot, fix reference line direction |
| `src/components/ResultsPanel.tsx` | Show "at L = X m" subtitle in FindL mode |
| `src/components/DebugPanel.tsx` | Add h_up, h_fem, L_plot, stress at boundaries, contact validation rows |
| `src/components/StressChart.tsx` | No changes needed (stress is always positive) |

---

## Technical Notes

- **Why negate h**: The user says "right end is 2500mm higher". In w-positive-downward convention, the right BC is w(L) = -2500mm (the right end moves upward, i.e., negative w). The settlement line w_ref(x) = -2500 * x/L is negative, meaning supports are above the undeflected position. Self-weight makes w positive (downward). The contact condition `w > w_ref + tol` correctly activates when the pipe sags below the (negative) support elevation.
- **Removing quick solver**: The banded solver with 16 elements/span for a single span is ~40 nodes = 80 DOFs. Even with 20 supports (21 spans), that's 336 nodes = 672 DOFs. The banded LDLT solve is O(n * bw^2) ≈ 672 * 9 ≈ 6000 ops per solve. With 150 grid points × 21 support counts × 15 contact iterations = ~47k solves worst case. At ~6000 ops each, that's ~280M ops, which runs in ~1-2 seconds. Acceptable for correctness-first approach.

