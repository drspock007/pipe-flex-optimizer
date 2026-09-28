import FormulaBlock from "./FormulaBlock";
import { Advanced, Bullets, HelpSection, Note, P, ScrollTable, Subsection, Td, Th } from "./HelpPrimitives";

const HelpPipeLowering = () => (
  <div className="space-y-6">
    <div id="pipe-lowering" className="scroll-mt-6 border-l-4 border-primary pl-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Model guide</p>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pipe Lowering</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Fixed-end biaxial beam analysis with optional vertical supports, ground contact and axial end restraint.</p>
    </div>

    <HelpSection id="lowering-inputs" eyebrow="Pipe Lowering" title="Geometry, properties and sign conventions">
      <P>The reference coordinate runs from the left clamp at <strong>x = 0</strong> to the right clamp at <strong>x = L</strong>. Vertical elevation <strong>z</strong> is positive upward, lateral offset is <strong>y</strong>, and distributed weight <strong>q</strong> acts downward. Both end rotations are fixed; the right end is imposed at vertical offset <strong>hv</strong> and lateral offset <strong>hl</strong>.</P>
      <ScrollTable>
        <thead><tr><Th>Input family</Th><Th>Meaning</Th><Th>Important convention</Th></tr></thead>
        <tbody>
          <tr><Td>Pipe and coating</Td><Td>Outside diameter, analysis wall thickness and coating properties</Td><Td>The coating contributes weight and outside radius; it does not add steel stiffness</Td></tr>
          <tr><Td>Material</Td><Td>Young’s modulus, density, grade or custom yield and allowable percentage</Td><Td>The displayed allowable is a user-selected model threshold, not a code check</Td></tr>
          <tr><Td>Geometry</Td><Td>L, signed hv and signed hl</Td><Td>L is the longitudinal reference distance, not the inclined chord</Td></tr>
          <tr><Td>Supports</Td><Td>0–20 equally spaced installed supports</Td><Td>Installed does not mean active: unilateral supports may lift off</Td></tr>
          <tr><Td>Ground</Td><Td>Minimum pipe-axis elevation</Td><Td>Enter physical ground elevation plus outside coated radius; the solver does not add the radius again</Td></tr>
        </tbody>
      </ScrollTable>
      <Advanced title="Cross-section and weight equations">
        <FormulaBlock tex={String.raw`D_i=D_o-2t,\quad A=\frac{\pi}{4}(D_o^2-D_i^2),\quad I=\frac{\pi}{64}(D_o^4-D_i^4),\quad c=\frac{D_o}{2}`} label="Uniform hollow circular steel section" />
        <P>Internally, mechanics-v2 uses millimetres, newtons and MPa. The application bridge converts displayed length and modulus units before solving.</P>
      </Advanced>
    </HelpSection>

    <HelpSection id="lowering-mechanics" eyebrow="Pipe Lowering" title="Free sliding and restrained ends are different models">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4"><h3 className="font-semibold">Free sliding</h3><P>The beam is linear in both bending planes and carries no axial force. Vertical contact does not restrain lateral or axial motion. The governing stress is the biaxial extreme-fibre bending stress evaluated at the same position.</P></div>
        <div className="rounded-lg border p-4"><h3 className="font-semibold">Restrained</h3><P>The initially straight, unprestressed pipe has fixed axial end separation. Moderate rotation creates tension that couples vertical deflection, lateral deflection and contact. The governing criterion combines N/A with biaxial bending; a free solution is never substituted.</P></div>
      </div>
      <Advanced title="Restrained compatibility and stress criterion">
        <FormulaBlock tex={String.raw`N=\frac{EA}{2L}\int_0^L\left(z'^2+y'^2\right)\,dx`} label="Coupled axial tension for the Pipe Lowering restrained model" />
        <FormulaBlock tex={String.raw`\sigma_{\max}=\max_x\left(\frac{N}{A}+\frac{c}{I}\sqrt{M_v(x)^2+M_l(x)^2}\right)\leq\sigma_{allow}`} label="Governing combined normal-stress criterion" />
        <P>This is a small-strain, moderate-rotation von Kármán model—not exact large-rotation kinematics, a pressure model or a Von Mises code assessment.</P>
      </Advanced>
      <Note title="Strict criterion">The model compares stress with the selected allowable without a hidden buffer. Numerical uncertainty is classified before a met/not-met verdict.</Note>
    </HelpSection>

    <HelpSection id="lowering-contact" eyebrow="Pipe Lowering" title="Supports and ground contact">
      <Subsection title="Installed supports"><P>Supports are equally spaced vertical obstacles along the straight end-to-end support line. They carry upward reaction only, allow lift-off and provide no lateral, rotational or axial restraint. Results distinguish installed supports from the subset actually in contact.</P></Subsection>
      <Subsection title="Optional ground"><P>The ground is rigid, horizontal and frictionless over the full length. The solver enforces non-penetration in the vertical plane and reports ground, combined support/ground and clamp reactions separately. Contact zones shown in charts are graphical estimates; reported ground reactions are nodal forces, not pressures.</P></Subsection>
      <Note title="Exactly flat analytical branch">When—and only when—<strong>hv = hl = ground level = 0 exactly</strong>, the analytical solution has zero deformation, stress and axial force, with distributed ground reaction <strong>p = q</strong>. It uses no mesh and makes no mesh-convergence claim. Nearby non-flat cases still use their normal solution paths.</Note>
      <Advanced title="Contact and refinement methods">
        <Bullets>
          <li>Unilateral contact is solved with an active set and no penalty stiffness.</li>
          <li>Free, fixed-L ground cases first try the fast path. The exact no-ground solution is accepted only when exact member minima clear the ground by more than the penetration tolerance.</li>
          <li>Otherwise the mesh is refined; stress, reactions, displacements and exact between-node member minima participate in acceptance.</li>
          <li>Two consecutive precision-loss refinement levels stop the calculation. Non-representable derived output is a numerical failure, not a fallback mesh result.</li>
        </Bullets>
      </Advanced>
    </HelpSection>

    <HelpSection id="lowering-modes" eyebrow="Pipe Lowering" title="Calculation modes">
      <ScrollTable>
        <thead><tr><Th>Mode</Th><Th>What remains fixed</Th><Th>What is reported</Th></tr></thead>
        <tbody>
          <tr><Td>Fixed L</Td><Td>Entered L, hv, hl and installed supports</Td><Td>One full solution, including a valid result even when its stress criterion is not met</Td></tr>
          <tr><Td>Find h</Td><Td>L, hl, section, load and installed supports</Td><Td>Estimated signed hv ranges and a separately solved represented height</Td></tr>
          <tr><Td>Find L range</Td><Td>hv, hl, section, load and installed supports</Td><Td>Admissible length ranges; ground or restrained searches use an explicit exploratory domain</Td></tr>
          <tr><Td>Min. supports</Td><Td>Geometry, properties and search settings</Td><Td>Counts examined in order under one global budget, plus a final verification of the first candidate</Td></tr>
        </tbody>
      </ScrollTable>
      <P>All four modes support free or restrained axial behavior, with or without ground. The represented value controls the detailed plots and tables but does not rewrite the original input or prove that a search range is complete.</P>
      <Note title="Minimum-support wording" tone="warning">A verified zero-support candidate is minimal because no lower count exists. For any candidate above zero, earlier counts were explored but not mathematically excluded; the application reports the smallest verified count found, not a certified minimum.</Note>
      <Advanced title="Necessary search bounds Hcap, Hax and Lax">
        <Bullets>
          <li><strong>Hcap</strong> bounds free-mode Find h from the allowable curvature and clamped end slopes.</li>
          <li><strong>Hax</strong> bounds restrained Find h from axial compatibility and the combined-stress threshold.</li>
          <li><strong>Lax</strong> is the corresponding necessary lower length for restrained Find L.</li>
          <li>These are necessary exclusions only. They do not prove admissibility, replace a full solve or define universal mechanical limits.</li>
        </Bullets>
      </Advanced>
    </HelpSection>

    <HelpSection id="lowering-numerics" eyebrow="Pipe Lowering" title="Numerical evidence and limitations">
      <P>Free searches without ground retain their analytical regime paths. Ground and restrained searches share exploratory samplers and classifiers; Find L samples logarithmic length. Failed, uncertain and budget-limited regions remain unresolved.</P>
      <Bullets>
        <li>Mesh refinement and equilibrium/contact checks establish numerical acceptance only.</li>
        <li>Search budgets cover sampling and final verification; partial coverage remains visible when a budget ends.</li>
        <li>For restrained analyses, axial strain and transverse slope are indicators, not automatic physical certification thresholds.</li>
        <li>Pressure, temperature, plasticity, ovalization, local buckling, welds, defects, fatigue, dynamics and soil capacity are outside this model.</li>
        <li>Complex routing, bends, tees and local support/contact stresses require separate engineering analysis.</li>
      </Bullets>
    </HelpSection>
  </div>
);

export default HelpPipeLowering;
