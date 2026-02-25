// src/pages/help/HelpValidation.tsx

import FormulaBlock from "./FormulaBlock";

const HelpValidation = () => (
  <section id="validation" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">11. Validation</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The FEM solver is validated against <strong>analytical solutions</strong> for two canonical cases. These checks
      run automatically and are reported in the Debug panel.
    </p>

    <h3 className="text-base font-semibold mt-4">11.1 Self-weight only (no settlement, no supports)</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      For a fixed-fixed beam under UDL q, the maximum end moment is:
    </p>
    <FormulaBlock label="Analytical end moment (fixed-fixed, UDL)">
      M<sub>end</sub> = q · L² / 12
    </FormulaBlock>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The FEM result is compared to this value. An error greater than 5% triggers a validation warning.
    </p>

    <h3 className="text-base font-semibold mt-4">11.2 Settlement only (no self-weight)</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      For a fixed-fixed beam with imposed settlement h and no distributed load:
    </p>
    <FormulaBlock label="Analytical settlement moment">
      M<sub>settlement</sub> = 6 · E · I · |h| / L²
    </FormulaBlock>
    <p className="text-sm text-muted-foreground leading-relaxed">
      A separate FEM solve with q = 0 is performed and compared. An error greater than 5% triggers a warning.
    </p>

    <h3 className="text-base font-semibold mt-4">11.3 Per-span check (with supports)</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      When intermediate supports are present, the solver also checks the combined analytical estimate per span:
    </p>
    <FormulaBlock label="Per-span theory">
      M<sub>span</sub> ≈ q·L<sub>s</sub>²/12 + 6·E·I·h<sub>s</sub>/L<sub>s</sub>²
    </FormulaBlock>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Where L<sub>s</sub> = L / (N+1) is the span length and h<sub>s</sub> = |h| / (N+1) is the per-span settlement.
    </p>
  </section>
);

export default HelpValidation;
