// src/pages/help/HelpSettlement.tsx

import FormulaBlock from "./FormulaBlock";

const HelpSettlement = () => (
  <section id="settlement" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">6. Differential Settlement</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Differential settlement is modeled as a vertical displacement imposed at the right end of the beam while the
      left end remains fixed. The user specifies h in mm (positive = right end higher).
    </p>

    <h3 className="text-base font-semibold mt-4">Reference elevation line</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The reference line (undeflected position considering settlement) is a straight line from the left end (0) to
      the right end (h<sub>fem</sub>):
    </p>

    <FormulaBlock label="Reference elevation at position x">
      w<sub>ref</sub>(x) = h<sub>fem</sub> · x / L
    </FormulaBlock>

    <p className="text-sm text-muted-foreground leading-relaxed">
      This reference line is critical for the <strong>unilateral support model</strong>: intermediate supports
      (hoists) are placed along this line and only activate when the pipe deflects below it.
    </p>

    <h3 className="text-base font-semibold mt-4">Analytical benchmark</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      For a fixed-fixed beam with imposed settlement h and no distributed load, the end moment is:
    </p>

    <FormulaBlock label="Settlement-induced moment (analytical)">
      M<sub>settlement</sub> = 6 · E · I · |h| / L²
    </FormulaBlock>
  </section>
);

export default HelpSettlement;
