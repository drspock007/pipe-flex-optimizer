# Permanent maintained deviation — elastic steel, version 1

This is a separate **direct calculation** branch of the in-service module. Existing
interventions and searches keep the temporary solver, limits and budgets. Inputs
are canonical mm, N, MPa, C and kg/m3; soil reaction curves are N/mm versus mm.
A computed result is not a CSA installation approval or a validation of site data.

## Mechanical formulation

Initially straight uniform steel, ideal clamps, small strain and moderate rotation.
Each node carries axial translation and two Hermite transverse translations/rotations.
Within an element of length l, geometric extension is
`g = 1/2 integral(y'^2 + z'^2) dx`. The extension is `du + g` and effective axial
force is `N = N0 + EA (du + g)/l`. Its energy contribution is
`N0 (du+g) + EA (du+g)^2/(2l)`. Bending energy is `EI/2 integral(y''^2+z''^2) dx`.
The variable nodal axial displacement permits elementwise varying axial force.
The within-element geometric extension is condensed (no pointwise membrane locking).
Five-point Gauss integration is exact for the polynomial geometric/bending terms.
Wall force is `N + pressure*Ai`; initial pressure/thermal force uses the original
scenario reference temperature. No step resets steel strain, stress or reference shape.

Newton equilibrium uses the consistent tangent, banded Cholesky without
regularization, residual-decreasing line search, and a separate unilateral contact
active set. A positive-definite tangent is required on the actual free DOFs; failure
is unresolved, not proof of physical instability or permission for postbuckling.
Initial free-span compression is screened by the existing fixed-fixed Euler bound.
The existing slope bound 0.1 and full length/OD >=10 apply. Exceeding yield stops
elastic assessment. These scope bounds are not code acceptance criteria.

Stress uses independent element maxima of section normal/bending stress and
transverse shear, combining Lamé pressure stresses, actual wall force and annular
beam shear. Bending/shear are recovered from the FE curvature and its derivative;
this is a section bound for the discretized beam, not an exact local 3D stress or
an a priori error bound for the continuum. Refinement is essential.

## Construction history

Excavation releases the original soil balancing dead weight. Initial supports can
remain at zero elevation or be unloaded under central equipment control before
movement. The equipment controls the selected direction(s) only. Existing loaded
supports are lowered until reaction vanishes before reuse/repositioning.
New pairs can use the same or different symmetric longitudinal positions. Fitted
heights are captured after initial supports are unloaded, while the equipment holds
the imposed central position. They add no preload. Common heights are absolute
pipe-axis elevations; raising them above the current pipe creates computed preload.
Pairs are numbered centre outward; removal order is explicit and editable.

Equipment release replaces the displacement constraint by its equilibrating force,
then ramps that force to zero. This allows elastic rebound instead of locking the
target shape. Release occurs before or after backfill as selected. Removal lowers
each pair progressively until both reactions are zero; only then is it removed.
All steps are quasistatic; installation feasibility, contact width and device capacity
are not modeled. Vertical supports cannot maintain lateral displacement by themselves.

## Backfill and operating cases

Zones partition the full excavation. Equal activation numbers act simultaneously.
Distributed springs are lumped to element endpoints using tributary lengths, with
nodes exactly at zone edges/supports. Curves are monotone piecewise linear reversible
force–movement laws; axial/lateral laws are symmetric and vertical up/down laws are
separate. At the terminal resistance the force is capped for diagnostic equilibrium,
but **any computed terminal resistance/domain limit prevents verified retention**.
No plastic soil slip, hysteresis or cyclic accumulation is modeled.

Axial, lateral and uplift spring reference positions are captured once at zone
activation. The downward bed is below that activation shape by the entered gap.
Activating springs does not make the steel stress-free. Spring stiffness and the
specified downward backfill/construction loads ramp together in each stage. Temporary
construction load is removed after that stage. Thus this model represents the stated
staged support/load activation, not a detailed compaction simulation. Positive
distributed loads act downward. Sources, load values and curves must be entered;
project values remain necessary for assessed verdicts. The UI now offers explicitly
labelled illustrative starting values (see below).

All support pairs are removed after backfill and equipment release. Each future
operating case starts independently from this final loaded state. Pressure,
temperature and explicit fluid density ramp to their case values. Material properties
remain constant and must be confirmed applicable to every temperature. The listed
cases are not an automatically verified envelope, fatigue spectrum or arbitrary
history of operating cycles. Flexible buried-end response is outside this version.

## Verdicts, uncertainty and reporting

The existing 60 s global calculation budget and 16/32/64/128 base grids with
4/8/16/32 increments are retained. Nodes are added at physical supports/zone edges.
Observed support-contact changes are localized to interval <=1/(64*increments),
with depth 8 maximum. This is not proof that every unsampled event was detected.
Two successive refinements must change metrics by <=0.5% using existing absolute
floors (0.05 MPa, 1 N, 0.01 mm). Metrics include phase stress/equipment/reaction/gap
peaks, distributed soil-reaction envelopes and axial/transverse displacement profiles
at 33 common positions for released/final/operating milestones. Distributed reaction
comparison uses the force-per-length envelope multiplied by full span length,
with the existing 1 N floor; it does not compare mesh-dependent nodal forces.

