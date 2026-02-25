// src/pages/help/HelpSectionProperties.tsx

import FormulaBlock from "./FormulaBlock";

const HelpSectionProperties = () => (
  <section id="section-properties" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">3. Cross-Section Properties</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The pipe is modeled as a hollow circular cross-section. All section properties are computed from the outer
      diameter D₀ and wall thickness t.
    </p>

    <FormulaBlock label="Inner diameter">
      D<sub>i</sub> = D₀ − 2·t
    </FormulaBlock>

    <FormulaBlock label="Cross-sectional area">
      A = (π / 4) · (D₀² − D<sub>i</sub>²)
    </FormulaBlock>

    <FormulaBlock label="Second moment of area (moment of inertia)">
      I = (π / 64) · (D₀⁴ − D<sub>i</sub>⁴)
    </FormulaBlock>

    <FormulaBlock label="Distance from neutral axis to extreme fiber">
      c = D₀ / 2
    </FormulaBlock>

    <FormulaBlock label="Linear weight">
      w<sub>lin</sub> = ρ · A · 10⁻⁶ &nbsp; [kg/m]
    </FormulaBlock>

    <p className="text-sm text-muted-foreground leading-relaxed">
      All internal calculations use <strong>mm-based units</strong> (mm, N, MPa) for numerical consistency.
    </p>
  </section>
);

export default HelpSectionProperties;
