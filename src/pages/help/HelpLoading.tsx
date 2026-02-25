// src/pages/help/HelpLoading.tsx

import FormulaBlock from "./FormulaBlock";

const HelpLoading = () => (
  <section id="loading" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">5. Loading</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The primary load is the <strong>self-weight</strong> of the pipe, applied as a uniformly distributed load (UDL)
      along the entire span. This load can be toggled on/off by the user.
    </p>

    <FormulaBlock tex="q = \rho \cdot g \cdot A \quad [\text{N/mm}]" label="Distributed load (self-weight)" />

    <p className="text-sm text-muted-foreground leading-relaxed">
      Where g = 9.81 m/s² is the gravitational acceleration, ρ is the steel density in kg/m³, and A is the
      cross-sectional area in m². The result is converted to N/mm for the FEM solver.
    </p>

    <p className="text-sm text-muted-foreground leading-relaxed">
      The consistent load vector for a beam element of length L<sub>e</sub> under UDL q is:
    </p>

    <FormulaBlock
      tex="\mathbf{f}_e = \begin{bmatrix} \dfrac{qL}{2} \\[6pt] \dfrac{qL^2}{12} \\[6pt] \dfrac{qL}{2} \\[6pt] -\dfrac{qL^2}{12} \end{bmatrix}"
      label="Element load vector"
    />
  </section>
);

export default HelpLoading;
