// src/pages/help/HelpCalcModes.tsx
// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
);

const HelpCalcModes = () => (
  <section id="calc-modes" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">9. Calculation Modes (biaxial engine V2)</h2>
    <P>
      The pipe is a linear Euler–Bernoulli beam clamped at both ends, bent in <strong>two planes</strong>:
      the vertical plane (end offset h<sub>v</sub>, positive when the right end is higher, plus gravity acting
      vertically downward) and the lateral horizontal plane (end offset h<sub>l</sub>, no lateral load).
      Intermediate supports are equally spaced, act only vertically and only in compression
      (<strong>unilateral contact</strong>: a support either carries an upward reaction or the pipe lifts off it).
      Supports do not restrain lateral displacement. The axial mode is <strong>free longitudinal sliding</strong>;
      axial restraint is not implemented. The resultant stress is σ = c·√(M<sub>v</sub>² + M<sub>l</sub>²)/I,
      evaluated at the same position, its maximum being found exactly (never from chart points).
    </P>

    <h3 className="text-base font-semibold mt-4">9.1 Fixed L</h3>
    <P>
      Solves the pipe for the entered length L, offsets h<sub>v</sub>, h<sub>l</sub> and the installed support count.
      Results are shown even when the bending criterion is not met, as long as the calculation is numerically valid.
    </P>

    <h3 className="text-base font-semibold mt-4">9.2 Find L range</h3>
    <P>
      For the installed support count, finds <strong>every range of lengths</strong> meeting the bending criterion
      (σ<sub>max</sub> ≤ σ<sub>allow</sub>, no hidden margin). The contact regimes are followed exactly along L,
      and in each regime the convexity of σ² in L⁴ is exploited. There is no length grid and no arbitrary length cap.
      Ranges may be unbounded (for example without self-weight). The length entered for Fixed L is not used.
    </P>

    <h3 className="text-base font-semibold mt-4">9.3 Minimum supports</h3>
    <P>
      Searches the smallest installed support count, from 0 up to the chosen ceiling (max. 20), that has at least one
      admissible range. The minimum is <strong>certified</strong> only if every smaller count was fully evaluated.
      "No admissible length" is stated only within the studied scope; an incomplete or numerically undecidable
      evaluation is reported as such and never as absence of solution.
    </P>

    <h3 className="text-base font-semibold mt-4">9.4 Represented length</h3>
    <P>
      After a search you can pick a range and a length: its finite bounds, its midpoint (finite ranges only), an
      attained minimum-stress length, or a custom length. The initial choice is the minimum-stress length of the
      first range, else its midpoint, else a finite bound. Details and charts are computed by a full solution at that
      length; "admissible range exists" and "criterion met at the represented length" are shown separately.
    </P>

    <h3 className="text-base font-semibold mt-4">9.5 Find h</h3>
    <P>
      Find h keeps L, h<sub>l</sub>, section, material, load and installed supports fixed and returns every signed range of
      h<sub>v</sub> (up +, zero included) meeting the bending criterion. The entered h<sub>v</sub> is not used. The explored
      domain is |h<sub>v</sub>| &le; H<sub>cap</sub> = &sigma;<sub>allow</sub>L&sup2;/(4Ec): the criterion bounds the curvature by
      &sigma;<sub>allow</sub>/(Ec), and with zero end slopes integrating the slope gives this necessary (not sufficient) bound.
      At fixed L the free gaps are affine in h<sub>v</sub>, so contact regimes are traversed exactly (no height sweep). In each
      regime the stress maximum is convex in h<sub>v</sub>; bounds are refined on the admissible side and re-checked with the
      full solver. The initial represented h<sub>v</sub> is the upper bound of the range with the largest admissible value;
      midpoint, bounds or a signed custom value can be chosen. Details and charts come from a full solution at that h<sub>v</sub>.
    </P>
    <h3 className="text-base font-semibold mt-4">9.6 Ground contact (all modes)</h3>
    <p className="text-sm text-muted-foreground">
      Optional rigid, horizontal, frictionless ground over the full length, vertical plane only. The input is the minimum
      pipe-axis elevation (ground elevation + outer radius, coating included), in the same axes as h<sub>v</sub>
      (z(0) = 0, z(L) = h<sub>v</sub>). An imposed end below that level is reported as a geometric incompatibility.
      The pipe is meshed with exact beam members (installed supports are mesh nodes) and nodal unilateral contacts are
      solved by an active-set method without penalty. The mesh is doubled until the maximum stress, the reactions and
      the displacements converge on two consecutive refinements and the penetration between nodes, checked on the exact minima of each
      member, stays below 1e-5 of the displacement scale; otherwise no result is published. Ground reactions are
      discrete nodal forces (not pressures); contact zones are graphical estimates. The stress convergence threshold is
      max(1e-3 &times; &sigma;, 1e-5 &times; &sigma;<sub>allow</sub>), where 1e-5 &times; &sigma;<sub>allow</sub> is only the absolute floor;
      it measures the change between meshes and is neither a mechanical margin nor a guaranteed error bound. The criterion
      &sigma; &le; &sigma;<sub>allow</sub> stays strict; a verdict not decidable at that precision is flagged as uncertain.
      Reactions at ground level are listed separately (ground, combined support/ground, clamps; a clamp reaction is signed)
      and their sum explicitly includes the clamps.
    </p>
    <h3 className="text-base font-semibold mt-4">9.8 Find L range with ground contact</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      With ground contact, Find L range searches L inside an explicit exploration domain [L<sub>min</sub>, L<sub>max</sub>] entered by
      the user (older configurations get [L/4, 4L] once). h<sub>v</sub>, h<sub>l</sub>, q (total weight qL), supports
      (x<sub>i</sub> = iL/(n+1)) and the ground level are fixed. Each L is solved with the complete ground solver; sampling uses ln L
      with adaptive refinement, without assuming monotone or convex stress. Ranges are estimated between verified admissible samples,
      coverage is never certified, and every conclusion holds within the searched length domain only. An admissible sample at a domain
      edge is reported as &laquo; admissible at search boundary &mdash; range may continue beyond &raquo;. The initial represented L is
      the verified admissible sample with the lowest computed stress (not a global minimum); a midpoint is re-solved and its own verdict shown.
    </p>
    <h3 className="text-base font-semibold mt-4">9.9 Min. supports with ground contact</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      With ground contact, Min. supports runs Find L range with ground for 0, 1, 2&hellip; installed supports in order, up to the
      chosen ceiling (max 20), inside the same length domain. No bisection is used: support positions change with their number.
      The first count whose admissible length passes an independent complete solve (valid, criterion met, not uncertain) is retained.
      A single global budget (evaluations and time) covers all counts and final checks; partial results are reported if it runs out.
      <strong> Found is not the same as demonstrated minimal.</strong> If 0 supports suffice, the minimum is certified in the model
      (no smaller count exists), even though the length coverage stays uncertified. For a candidate above 0 the result reads
      &laquo; Smallest support count with a verified solution found &mdash; minimum not certified &raquo;: lower counts were only explored,
      and an exploratory search without admissible point is not an impossibility proof. Installed supports and actually active contacts
      are distinguished; the installed-supports input of the other modes is not modified.
    </p>
    <h3 className="text-base font-semibold mt-4">9.7 Find h with ground contact</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      With ground contact, Find h searches h<sub>v</sub> in [max(ground level, &minus;H<sub>cap</sub>), H<sub>cap</sub>]. H<sub>cap</sub> =
      &sigma;<sub>allow</sub>L&sup2;/(4Ec) remains a necessary bound: with clamped ends the vertical curvature integrates to zero and
      h<sub>v</sub> = &int;(L&minus;x)&kappa;dx, so |h<sub>v</sub>| &le; KL&sup2;/4 with K = &sigma;<sub>allow</sub>/(Ec), whatever the loads
      (ground and support reactions included). A ground level above zero is incompatible with the left end; negative h<sub>v</sub>
      are possible when the ground is below zero. Each h<sub>v</sub> is solved with the complete ground solver (mesh convergence).
      The domain is sampled on a grid, verdict changes are bisected, and same-verdict intervals are refined until an estimated
      slope bound or local monotonicity rules out a hidden change; this is not a proof, and features narrower than the minimum
      step (domain/1024) cannot be excluded, so search coverage is never certified. Ranges are shown as &laquo; Estimated admissible
      ranges &raquo;: only their end samples are individually verified. A transition bracket (adjacent admissible and not-admissible
      decidable samples) contains at least one crossing if stress is continuous in h<sub>v</sub>, without proving uniqueness or
      that all ranges were detected. Without any admissible sample the result reads &laquo; No admissible height found &mdash; search
      coverage not certified &raquo;. The represented h<sub>v</sub> is always re-solved with the complete solver.
      H<sub>cap</sub> derivation: (1) z(0)=0, z(L)=h<sub>v</sub>, z&prime;(0)=z&prime;(L)=0; (2) &int;&kappa;dx = z&prime;(L)&minus;z&prime;(0) = 0;
      (3) integrating by parts, h<sub>v</sub> = &int;(L&minus;x)&kappa;dx; (4) linear elastic, symmetric section with extreme fibre c,
      biaxial stress &ge; |vertical bending stress| = Ec|&kappa;|, hence |&kappa;| &le; K; (5) maximising under &int;&kappa; = 0 gives
      &kappa; = +K on [0, L/2], &minus;K on [L/2, L], i.e. KL&sup2;/4. Uncertain or failed evaluations are shown as unresolved zones and never count as &laquo; not admissible &raquo;.
      The largest admissible h<sub>v</sub> found is not a demonstrated maximum. Limits: 600 solves or 25 s; beyond, the search is
      reported as incomplete.
    </p>
    <h3 className="text-base font-semibold mt-4">9.10 Restrained axial mode (Fixed L and Find h)</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      &laquo; Axial end separation fixed; initially straight pipe, no prestress &raquo;: u(0) = u(L) = 0, clamped rotations, no friction,
      supports and ground vertical only; L stays the longitudinal reference distance (not the inclined chord). Euler&ndash;Bernoulli with a
      von K&aacute;rm&aacute;n strain &epsilon; = u&prime; + &frac12;(z&prime;&sup2; + y&prime;&sup2;): small strains, moderate rotations, not an exact
      large-rotation kinematics. The constant tension is N = EA/(2L)&int;(z&prime;&sup2; + y&prime;&sup2;)dx &ge; 0 and both planes are coupled through
      it (EI z&Prime;&Prime; &minus; N z&Prime; = &minus;q, EI y&Prime;&Prime; &minus; N y&Prime; = 0): changing h<sub>l</sub> can change the vertical contacts.
      Method: Hermite beam elements with the exactly integrated geometric matrix; for a given N the problem is linear with unilateral
      contacts (active set, no penalty); the reduced energy is convex and its dual in N gives a monotone compatibility equation, solved by
      safeguarded regula falsi, so deflection, contacts and N are solved together. Mesh doubled until two successive comparisons agree.
      Verdict: combined normal stress max(|N/A &plusmn; c/I&middot;hypot(M<sub>v</sub>, M<sub>l</sub>)|) &le; &sigma;<sub>allow</sub>; the bending-only criterion is
      shown for information. Not a code check nor a von Mises stress (no pressure, no shear). N/(EA) and the maximum transverse slope are
      shown as domain indicators without a universal threshold. Find L and Min. supports are not available in this mode.
    </p>
    <h3 className="text-base font-semibold mt-4">9.11 Find h with axial restraint</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      L, h<sub>l</sub>, section, material, q, installed supports and (optionally) the ground level are fixed; h<sub>v</sub> is searched.
      Every sampled h<sub>v</sub> is solved by the complete restrained solver: N and the contacts are recomputed, never reused from another height.
      Necessary domain: compatibility gives N/A = E/(2L)&int;(z&prime;&sup2; + y&prime;&sup2;)dx and, by Cauchy&ndash;Schwarz with &int;z&prime; = h<sub>v</sub>
      and &int;y&prime; = h<sub>l</sub>, N/A &ge; E(h<sub>v</sub>&sup2; + h<sub>l</sub>&sup2;)/(2L&sup2;). The combined stress is at least N/A, so
      h<sub>v</sub>&sup2; + h<sub>l</sub>&sup2; &le; 2L&sup2;&sigma;<sub>allow</sub>/E: a necessary condition, not a bending check. The domain is
      [&minus;H<sub>ax</sub>, H<sub>ax</sub>] with H<sub>ax</sub> = &radic;(2L&sup2;&sigma;<sub>allow</sub>/E &minus; h<sub>l</sub>&sup2;), intersected with h<sub>v</sub> &ge; ground level.
      If h<sub>l</sub> alone violates it, no h<sub>v</sub> can be admissible (demonstrated for that reason only); within rounding the case is reported as undecidable.
      The free-mode curvature bound H<sub>cap</sub> is not reused. Sampling and classification follow 9.7: a height is admissible only if the solve is
      converged, the combined criterion is met and the verdict is not uncertain (bending-only compliance never suffices). Ranges are estimated,
      coverage is not certified and the largest height found is not a demonstrated maximum. The initially represented h<sub>v</sub> is
      re-solved once more. One budget covers the whole search, final check included: 500 solves or 25 s; beyond, the search is incomplete.
    </p>
  </section>
);

export default HelpCalcModes;
