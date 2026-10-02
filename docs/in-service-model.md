# Temporary in-service steel pipe deflection (model 2)

This separate module does not change mechanics-v2. Units in its public request and
solver are mm, N, MPa, degrees C, kg/m3. Full excavated length D = 2 * halfLength.
The pipe is straight, uniform, isotropic, elastic steel; both ends fix translations
and rotations. Pressure is uniform gauge pressure (zero external pressure). The
fluid and coating add dead weight; the coating adds no structural stiffness.
Thickness is a uniform analysis thickness, not an assessment of local corrosion.

## Constitutive and pressure conventions

Let ro=OD/2, ri=ro-t, A=pi(ro²-ri²), Ai=pi ri², I=pi(ro⁴-ri⁴)/4.
Lame stresses: a=p ri²/(ro²-ri²), b=a ro²;
sigma_theta=a+b/r², sigma_r=a-b/r².
Axial strain = (sigma_z - nu*(sigma_theta+sigma_r))/E + alpha*(T-Tref).
For the initially straight axially restrained state:
Nwall0 = 2*nu*p*Ai - E*A*alpha*(T-Tref) + Nextra.
Nextra is additional wall force excluding modeled pressure and thermal effects.
Effective tension N0=Nwall0-p*Ai (tension positive). This distinction follows
Orcina's pipe-pressure force convention:
https://www.orcina.com/webhelp/OrcaFlex/Content/html/Linetheory%2CLinepressureeffects.htm
Thermal reference / initial axial force convention:
https://docs.software.vt.edu/abaqusv2025/English/SIMACAEELMRefMap/simaelm-c-usingframesection.htm

