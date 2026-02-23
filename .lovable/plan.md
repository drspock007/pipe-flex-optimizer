

# Add Calculation Modes: Solve for L or Solve for h

Currently the app only runs in "direct" mode: given L and h, it calculates stress and required supports. This plan adds two reverse calculation modes accessible via a mode selector in the Geometry Card.

---

## Calculation Modes

1. **Standard (current)** -- Given L and h, calculate stress and supports
2. **Find L** -- Given h and a target number of supports (0 by default), find the maximum allowable pipe length L so that stress stays within allowable limits
3. **Find h** -- Given L and a target number of supports (0 by default), find the maximum allowable settlement h so that stress stays within allowable limits

---

## Engineering Logic

### Find max L (h known)
From the governing equation at a single span (no supports):

M_max = qL^2/12 + 6EIh/L^2, and sigma = M_max * c / I <= allowable

This is solved numerically (binary search on L) since q*L^2 and h/L^2 create opposing trends. The solver finds the largest L where sigma <= allowable_stress.

### Find max h (L known)
From M_max = qL^2/12 + 6EIh/L^2:

The settlement term is linear in h, so we can solve directly:
h_max = (allowable_stress * I/c - qL^2/12) * L^2 / (6EI)

If the self-weight alone already exceeds allowable, h_max = 0.

---

## Changes

### 1. `src/lib/calculations.ts`
- Add `calcMode` field to `PipeInputs`: `"standard" | "findL" | "findH"`
- Add `targetSupports` field to `PipeInputs` (number, default 0)
- Add `calculateMaxL()` function -- binary search for max L given h
- Add `calculateMaxH()` function -- direct solve for max h given L
- Extend `CalculationResults` with `computedL?: number` and `computedH?: number`
- Update `calculate()` to dispatch based on `calcMode`, updating L or h before running the standard calculation

### 2. `src/components/GeometryCard.tsx`
- Add a 3-option radio group or segmented toggle at the top: "Standard", "Find L", "Find h"
- In "Find L" mode: L input becomes read-only (shows computed result), h remains editable
- In "Find h" mode: h input becomes read-only (shows computed result), L remains editable
- Add an optional "Target supports" input field (shown in Find L / Find h modes)
- Highlight the computed value with a distinct style (e.g., orange border or background)

### 3. `src/pages/Index.tsx`
- Add `calcMode` and `targetSupports` to the initial state
- Pass them through to GeometryCard and the calculation engine

### 4. `src/components/ResultsPanel.tsx`
- Show the computed L or h value prominently when in reverse mode

---

## Technical Details

### Binary search for max L
```
lo = 0.1, hi = 1000 (meters)
iterate 50 times:
  mid = (lo + hi) / 2
  compute stress at mid with given h and targetSupports
  if stress <= allowable: lo = mid
  else: hi = mid
result = lo
```

### Direct solve for max h
```
For numSpans = targetSupports + 1:
  span_mm = L_mm / numSpans
  M_self = q * span_mm^2 / 12
  M_allowable = allowable_stress * I / c
  M_available = M_allowable - M_self
  if M_available <= 0: h = 0
  else: h_span = M_available * span_mm^2 / (6 * E * I)
        h = h_span * numSpans
```

### UI mode selector
Uses the existing Radix `ToggleGroup` component with 3 items: "Standard", "Find L", "Find h". Compact, fits inside the Geometry Card header area.

