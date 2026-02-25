// src/pages/help/HelpSectionProperties.tsx

import FormulaBlock from "./FormulaBlock";

const HelpSectionProperties = () => (
  <section id="section-properties" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">3. Cross-Section Properties</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The pipe is modeled as a hollow circular cross-section. All section properties are computed from the outer
      diameter D₀ and wall thickness t.
    </p>

    <FormulaBlock tex="D_i = D_0 - 2t" label="Inner diameter" />
    <FormulaBlock tex="A = \frac{\pi}{4} \left( D_0^2 - D_i^2 \right)" label="Cross-sectional area" />
    <FormulaBlock tex="I = \frac{\pi}{64} \left( D_0^4 - D_i^4 \right)" label="Second moment of area (moment of inertia)" />
    <FormulaBlock tex="c = \frac{D_0}{2}" label="Distance from neutral axis to extreme fiber" />
    <FormulaBlock tex="w_{\text{lin}} = \rho \cdot A \times 10^{-6} \quad [\text{kg/m}]" label="Linear weight" />

    <p className="text-sm text-muted-foreground leading-relaxed">
      All internal calculations use <strong>mm-based units</strong> (mm, N, MPa) for numerical consistency.
    </p>
  </section>
);

export default HelpSectionProperties;
