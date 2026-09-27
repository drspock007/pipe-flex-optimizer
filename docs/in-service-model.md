# Temporary in-service steel pipe deflection (model 1)

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
After the free sag state, engage the central actuator at its current coordinates.
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
