// src/pages/help/HelpFEM.tsx

import FormulaBlock from "./FormulaBlock";

const HelpFEM = () => (
  <section id="fem" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">8. Finite Element Method</h2>

    <h3 className="text-base font-semibold mt-4">Element formulation</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Each beam element uses the standard <strong>Hermite cubic shape functions</strong> with 2 nodes and 2 DOFs per
      node (transverse displacement w and rotation θ), yielding a 4×4 element stiffness matrix.
    </p>

    <FormulaBlock label="Element stiffness matrix (Euler-Bernoulli)">
      <div className="text-xs leading-relaxed">
        <span className="font-semibold">k<sub>e</sub></span> = (EI / L<sub>e</sub>³) ×
        <br />
        <span className="inline-block mt-1">
          [ 12, &nbsp; 6L<sub>e</sub>, &nbsp; −12, &nbsp; 6L<sub>e</sub> ]
        </span>
        <br />
        <span className="inline-block">
          [ 6L<sub>e</sub>, &nbsp; 4L<sub>e</sub>², &nbsp; −6L<sub>e</sub>, &nbsp; 2L<sub>e</sub>² ]
        </span>
        <br />
        <span className="inline-block">
          [ −12, &nbsp; −6L<sub>e</sub>, &nbsp; 12, &nbsp; −6L<sub>e</sub> ]
        </span>
        <br />
        <span className="inline-block">
          [ 6L<sub>e</sub>, &nbsp; 2L<sub>e</sub>², &nbsp; −6L<sub>e</sub>, &nbsp; 4L<sub>e</sub>² ]
        </span>
      </div>
    </FormulaBlock>

    <h3 className="text-base font-semibold mt-4">Assembly and solver</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The global stiffness matrix is assembled in <strong>banded storage</strong> (half-bandwidth = 3) to minimize
      memory and computation. The system is solved using an <strong>LDLT factorization</strong> (Cholesky-like
      decomposition for symmetric positive-definite matrices), operating directly on the banded representation.
    </p>

    <h3 className="text-base font-semibold mt-4">Boundary conditions</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Boundary conditions are applied by <strong>direct elimination</strong> (row/column zeroing with diagonal set to
      1). Imposed displacements (settlement, supports) are handled by modifying the right-hand side accordingly.
    </p>

    <h3 className="text-base font-semibold mt-4">Mesh</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The mesh is built with support positions as anchors, subdividing each span into equal elements (default: 8 per
      span). The adaptive mode tests 8, 16, and 20 elements/span and accepts the coarsest mesh where moment
      convergence error is below 1%. Total DOFs are capped at 1000.
    </p>

    <h3 className="text-base font-semibold mt-4">Post-processing</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Bending moment M(x) is computed from the second derivative of the shape functions. The bending stress at each
      sample point is:
    </p>

    <FormulaBlock label="Bending stress">
      σ(x) = |M(x)| · c / I
    </FormulaBlock>
  </section>
);

export default HelpFEM;
