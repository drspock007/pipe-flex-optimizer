# CSA Z662:2023 targeted checks — applicability contract

Evidence: user-supplied French CSA Z662:2023 section 4 excerpts and Annex C,
December 2023 edition. This is a transcription of targeted rules, not independent
certification or a claim of jurisdictional applicability. Do not reproduce source
screenshots in the repository. No other edition is silently substituted.

## Inputs and independence

The profile is optional and disabled by default. Its pressure, design maximum
and anchoring temperatures, nominal thickness, 4.3.10 allowance and specified
SMYS are separate from operating inputs and analysis thickness/yield strength.
The explicit copy action copies operating P/T and analysis thickness only; it
makes no assertion that these are sufficient design values. Scope confirmations
are required for eligible steel and plain pipeline pipe; the anchored check also
requires axial restraint. Unconfirmed scope is not assessed.

The pressure/temperature check represents one independently specified design
state, not any point in the excavation/lifting path. It cannot validate extra
axial loads: any nonzero or unknown extra force in the mechanical scenarios blocks
this check. The maximum design temperature must cover both operating and anchoring
temperatures; design pressure must cover operating gauge pressure. No finite
mechanical result is required to evaluate these independent design data; a CSA
pass never resolves a mechanical failure.

## Implemented checks

- 4.3.11.2, table 4.5: plain pipeline column only. Use the next larger listed
  diameter for intermediate OD, no extrapolation outside 10.3–2032 mm. Compare
  nominal wall directly with the tabulated minimum. Demand/limit is required wall
  divided by provided wall. This is not pressure-design or local-corrosion approval.
- 4.3.9, table 4.4: T=1 through 120 C; 150/.97, 180/.93, 200/.91,
  230/.87, linearly interpolated. No extrapolation above 230 C. Absolute-zero
  and nonfinite temperatures are invalid. Computing T does not assess low-temperature
  toughness or material suitability; those remain outside this implementation.
- 4.6.5 and 4.7.1: tn = nominal wall minus nonnegative 4.3.10 allowance;
  Sh = P OD / (2 tn); SL = nu Sh - E alpha (T2 - T1).
  Require tn > 0. For SL <= 0, Sh - SL <= .90 SMYS T, equality accepted.
  For SL > 0 the article is not applicable. Use the 4.6.6 carbon/high-strength
  low-alloy steel constants E=207000 MPa, nu=.3, alpha=12e-6/C within the
  supported temperature domain. No replacement with wall/effective force or
  Lamé/VM solver stresses. Nonfinite derived output has no verdict.

## Explicitly unassessed

4.7.2 sustained bending/beam-column stability requires a justified load mapping;
the solver's initial Euler screen is not its normative stability verification.
Annex C requires separate applicability, characteristic distributions, safety class
and capacities. Hydrogen is excluded from Annex C; that exclusion is not asserted
for all of section 4. Local contact, defects, weld capacity, fatigue, soil failure,
support capacity and overall lifting acceptance are not covered.

Each result carries its article, formula, input/derived values, status and reason.
Available statuses: satisfied, exceeded, not applicable, not assessed. No aggregate
CSA pass exists. The engine's existing custom threshold and search rules remain
unchanged. Presets v2 include the optional profile; v1 loads without a profile.
PDF and screen use the stored assessment, never recompute from live fields.

## Reproducible verification

- `bun run test -- src/lib/in-service/__tests__/csa.test.ts src/components/in-service/__tests__/ServiceCsa.test.tsx src/lib/in-service/__tests__/presets.test.ts src/hooks/__tests__/useServiceEngine.test.ts`
- `bun run typecheck`, `bun run build`, `bun run lint` (compare pre-existing lint diagnostics).
- `bunx vite-node scripts/check-service-csa-report.ts` generates six QA PDFs under
  `output/pdf`: satisfied/exceeded/missing inputs, each in SI and Imperial.
  Render and inspect all pages after export changes. These are test fixtures,
  not approved intervention designs.

Implementation verification included independent arithmetic, table boundaries,
missing/invalid data, preset migration, input UI and unit conversion, and real-solver
comparisons of results, sample statuses and candidates in all four modes.
The browser confirmed that editing CSA inputs removes the export until recalculation,
and that changing units preserves the current result. Six 8-page QA reports were
visually inspected, including the updated CSA tables in both unit systems.
