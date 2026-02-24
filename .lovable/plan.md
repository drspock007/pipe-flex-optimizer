

# Fix Stress Plot Sawtooth, Debug Theory, and FindL Clarity

## Problem Analysis

Three issues identified from code review:

1. **Sawtooth stress plot**: The sampling logic in `solveFEMCore` (lines 326-356) creates discontinuities. At constrained nodes, it offsets to 2%/98% of element length, but adjacent elements sample different physical locations at their shared node, causing visible jumps. Additionally, the `s===0 && i>0` skip creates gaps in the data.

2. **Debug theory misleading with supports**: `M_end_theory = q*L_total^2/12` is computed using total length even when intermediate supports exist, making the FEM/Theory ratio meaningless for multi-span cases.

3. **FindL UI lacks context**: No display of supports used, span length, or explanation of assumptions.

---

## Changes

### 1. Fix stress/deflection sampling in `src/lib/fem-solver.ts`

Replace the post-processing loop (lines 310-356) with clean uniform sampling:
- For each element, sample 10 points at fractions `[0.05, 0.15, 0.25, ..., 0.95]` (uniformly spaced, strictly interior)
- Never sample at exact element boundaries (xi=0 or xi=Le)
- This eliminates all discontinuities between adjacent elements at shared nodes
- Remove the `constrainedNodes` set and offset logic entirely
- Add consistency check: verify `max(stressData.stress)` matches `maxStress` within 2%, emit "Graph mismatch" warning if not

### 2. Fix debug theory for multi-span cases in `src/lib/calculations.ts`

When `numSupports > 0`, compute per-span theoretical values:
- `Ls = L_total_mm / (numSupports + 1)` -- span length
- `hs = h_total_mm / (numSupports + 1)` -- settlement per span
- `M_theory_span = q * Ls^2 / 12` -- self-weight moment per span
- `M_settle_span = 6 * E * I * hs / Ls^2` -- settlement moment per span

Display both total-length theory (for reference) and span theory (for comparison). Compare FEM against span theory when supports exist.

Update `DebugInfo` interface to add: `M_theory_span`, `M_settle_span`, `spanErrorPercent`.

### 3. Update `src/components/DebugPanel.tsx`

- Show "M_theory (span)" and "M_settle (span)" rows when supports > 0
- Compare FEM max moment against span-based theory instead of total-length theory
- Label clearly: "Total-length theory (no supports)" vs "Span theory (with N supports)"

### 4. Enhance FindL display in `src/components/ResultsPanel.tsx`

When `calcMode === "findL"` and `computedL` exists, show:
- `supportsUsed` count
- `spanLength = computedL / (supportsUsed + 1)` in meters
- Note: "Intermediate supports are pins on settlement line w(x) = h * x/L"

This requires passing `numSupports` through `CalculationResults` (already available).

### 5. Fix deflection sampling (same file as item 1)

Apply the same uniform interior sampling to deflection data generation -- both stress and deflection use identical sample points from the same loop, ensuring consistency.

---

## Technical Details

### Sampling strategy (replaces lines 310-356 of fem-solver.ts)

```text
For each element i (0..nElements-1):
  Le = element length
  x_start = nodeX[node1]
  For j = 0..9:
    frac = (j + 0.5) / 10    // gives 0.05, 0.15, ..., 0.95
    xi = frac * Le            // physical local coordinate
    x_mm = x_start + xi
    Compute M, stress, w at xi
    Push to stressData, deflectionData
```

No special casing for boundaries, no constrained-node offsets.

### New DebugInfo fields

```text
M_theory_span: number      // q*Ls^2/12 when supports>0, else same as M_end_theory
M_settle_span: number      // 6*E*I*hs/Ls^2 when supports>0
spanErrorPercent: number    // |M_FEM - M_theory_span| / M_theory_span * 100
```

### Files modified

| File | Change |
|------|--------|
| `src/lib/fem-solver.ts` | Replace post-processing sampling loop in `solveFEMCore` |
| `src/lib/calculations.ts` | Add per-span theory computation, update DebugInfo interface |
| `src/components/DebugPanel.tsx` | Show span-based theory rows, conditional display |
| `src/components/ResultsPanel.tsx` | Add supports/span info in FindL result block |

