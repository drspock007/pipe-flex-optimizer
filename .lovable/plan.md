

# Fix Critical Unit Error in Calculation Engine

## Problem

There is a unit mismatch in the linear weight `q` calculation. The code computes `q` in **N/m** but then uses it in formulas where span length is in **mm**, which expects `q` in **N/mm**. This makes the self-weight contribution **1000x too large**, corrupting all results.

## Root Cause

Line 155 of `src/lib/calculations.ts`:
```
q = density * g * A * 1e-6
```
- density (kg/m3) x g (m/s2) x A (mm2) x 1e-6 (mm2 to m2) = N/m
- But `computeStressForSpan` multiplies `q * span_mm^2`, requiring q in N/mm

## Fix

**File: `src/lib/calculations.ts`** (1 line change)

Change the conversion factor from `1e-6` to `1e-9` on line 155:
```
const q = includeSelfWeight ? density * g * section.A * 1e-9 : 0;
```

This converts A from mm2 to m2 (1e-6) AND q from N/m to N/mm (1e-3), total factor = 1e-9.

### Verification with default values
- Do=114.3mm, t=6.02mm, A~2048 mm2
- q = 7850 x 9.81 x 2048 x 1e-9 = **0.158 N/mm** (correct, ~16 kg/m pipe)
- Previously: 158 N/mm (equivalent to ~16,000 kg/m -- clearly wrong)

## Impact

This single fix corrects:
- Standard mode: correct number of supports needed
- Find L mode: realistic maximum pipe lengths
- Find H mode: realistic maximum settlement values
- Stress chart: accurate stress distribution curve

No other files need changes.

