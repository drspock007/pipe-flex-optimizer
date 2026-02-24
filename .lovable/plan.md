

# Fix: UI Freezing Due to FEM Solver Performance

## Root Cause

The `buildMesh` function in `fem-solver.ts` creates too many finite elements for long pipes:
- For L=500m (500,000 mm), it creates `ceil(500000/500) = 1000` elements per span
- This produces a 2000-DOF system requiring Gaussian elimination (O(n^3))
- `findMaxLFEM` calls `solveFEM` up to **80+ times** (exponential bracket + 50 bisection iterations), each solving these massive systems
- Result: main thread blocked for minutes

## Solution

### 1. Cap mesh density (`fem-solver.ts` - `buildMesh`)

Replace the unbounded `Math.ceil(spanLen / 500)` with a hard cap:

```text
nSub = Math.max(minElementsPerSpan, Math.min(20, Math.ceil(spanLen / 500)))
```

This caps at **20 elements per span** max. For Euler-Bernoulli beams with UDL, 8-20 cubic elements give excellent accuracy (the shape functions are exact for cubic deflection).

### 2. Reduce search iterations (`fem-solver.ts`)

- `findMaxLFEM`: reduce bisection from 50 to **20** iterations (gives ~1mm precision, more than enough)
- `findMaxHFEM`: reduce from 60 to **20** iterations
- Reduce exponential bracket steps from 30 to **15**

### 3. Increase debounce (`Index.tsx`)

Change debounce from 300ms to **500ms** to give more breathing room during rapid input changes.

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/lib/fem-solver.ts` | Cap elements per span at 20; reduce bisection iterations |
| `src/pages/Index.tsx` | Increase debounce to 500ms |

### Performance Impact

- Before: up to 1000 nodes per span = 2000 DOFs, O(8 billion) per solve
- After: max 20 nodes per span = 40 DOFs, O(64,000) per solve
- Speedup: ~100,000x per FEM solve
- Total findL: from ~80 heavy solves to ~35 lightweight solves

### Accuracy Impact

None meaningful. Euler-Bernoulli cubic Hermite elements are exact for polynomial loads up to degree 3. UDL produces a degree-4 deflection on each element, so even 4 elements per span gives sub-0.1% error. 8-20 elements is more than sufficient.

