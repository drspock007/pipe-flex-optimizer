// src/pages/help/HelpSafetyCriteria.tsx

import FormulaBlock from "./FormulaBlock";

const HelpSafetyCriteria = () => (
  <section id="safety" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">10. Safety Criteria</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The maximum bending stress along the pipe is compared to the allowable stress. The pipe is considered
      <strong> safe</strong> if:
    </p>

    <FormulaBlock
      tex="\sigma_{\max} \leq \sigma_{\text{allow}} + 0.5 \; \text{MPa}"
      label="Safety criterion"
    />

    <p className="text-sm text-muted-foreground leading-relaxed">
      Where:
    </p>
    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
      <li>
        σ<sub>allowable</sub> = SMYS × (allowable %) — e.g., 359 × 80% = 287.2 MPa for X52 at 80%
      </li>
      <li>
        The <strong>+0.5 MPa buffer</strong> is a numerical tolerance to account for FEM discretization error and
        avoid false negatives at the exact boundary.
      </li>
    </ul>

    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
      In <strong>Find L</strong> mode, the pipe must also pass the <strong>contact validation</strong> check
      (no penetration violations at inactive supports) to be considered safe.
    </p>
  </section>
);

export default HelpSafetyCriteria;