Custom stress, retained centre position and soil-limit results are distinct.
Stress uncertainty is the last change plus 0.01 MPa. Position uncertainty is the
largest checked displacement change plus 0.01 mm. Position compares the centre to
the imposed target only in controlled directions, at the final state and during
all computed operating transitions. Uncontrolled displacement is reported. Partial
or unconverged histories produce no satisfied verdict; missing data blocks this
branch. Old presets remain temporary; version 3 preserves optional permanent data
and missing numeric values. Reports use only the completed request snapshot.

Excluded: fatigue, defects/corrosion, weld concentration or rupture capacity,
ovalization, local buckling, soil consolidation, evolving settlement, irreversible
soil behavior, support/equipment strength and local contact. CSA targeted checks
remain independent and retain their original applicability; they do not approve the
permanent construction or operating state.

## Numerical evidence and reproducibility

- Tests compare to the existing coupled no-soil Hermite solver, finite-difference
  tangent derivatives, force balance, nonzero support heights and no stress reset.
- Sequence tests exercise both release choices, initial support removal, lateral
  rebound, new/common support positions, removal order, soil limits and budget stops.
- `scripts/check-permanent-reference.ts` exports histories for four synthetic cases
  (before/after backfill, vertical/combined), including pressure/cooling operation.
- `scripts/check-permanent-reference.py` independently rebuilds the FE equilibrium
  using closed-form Hermite matrices, dense NumPy solves and its own active set.
  It imports no production solver code and does not initialize from expected results.
  It compares every exported state, including axial force. This is independent
  numerical implementation evidence for these cases, not independent geotechnical
  validation or a commercial-code certification. Both models share beam hypotheses.
- Reference check: 385 states; maximum nodal displacement error < 5.6e-8 mm and
  axial-force error < 0.0003 N for the committed fixtures.

Run with the existing Node/Vite runtime and a Python environment with NumPy:
```
./node_modules/.bin/vite-node scripts/check-permanent-reference.ts
python3 scripts/check-permanent-reference.py
./node_modules/.bin/vitest run src/lib/in-service/permanent/__tests__
./node_modules/.bin/vite-node scripts/check-permanent-report.ts
```
No dependency or lockfile update is necessary. Outputs live in ignored output/pdf/.

## Guided entry and illustrative starting values

New permanent UI profiles are prefilled by `starters.ts`; existing saved profiles
and deliberately cleared fields are not silently changed. The explicit fill-empty
button preserves finite entries and fills missing permanent-profile fields only.
Identity, CSA design inputs and applicability confirmations are not fabricated.
Uniform / successive halves / ends-then-centre layouts generate adjoining zones.
Splitting the longest zone preserves coverage and copies its properties.

These are examples, **not the most common geotechnical design values**:
- centre tolerances 10 mm; bed gap 0 mm; backfill weight estimated as described below (legacy direct-load starter: 1 N/mm);
- construction load 0; future operation initially copies construction P/T/density;
- intermediate terminal (movement mm, resistance N/mm): axial (20,20),
  lateral (50,40), bearing (10,100), uplift (25,10), each preceded by (0,0);
- flexible/stiff examples multiply resistance by 0.25/4; they are sensitivity
  cases, not calibrated sand, clay or gravel classifications;
- common height starts at zero (original axis), while fitted settings remain
  calculated. A common height is not an automatically derived jack setting.

The optional `defaultsReviewed` flag is false when examples are introduced and
persists in presets/snapshots. Numerical calculations may run, but both mechanical
and retained-position verdicts remain not evaluated until the user reviews the
values against project information. Reapplying examples clears the review. Legacy
profiles without this flag retain their explicit-data behavior. Curve sources
identify examples; filling missing points appends that provenance to an existing
source. Reports retain the warning and the separate not-evaluated verdicts.

Soil reaction and mobilization cannot be inferred from a material name alone.
For conceptual background (not a source of the example numbers), see the
[Orcina buried-line formulation](https://www.orcina.com/webhelp/OrcaFlex/Content/html/Linetheory%2CBuriedlines.htm).
Our reversible laws do not implement that product's history-dependent model.

### Guided backfill weight

New UI profiles estimate distributed dead load from a rectangular soil column:
`q [N/mm] = density [kg/m³] × 9.80665 × cover [m] × width [m] / 1000`.
Cover is measured above the pipe crown, not to its axis or the trench bottom.
Starting examples are 1 m cover, 1800 kg/m³ bulk density and steel OD for width.
These are editable illustrative assumptions, not material-specific design values.
The width is stored explicitly; changing pipe size does not silently change it.
The action “Use current pipe outside diameter” updates it explicitly.
This above-water column-weight estimate does not model arching, buoyancy,
soil beside the curved crown, consolidation or compaction forces, and is not
a universal conservative earth-load method. It does not generate soil resistance curves.
A study-derived distributed load can still be entered directly. Existing profiles
retain their direct loads. Missing/invalid estimator inputs invalidate the derived
load; validation rejects mismatches between saved geometry and saved load.
Both report formats record geometry, density, resulting load and exclusions.
Conceptual background on prism loading and differing earth-load methods:
https://www.fdot.gov/docs/default-source/structures/structuresresearchcenter/Final-Reports/BC775-vol-one.pdf
This reference does not calibrate the illustrative starting values.
