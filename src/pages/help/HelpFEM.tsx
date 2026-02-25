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

    <FormulaBlock
      tex={String.raw`\mathbf{k}_e = \frac{EI}{L_e^3} \begin{bmatrix} 12 & 6L_e & -12 & 6L_e \\ 6L_e & 4L_e^2 & -6L_e & 2L_e^2 \\ -12 & -6L_e & 12 & -6L_e \\ 6L_e & 2L_e^2 & -6L_e & 4L_e^2 \end{bmatrix}`}
      label="Element stiffness matrix (Euler-Bernoulli)"
    />

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

    <FormulaBlock tex="\sigma(x) = \frac{|M(x)| \cdot c}{I}" label="Bending stress" />
  </section>
);

export default HelpFEM;
