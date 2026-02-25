// src/pages/help/HelpLoading.tsx

import FormulaBlock from "./FormulaBlock";

const HelpLoading = () => (
  <section id="loading" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">5. Loading</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The primary load is the <strong>self-weight</strong> of the pipe, applied as a uniformly distributed load (UDL)
      along the entire span. This load can be toggled on/off by the user.
    </p>

    <FormulaBlock label="Distributed load (self-weight)">
      q = ρ · g · A &nbsp; [N/mm]
    </FormulaBlock>

    <p className="text-sm text-muted-foreground leading-relaxed">
      Where g = 9.81 m/s² is the gravitational acceleration, ρ is the steel density in kg/m³, and A is the
      cross-sectional area in m². The result is converted to N/mm for the FEM solver.
    </p>

    <p className="text-sm text-muted-foreground leading-relaxed">
      The consistent load vector for a beam element of length L<sub>e</sub> under UDL q is:
    </p>

    <FormulaBlock label="Element load vector">
      f<sub>e</sub> = [ qL/2, &nbsp; qL²/12, &nbsp; qL/2, &nbsp; −qL²/12 ]
    </FormulaBlock>
  </section>
);

export default HelpLoading;
