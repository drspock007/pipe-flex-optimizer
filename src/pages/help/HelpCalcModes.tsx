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
    <P>Find h is not available with the V2 engine.</P>
  </section>
);

export default HelpCalcModes;
