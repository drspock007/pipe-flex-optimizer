# Validation — temporary in-service steel deflection

Branch: `codex/in-service-pipe-deflection`, based on `a303288` from
`codex/v2-13-handoff-fixes`. The existing mechanics-v2 solvers are unchanged.

## Automated evidence

- Full Vitest suite: **362 passing tests across 45 files** (317 baseline + 45 new).
- TypeScript: application and Node/Vite configuration pass.
- Production build: passes; existing large-chunk and outdated Browserslist notices remain.
- New/modified module lint: passes. Whole-repository lint remains at the baseline
  **15 errors / 17 warnings**; this is not a clean repository-wide lint claim.
- No dependency or lockfile changes.

New coverage includes independent analytical fixed-fixed beam deflection, reaction
and moment references; central imposed displacement; Lame pressure-only stress;
thermal/pressure/extra-force separation; horizontal free sag; subcritical compression;
Euler rejection; symmetry and equilibrium; combined-plane rotation; stop at first
out-of-scope path state; return phase endpoints; uncertain threshold; all catalogue
sections; custom dimensions and length beyond 100 m; unit and temperature conversion;
real length/displacement searches; synthetic disconnected/uncertain search regions;
failed final rechecks; budget exhaustion; worker cancellation, stale responses and
snapshot invalidation; SI/imperial PDF generation without mutating the report.

## Browser and PDF checks

Checked `/in-service` in the in-app browser:
- Explicit 80% threshold / safety-factor entry and calculation.
- Direct vertical case; horizontal pull with -5 kN extra axial force and no vertical
  actuator reaction; negative values entered from the keyboard.
- Exploratory displacement search: candidate rechecked and non-global-optimum wording.
- Changing SI to imperial preserves the existing result and calculation elapsed time.
- Input changes clear old results and exports.
- PDF export from the interface produced a five-page imperial search report in
  Downloads; extracted text contains the displayed 7.741 in candidate and search rows.

`scripts/check-service-report.ts` generates two six-page reference reports and a
full JSON snapshot under ignored `output/pdf/`. All SI and imperial pages were
rendered and visually checked, including tables, phase peaks, both profiles,
refinement tables and footers. The browser-exported search report is also checked.
Screenshots of the local interface are kept in the same ignored directory.

Reference case: OD 168.3 mm, t 7.11 mm, E 207000 MPa, yield 359 MPa, p 2 MPa,
T 20 C, 10 m each side, upward displacement 200 mm, custom threshold 80%.
With Tref=20 C and Nextra=0: computed beam bound **292.206 MPa**, custom criterion
exceeded. With Tref=10 C and Nextra=-5000 N: **254.760 MPa**, custom criterion met.
These are regression examples, not approved operating procedures.

## Limits of the evidence

The model is an elastic, moderate-rotation, uniform steel beam approximation.
Mesh/path refinement and analytical benchmarks do not establish physical validity
for a specific pipeline or code compliance. No independent commercial FE benchmark,
field calibration or normative validation has been performed. Supported initial
state, uniform release/restoration of support and perfect buried clamps are explicit
idealizations. The shear-inclusive Von Mises result is a conservative beam bound,
not a local stress prediction at the actuator or a defect.

CSA Z662:2023 checks await the requested excerpts. ASME and European modules and
PEHD remain outside this delivery. See `in-service-model.md` for equations, numerical
scope guards, sign conventions and source references.

Input parity update: shared steel-grade selector and coating card; kPa/psi pressure roundtrip and preset/custom coating weight regression checks pass. Both six-page reports were regenerated and visually inspected after the input table change.

Fluid selector update: dry-air and hydrogen reference densities, absolute-pressure/temperature scaling, M and Z effects, custom/legacy behavior, invalid inputs, mechanical weight equivalence and SI/imperial conversions pass. A rendered React interaction test verifies gas selection, live density recalculation and return to custom entry. Four-page gas-model PDFs and six-page custom-density PDFs were checked in both unit systems.

## Temporary supports — model 2

Analytical reference: three equal spans with rigid vertical intermediate supports
and fixed external ends under uniform load, linear N=0. Equal span length l=D/3:
intermediate reactions q*l, clamp reactions q*l/2, middle sag -q*l^4/(384*EI),
clamp moment magnitude q*l^2/12. Verified independently of nonlinear compatibility
by setting EA=0 in the isolated solver benchmark only (physical input validation
still requires positive stiffness). Asymmetric supports verify full force/moment
balance and complementarity. Further checks cover detached reactions, recontact,
reflection symmetry, event localization, free horizontal motion, retained lateral
Euler rejection, exact no-support regression, spacing failure, UI custom-position
scaling, final-recheck failures and the single count-search budget.

Reproducible example in scripts/check-service-support-report.ts: NPS 8, t=8.18 mm,
40 m total, p=2900 kPa, T=Tref=10 C, natural gas with methane M and Z=1, Yellow Jacket,
40% of 359 MPa, target +150 mm. Zero supports fails at 174.224 MPa during excavation;
two supports at 13.333 and 26.667 m pass the custom model criterion at 108.608 MPa
(75.63% utilization), governing at target. This is a model example, not a support
capacity or field-method approval. The seven-page SI and imperial PDFs were rendered
and every page checked (including continuation tables and footer).

Browser checks in a dedicated local tab verify a two-support direct case and the 40 m support-count search (two supports), SI/imperial conversion without rerunning, and selection
of excavation vs target and corresponding reactions/contact states. No external FE
or field validation is claimed. Contact changes are localized where sampled states
change; unsampled events are not mathematically excluded. Return is the reversible
outgoing path, appropriate only to the documented elastic frictionless assumptions.
