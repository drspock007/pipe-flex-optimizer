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
    <FormulaBlock tex="M_{\text{end}} = \frac{q \cdot L^2}{12}" label="Analytical end moment (fixed-fixed, UDL)" />
    <p className="text-sm text-muted-foreground leading-relaxed">
      The FEM result is compared to this value. An error greater than 5% triggers a validation warning.
    </p>

    <h3 className="text-base font-semibold mt-4">11.2 Settlement only (no self-weight)</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      For a fixed-fixed beam with imposed settlement h and no distributed load:
    </p>
    <FormulaBlock tex="M_{\text{settlement}} = \frac{6 \, E \, I \, |h|}{L^2}" label="Analytical settlement moment" />
    <p className="text-sm text-muted-foreground leading-relaxed">
      A separate FEM solve with q = 0 is performed and compared. An error greater than 5% triggers a warning.
    </p>

    <h3 className="text-base font-semibold mt-4">11.3 Per-span check (with supports)</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      When intermediate supports are present, the solver also checks the combined analytical estimate per span:
    </p>
    <FormulaBlock
      tex="M_{\text{span}} \approx \frac{q \, L_s^2}{12} + \frac{6 \, E \, I \, h_s}{L_s^2}"
      label="Per-span theory"
    />
    <p className="text-sm text-muted-foreground leading-relaxed">
      Where L<sub>s</sub> = L / (N+1) is the span length and h<sub>s</sub> = |h| / (N+1) is the per-span settlement.
    </p>
  </section>
);

export default HelpValidation;
