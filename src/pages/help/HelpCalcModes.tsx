// src/pages/help/HelpCalcModes.tsx

const HelpCalcModes = () => (
  <section id="calc-modes" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">9. Calculation Modes</h2>

    <h3 className="text-base font-semibold mt-4">9.1 Standard mode</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Given a fixed span length L and settlement h, the solver <strong>automatically increments the number of
      intermediate supports</strong> (from 0 to 20) until the maximum stress is within the allowable limit. It uses
      the unilateral active-set algorithm at each step. If increasing supports no longer reduces stress (stress
      increases by more than 5%), the search stops early.
    </p>

    <h3 className="text-base font-semibold mt-4">9.2 Find L mode</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Given a fixed settlement h, the solver searches for the <strong>admissible span length window [L<sub>min</sub>,
      L<sub>max</sub>]</strong> where the pipe remains safe. The algorithm:
    </p>
    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
      <li>Scans a coarse grid of L values (1–1000 m) for each support count (0–20).</li>
      <li>Identifies contiguous safe zones on the grid.</li>
      <li>Refines L<sub>min</sub> and L<sub>max</sub> by bisection (25 iterations, ≤10 mm precision).</li>
      <li>
        Finds <strong>L<sub>opt</sub></strong> (the span length with minimum stress inside the window) using a{" "}
        <strong>golden-section search</strong> (10 iterations).
      </li>
    </ol>
    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
      The user can display results at L<sub>min</sub>, L<sub>mid</sub> (midpoint), L<sub>opt</sub>, or L<sub>max</sub>.
    </p>

    <h3 className="text-base font-semibold mt-4">9.3 Find H mode</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Given a fixed span length L, the solver searches for the <strong>maximum tolerable differential
      settlement</strong>. The algorithm:
    </p>
    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
      <li>Verifies that h = 0 is safe (otherwise no solution exists).</li>
      <li>Doubles h until it becomes unsafe, establishing an upper bound.</li>
      <li>Refines by bisection (20 iterations, ≤0.1 mm precision).</li>
    </ol>
    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
      At each h value tested, the solver runs the full autoSupports routine to find the minimum number of supports.
    </p>
  </section>
);

export default HelpCalcModes;
