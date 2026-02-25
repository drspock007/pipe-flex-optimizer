// src/pages/help/HelpSupports.tsx

const HelpSupports = () => (
  <section id="supports" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">7. Intermediate Supports (Unilateral Model)</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Intermediate supports represent <strong>hoists or sidebooms</strong> that can only pull the pipe upward (they
      cannot push it downward). This is modeled as a <strong>unilateral contact problem</strong>.
    </p>

    <h3 className="text-base font-semibold mt-4">Support placement</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Candidate supports are placed at <strong>equally spaced positions</strong> along the span. For N supports, the
      spacing is L / (N + 1). Each support enforces the pipe to follow the reference elevation line w<sub>ref</sub>(x).
    </p>

    <h3 className="text-base font-semibold mt-4">Active-set algorithm</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The solver uses an <strong>iterative active-set method</strong> to determine which supports are actually engaged:
    </p>
    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
      <li>
        <strong>Initialize</strong>: start with no active supports (free beam).
      </li>
      <li>
        <strong>Solve FEM</strong>: compute deflections with the current active set.
      </li>
      <li>
        <strong>Check penetration</strong>: if the pipe deflects below the reference line at an inactive support
        (w<sub>fem</sub> &gt; w<sub>ref</sub> + tolerance), activate that support.
      </li>
      <li>
        <strong>Check reactions</strong>: if an active support has a positive reaction (pushing downward, which a
        hoist cannot do), deactivate it.
      </li>
      <li>
        <strong>Iterate</strong> until the active set stabilizes (max 20 iterations).
      </li>
    </ol>

    <h3 className="text-base font-semibold mt-4">Contact validation</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      After convergence, a sanity check verifies that: (a) active supports have w<sub>fem</sub> ≈ w<sub>ref</sub>,
      and (b) inactive supports have w<sub>fem</sub> ≤ w<sub>ref</sub> + tolerance. Violations are reported as
      warnings.
    </p>
  </section>
);

export default HelpSupports;