The small-strain, moderate-rotation von Karman model uses
S=integral(z'^2+y'^2) dx; N=N0+EA*S/(2D); Nwall=N+p*Ai.
Energy = (d'Kb d)/2 + N0*S/2 + EA*S²/(8D) - F'd.
For fixed N both bending planes solve (Kb+N G)d=F with prescribed DOFs.
Axial compatibility is bracketed on [N0,N0+EA*S(N0)/(2D)]. On the positive
stiffness branch S is nonincreasing in N, making the scalar residual monotone.
The existing pure Hermite element, polynomial and band-factor utilities are reused;
the old restrained solver and its N>=0 contract are not changed.

## Stability and applicability

Before releasing support require N0 > -4*pi²*EI/D² (the full-span fixed-fixed
Euler load) with a 1e-6 relative numerical guard. Otherwise report instability risk
and stop: no stabilization by a prescribed middle restraint or post-buckling search.
Above this bound Kb+N G is positive definite on the whole unrestrained span;
the additional compatibility tangent is positive semidefinite. Cholesky failure
is numerical failure, not proof of physical instability. Conservative model-domain
screens: D/OD >= 10 and max resultant slope <= 0.1. These are implementation scope
limits, NOT code acceptance criteria. States beyond them remain unresolved.

## Stresses

End actions recover equilibrium moment polynomials, M''=N*w''-q. Their magnitude
maxima and M' magnitude maxima are found from polynomial stationary points in each
element. At radius r, choose the extreme bending fiber:
VMnormal²=(abs(Nwall/A-a)+|M|*r/I)²+3*b²/r⁴.
This expression is convex in r; the section maximum occurs at ri or ro. Include
transverse beam shear conservatively with
 tau_bound=|V|*(ro²+ro*ri+ri²)/(3I), from the annular Jourawski Q/(I*b_width)
upper bound. Report sqrt(max(VMnormal²)+3*tau_bound²). The separate moment/shear
maxima within each element make this a conservative **Von Mises beam bound**,
not an exact local 3D stress. Report its critical element and normal-stress
location separately from the shear location. No torsion, local sling contact,
ovalization, defects, weld concentration, fatigue or soil failure assessment.

## Loading path and verification

Initially soil balances weight. Release it uniformly: 0..100% unsupported weight.
After the excavated state (free sag without supports), engage the central actuator at its current coordinates.
Ramp controlled components to the target measured from the original straight axis.
Vertical mode leaves lateral displacement free; horizontal mode leaves vertical
free; combined mode controls both. The reverse path is identical in this elastic,
frictionless model: explicitly return along the sampled states to the free-sag state,
then restore support to return to the initial straight state. Return to zero while
still excavated would require support and is not claimed to occur by unloading.

Refine full-span meshes 16/32/64/128 and path increments 4/8/16/32 together.
Require two successive changes <=0.5% in maximum stress, maximum actuator force,
and free-sag displacement (absolute floors 0.05 MPa, 1 N, 0.01 mm). Retain numerical
uncertainty around the criterion equal to the last stress change plus 0.01 MPa.
Strain exceeding yield is a stop, not a plastic solution. Every reported pass means
only the sampled/refined path satisfied this elastic beam criterion.

Searches sample 25 points (log length, linear displacement), then bisect observed
status transitions with at most 49 evaluations and a 60 second worker budget.
No monotonicity/global-optimality claim. Missing, failed or budget-limited samples
remain unresolved; candidate is recomputed and all scenarios must pass. Upper
bound reached is not a mechanical maximum. Bounds and numerical settings are
included in the report. Normative checks are unavailable until separately validated.

### Input display and coating catalogue
Pressure remains MPa internally and is entered/exported in kPa (SI) or psi (imperial). Steel grade selection shares the lowering module selector. Coating uses the shared catalogue and effectiveCoating rules, including NPS-dependent Yellow Jacket thickness. The report records the selected type and effective properties; older inputs without a coating type retain their explicit custom thickness/density.

### Fluid density at operating conditions
Custom density remains the default and is preserved for legacy inputs. The gas selector offers natural gas, dry air and hydrogen. The same pure helper supplies the displayed density, section weight and request-snapshot PDF:
`rho = (p_gauge + p_atmosphere) * 1e6 * (M / 1000) / (Z R (T_C + 273.15))`, with internal pressures MPa, M in g/mol, R=8.31446261815324 J/(mol K), result kg/m3.
Atmospheric pressure defaults to 0.101325 MPa and is editable; it is used for gas density only, while wall-force mechanics continue to use gauge pressure. Molar mass defaults: dry air 28.97, hydrogen 2.01588, natural gas 16.04246 (explicit pure-methane approximation, not a universal gas composition). M and Z are editable. Z defaults to 1: ideal gas, not an automatic real-gas equation of state or phase check. Users must supply mixture M and operating Z, or a known custom density, when this approximation is unsuitable. Invalid absolute temperature, nonpositive parameters and nonfinite derived density block calculation. Inactive gas fields do not invalidate custom-density mode.
Sources: [NASA equation of state](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/equation-of-state/), [NIST hydrogen](https://webbook.nist.gov/cgi/cbook.cgi?Name=H2), [NIST natural gas composition example](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=910034). Gas composition dependence is explicit; no reference-property solver is claimed.

## Temporary unilateral supports (model 2)

Inputs add an optional `supports` layout (`none`, `equidistant` with even count
2..20, or `custom` with 1..20 fractions x/D) and `maxSupports` (even 0..20,
default 10). Missing layout means no supports. Endpoints, duplicates and the
central actuator position are excluded. Custom positions can be asymmetric;
length searches preserve x/D. Count search tests 0,2,... in order and recomputes
the first passing candidate for every scenario within ONE existing 60 s budget.
It claims the smallest verified count in this family only; unresolved smaller
counts are explicitly retained. Support strength is not an acceptance criterion.

Each support is a fixed horizontal frictionless point obstacle at z=0 (pipe axis
reference, no additional radius offset). Gap z>=0, upward reaction R>=0, R*z=0.
It does not restrain y, axial sliding, or rotations. The contact surface is assumed
wide enough for lateral motion; local contact stress, capacity and settlement
are excluded. The full-span initial Euler screen remains necessary because the
lateral plane is free during excavation. No postbuckling or actuator stabilization
is introduced.

Use the existing 16/32/64/128 base grids plus exact support nodes. Nonuniform
Hermite element lengths are used in assembly, compatibility integration, force
and stress recovery. Spacing below 1e-9*max(1,D) mm is unresolved, never snapped
to another physical support. For each trial effective force, an active-set vertical
solve removes the most tensile constraint or admits the deepest penetration.
Warm start from previous solves; detect repeated active sets or 200-iteration
limit and report numerical failure. Require gap tolerance 1e-8*max(1 mm, imposed
vertical displacement magnitude, nodal vertical displacement magnitudes) and force
tolerance 1e-8*max(1 N, qD, vertical nodal residual magnitudes). Small negative
reactions within tolerance are reported as zero. Gap and reaction near zero are
labelled contact limit, without insisting on a unique active-set membership.
These tolerances do not relax the existing equilibrium or axial tolerances.

The initial soil reaction uniformly balances weight. Supports are in place before
release: uniform weight transfer to the pipe/support system, central actuation,
reverse elastic path with recontact, then uniform soil restoration. Support locations
never move. This is not a moving excavation front. With fixed obstacles, no friction,
and the retained positive-stiffness branch, return retraces the converged outgoing
states (including contact events), then the excavation states. No hysteresis or
impact dynamics is modeled.

Bisect sampled intervals whose non-limit contact states differ until interval
width <=1/(64*base increments). Stop at depth 8; an unresolved event prevents a
pass. This localizes observed changes, not a proof that unsampled events cannot
exist. Global mesh/path refinement remains required twice at <=0.5%; add per-support
reaction and gap envelopes, plus reactions/gaps at common path samples, with the existing 1 N and 0.01 mm absolute floors.
Stages carry support positions, reactions, gaps, contact state and iteration count;
reports expose selected stage, path diagnostics and maxima. Support reaction
maxima are loads for separate support design, not a capacity approval.

## Optional CSA Z662:2023 targeted assessment

The independent evaluator `csa.ts` implements only the plain pipeline minimum
nominal wall (4.3.11.2/table 4.5), table 4.4 temperature factor (4.3.9), and
anchored design-state pressure/temperature check (4.7.1, 4.6.5, 4.6.6).
See [csa-targeted-checks.md](csa-targeted-checks.md) for the applicability contract.
It neither changes the mechanical solution nor accepts/rejects search candidates.
The optional profile and versioned assessment belong to the completed report
snapshot. Editing any input invalidates that snapshot; unit changes do not rerun it.
Old presets load with CSA disabled. Profile blanks remain missing, not zero.

### Report formats and colours

The completed snapshot supports Summary and Complete PDF exports. Summary repeats
calculation conditions per scenario and includes essential target/path results,
support reaction peaks, partial CSA statuses and indispensable scope notes. It
normally fits one page per scenario; long names/support lists flow without clipping.
Diagnostic search samples and incomplete paths remain explicitly identified.
Complete retains formulas, profiles and all diagnostics. Both capture current
CSS theme tokens at export time (including dark/light background), and use the
same exact blue/amber/emerald profile colours as the interface. Theme and format
selection do not change or rerun the mechanical calculation.

PDF export requires a nonblank preparer name and project name (80 characters max).
Identity is kept separately from mechanical inputs and survives input invalidation;
changes to identity do not rerun mechanics. Both service PDF generators validate
identity before creating a document and print export date/time and local timezone,
separately from the calculation timestamp. Pipe-lowering export enforces the same
identity validation. Input help is available by hover, focus, keyboard activation
or click and does not supply missing engineering data.

## Permanent maintained deviation (separate branch)

The optional versioned permanent profile selects a separate elastic direct solver.
See [the permanent formulation, construction history and evidence](permanent-elastic-model.md).
It includes adjustable symmetric supports, staged backfill, force release and future
operating cases. It does not replace the temporary solver described above. Reference
numerical comparisons do not validate project soil data or excluded integrity checks.

## Sag-only assessment (version 1)

`analysis: 'sag'` selects a separate path with `sag: {version:1, boundary:
'clamped'|'simple', confirmed:boolean, limit?:number}`. Absent analysis retains
movement mode. Preset version 4 adds this profile; versions 1-3 remain movement.
Full span L is displayed, while `halfLength` and length search samples remain
half-span mm internally. Movement amplitudes, directions, intermediate supports
and permanent profiles are retained but unused. Permanent + sag is invalid.
Fixed span requires a finite positive L; Find L requires positive increasing bounds
and a positive sag limit. A missing optional fixed-span limit gives no sag verdict.

Clamped sag reuses the coupled beam only through initial state and progressive
excavation; no actuator, displacement, return or restoration. End restraints,
pressure/thermal wall versus effective forces, stability and refinement are unchanged.
Sag is the largest negative vertical displacement found from Hermite polynomial
stationary points and endpoints, not the display sampling. The final sag and stress
verdicts are separate. Sag uncertainty is the last refinement change plus 0.01 mm;
limits within that band are unresolved. The existing 0.5% convergence and floors
remain, with maximum sag replacing midpoint sag for this branch only.

Simple supports represent one level, uniform Euler-Bernoulli span: rotations free,
one end axially sliding, no applied axial force, gauge pressure exactly zero.
Temperature still determines entered material properties and gas density; no thermal
restraint force arises. Analytical maximum sag is 5qL^4/(384EI), moment qL^2/8,
reactions qL/2, slope qL^3/(24EI). N and Nwall are zero. The existing annular
stressBound combines global moment/shear maxima conservatively. No numerical mesh
convergence is claimed. Analytic equality is admissible; clamped uncertainty bands
are retained. Both branches enforce L/OD >= 10, slope <= 0.1 and elastic yield scope.

No intermediate supports, overhangs, soil or backfill. Inclined slings, lifting
dynamics, local bearing and equipment capacity are not evaluated. A long pipe is
not automatically clamped, nor is this a continuous multi-span model. Simple supports
make the CSA anchored-state check not applicable, even if its old checkbox is set.

Find L samples 25 logarithmic half-spans, refines observed pass/non-pass transitions
up to 49 samples, and rechecks the largest passing candidate for all scenarios under
the existing 60 s global budget. Mechanical and deflection criteria must both pass.
Unknown regions are never treated as failed/infeasible. An upper bound reached is
not a physical maximum. Summary/complete reports use only completed snapshots and
retain independent stress/sag verdicts and all incomplete/failed diagnostics.

Empty pipe is custom fluid density = 0 and gauge pressure = 0: fluid weight and
pressure contributions vanish, not steel/coating weight or imposed thermal/axial
prestress. The explicit empty-pipe action makes these three input changes together;
zero gauge pressure in a gas EOS still produces atmospheric gas density.

### Sag-only verification evidence

The dedicated sag regression suite checks empty/coated pipes versus atmospheric gas,
independent simple-beam formulas, clamped agreement with the existing excavated
state and its weak-load linear limit, stress- and sag-governed searches, equality
and uncertainty, invalid/unstable cases, budget exhaustion, preset migration,
unit conversion, CSA applicability and coherent exports. The component test checks
full-span entry, hidden inactive fields and retained movement settings.

Delivery checks (2026-10-01): 447 tests across 66 files passed; application and
Node TypeScript checks and client/SSR/prerender builds passed. Repository lint
retained its pre-existing 15 errors and 17 warnings. Twelve generated PDF fixtures
(34 pages, all visually inspected) cover summary/complete SI/imperial output,
light/dark palettes, sag failure and unresolved compression. Reproduce with
`./node_modules/.bin/vite-node scripts/check-sag-report.ts`. Browser checks cover
fixed sag, Find L, unit-only conversion, result invalidation and required PDF identity.
These are implementation/model comparisons, not certification of lifting equipment
or of a project's end-restraint assumptions.

Sag-only results display both 100 × stress/custom allowable and 100 × stress/yield
strength from the completed request snapshot. An explicit warning appears when
custom utilization exceeds 100%, independently of the deflection verdict; diagnostic
or out-of-domain results retain their existing limitations. The same values and
warning are included in both PDF formats. Comparisons use unrounded values, and a
small exceedance is not rounded down to an apparently equal 100.00%.

PDF filenames use the study identifier, preparer initials and export timestamp
YYYYMMDDHHmm in the exporting user’s local browser timezone, with the summary/complete suffix where applicable.
This is distinct from the fixed app release timestamp, which uses Europe/Rome.
The app release is captured separately from the mechanics model version when a
calculation runs. Every PDF page displays this captured release; legacy snapshots
without it say "App version not recorded", never the current release at export.
The shared release constant is src/lib/app-version.ts.

All PDF exports across both modules, including Summary and Complete, end with a
blank Signature box. Shared filename and captured app-version rules apply to every
export. The signature space does not imply approval of excluded checks.

Signing space is a compact 80 × 12 mm box on the final content page. Report
layout reserves the bottom signing area before pagination; adding the signature
never creates a page on its own. Text sizes and diagnostic content are preserved.
