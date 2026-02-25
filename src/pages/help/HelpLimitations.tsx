// src/pages/help/HelpLimitations.tsx

const HelpLimitations = () => (
  <section id="limitations" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">12. Limitations &amp; Assumptions</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      This tool is intended for <strong>preliminary engineering estimates</strong>. The following limitations apply:
    </p>

    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
      <li>
        <strong>Linear elastic</strong>: no plasticity, no material nonlinearity. The analysis is only valid if
        stresses remain below the yield point.
      </li>
      <li>
        <strong>Small deformations</strong>: the solver assumes small displacements and rotations. For large
        deflections (e.g., w/L &gt; 1/20), a geometrically nonlinear analysis would be needed.
      </li>
      <li>
        <strong>No buckling check</strong>: local buckling, ovalization, or lateral-torsional buckling are not
        assessed.
      </li>
      <li>
        <strong>No axial force</strong>: thermal expansion, internal pressure end-cap force, and other axial loads
        are not modeled.
      </li>
      <li>
        <strong>No dynamic effects</strong>: wind, seismic, or impact loads are not considered.
      </li>
      <li>
        <strong>Equally spaced supports only</strong>: support optimization is limited to equal spacing. Unequal
        spacing or optimized placement is not currently supported.
      </li>
      <li>
        <strong>Single span geometry</strong>: the model considers a single straight pipe segment. Bends, tees,
        and complex routing are not modeled.
      </li>
      <li>
        <strong>No corrosion allowance</strong>: the wall thickness used is the nominal thickness. Users should
        account for corrosion separately.
      </li>
      <li>
        <strong>Max 20 supports, max 1000 DOFs</strong>: computational guardrails limit the mesh size for
        browser-based performance.
      </li>
    </ul>

    <p className="text-sm text-muted-foreground leading-relaxed mt-3">
      For detailed stress analysis of complex piping systems, a full 3D piping stress analysis (e.g., per ASME B31.4
      / B31.8) using dedicated software (Caesar II, AutoPIPE, etc.) is recommended.
    </p>
  </section>
);

export default HelpLimitations;
