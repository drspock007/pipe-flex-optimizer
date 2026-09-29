import FormulaBlock from "./FormulaBlock";
import { Advanced, Bullets, HelpSection, Note, P, ScrollTable, Subsection, Td, Th } from "./HelpPrimitives";

const HelpInService = () => (
  <div className="space-y-6">
    <div id="in-service" className="scroll-mt-6 border-l-4 border-primary pl-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Model guide</p>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">In-service Deflection</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Elastic movement of a uniform pressurized steel pipe in a symmetric excavation. Choose temporary return or a separate maintained-deviation sequence with backfill.</p>
    </div>

    <HelpSection id="service-scope" eyebrow="In-service Deflection" title="Operation and input model">
      <P>This module is independent from Pipe Lowering. It represents a straight, uniform, elastic steel pipe with ideal clamps at both buried ends. The full excavated length is twice the entered half-length. Pressure and temperature remain constant during construction; permanent mode adds explicit future operating cases.</P>
      <ScrollTable>
        <thead><tr><Th>Input group</Th><Th>What the model uses</Th></tr></thead>
        <tbody>
          <tr><Td>Pipe and steel</Td><Td>Outside diameter, uniform analysis thickness, E, Poisson ratio, thermal expansion and yield at operating temperature</Td></tr>
          <tr><Td>Operating conditions</Td><Td>Internal gauge pressure, operating temperature and steel/fluid/coating weight</Td></tr>
          <tr><Td>Fluid</Td><Td>Known custom density or gas density from absolute pressure, temperature, molar mass and user-supplied compressibility Z</Td></tr>
          <tr><Td>Intervention</Td><Td>Half-length, vertical/horizontal/combined direction, signed angle and displacement amplitude measured from the original straight axis</Td></tr>
          <tr><Td>Initial states</Td><Td>One to twelve named hypotheses, each with reference temperature and additional wall force</Td></tr>
          <tr><Td>Criterion</Td><Td>Editable percentage of yield; default values are conveniences, not normative limits</Td></tr>
        </tbody>
      </ScrollTable>
      <Advanced title="Fluid density and coating conventions">
        <FormulaBlock tex={String.raw`\rho=\frac{(p_{gauge}+p_{atm})10^6(M/1000)}{Z\,R\,(T_C+273.15)}`} label="Selected-gas density at operating conditions" />
        <P>Z = 1 is an ideal-gas assumption, not an automatic real-gas equation of state. The natural-gas initial molar mass is a methane approximation; use known mixture properties or custom density when unsuitable. Coating adds dead weight but no structural stiffness.</P>
      </Advanced>
    </HelpSection>

    <HelpSection id="service-permanent" eyebrow="Permanent maintained deviation" title="Elastic construction and backfill sequence">
      <P>Select Permanent maintained deviation for a separate direct calculation. The initial pipe remains the steel reference configuration: neither support adjustment nor backfill erases stress.</P>
      <P>Quick setup pre-fills editable examples and offers uniform, successive-half or ends-first backfill layouts. Open a zone for its values and soil-response examples. Infobubbles explain units, signs, examples and limitations. Fill empty fields preserves existing entries; deliberate blanks stay blank until that action is used.</P>
      <P>Flexible/intermediate/stiff soil examples are sensitivity cases, not material classifications. Stress and position verdicts remain not evaluated until starting values have been checked against project information. New operating cases initially copy construction conditions. Identity and applicability confirmations still require your input.</P>
      <Bullets>
        <li>Keep initial supports at their original height, or unload them under equipment control before moving the pipe. Loaded supports must be unloaded before reuse.</li>
        <li>Install symmetric vertical pairs at the calculated shape, without added preload, or enter common absolute heights for all scenarios. Common heights can create a calculated preload.</li>
        <li>Release equipment before or after backfill. Vertical supports allow lateral rebound and do not lock the imposed position.</li>
        <li>Enter documented axial, lateral, downward and uplift soil curves and separate backfill/construction loads. Zones activate in explicit stages; temporary pairs are lowered and removed in the specified order.</li>
        <li>Each future pressure/temperature case starts from the final loaded state. Enter its fluid density and confirm material properties at all temperatures.</li>
      </Bullets>
      <P>Stress, final centre position and soil resistance limits have separate results. Position tolerances apply in controlled directions, including computed operating transitions. Convergence failures, missing data or soil limits prevent verified retention. Scenario-fitted support heights do not validate one common physical setting.</P>
      <Note title="What numerical verification does not establish" tone="warning">Independent matrix/solver comparisons cover synthetic construction histories. They do not validate site soil data, adjacent-pipe fixity, fatigue, welds, defects, local buckling, ovalization or equipment capacity. Reversible soil laws do not model permanent soil slip, consolidation or cyclic accumulation. CSA checks remain partial and separate.</Note>
    </HelpSection>

    <HelpSection id="service-axial" eyebrow="In-service Deflection" title="Wall force and effective tension must remain separate">
      <P>Pressure, temperature and additional wall force define the initial wall force. Subtracting the pressure-area term gives effective tension, which controls beam geometric stiffness. Unlike the Pipe Lowering restrained model, the initial effective force may be tensile or compressive.</P>
      <Advanced title="Initial force and compatibility equations">
        <FormulaBlock tex={String.raw`N_{wall,0}=2\nu pA_i-EA\alpha(T-T_{ref})+N_{extra},\qquad N_0=N_{wall,0}-pA_i`} label="Initial wall force and effective tension (tension positive)" />
        <FormulaBlock tex={String.raw`N=N_0+\frac{EA}{2D}\int_0^D\left(z'^2+y'^2\right)\,dx,\qquad N_{wall}=N+pA_i`} label="Effective and wall force during the intervention" />
        <P>The additional axial input excludes the pressure and thermal terms already modeled. A value of zero is still an explicit hypothesis; it does not make the initial state known.</P>
      </Advanced>
      <Note title="Initial compression screen" tone="warning">Before soil support is released, the model requires the initial effective force to remain above its guarded fixed-fixed Euler compression limit. Otherwise it reports instability risk and stops; prescribed midpoint motion and temporary supports are not used to claim stabilization or post-buckling behavior.</Note>
    </HelpSection>

    <HelpSection id="service-path" eyebrow="In-service Deflection" title="Intervention path and temporary supports">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
        <li>Initially, soil support balances the pipe weight.</li>
        <li>Weight is transferred uniformly to the pipe and installed temporary supports until the excavated state is reached.</li>
        <li>The central actuator engages at the excavated midpoint and ramps controlled components to the target measured from the original axis.</li>
        <li>The elastic, frictionless return retraces the sampled actuation path to the excavated state.</li>
        <li>Uniform support restoration returns the model to its initial straight state.</li>
      </ol>
      <Subsection title="Temporary support layouts"><P>Choose none, equidistant pairs from 2 to 20, or 1 to 20 custom positions. Each fixed obstacle acts upward at the original pipe-axis level, permits lift-off and free horizontal/axial sliding, and does not restrain rotation. Custom positions are stored as fractions of total length and scale during length searches. The actuator position is reserved.</P></Subsection>
      <Note title="Support reactions are design loads—not approvals">Reported peaks, gaps and contact states do not check support capacity, local bearing, settlement, sling behavior, impact or the width needed to accommodate lateral motion.</Note>
      <Advanced title="Contact event resolution"><P>Support nodes are inserted exactly into the nonuniform Hermite mesh. An active set removes tensile constraints and admits penetrated obstacles. Observed contact-state changes are locally refined; an unresolved event prevents a pass, but the method does not prove that no unsampled event exists.</P></Advanced>
    </HelpSection>

    <HelpSection id="service-modes" eyebrow="In-service Deflection" title="Calculation and exploratory search modes">
      <ScrollTable>
        <thead><tr><Th>Mode</Th><Th>Purpose</Th><Th>Search interpretation</Th></tr></thead>
        <tbody>
          <tr><Td>Direct calculation</Td><Td>Evaluate the entered half-length, movement and support layout</Td><Td>All initial-state scenarios follow the complete intervention path</Td></tr>
          <tr><Td>Find length</Td><Td>Explore half-lengths within entered bounds</Td><Td>Logarithmic samples and observed transitions; candidate is rechecked</Td></tr>
          <tr><Td>Find displacement</Td><Td>Explore amplitudes up to the entered upper bound</Td><Td>Linear samples and observed transitions; upper bound reached is not a mechanical maximum</Td></tr>
          <tr><Td>Find support count</Td><Td>Test 0, 2, 4… up to the selected ceiling</Td><Td>One global budget; first passing count is recomputed for every scenario</Td></tr>
        </tbody>
      </ScrollTable>
      <P>A candidate passes only when every initial-state hypothesis produces a completed, decidable path below the custom threshold. Failed, uncertain, out-of-domain and budget-limited samples stay unresolved. Searches do not claim monotonicity or a global optimum.</P>
    </HelpSection>

    <HelpSection id="service-stress" eyebrow="In-service Deflection" title="Stress bound, domain screens and refinement">
      <P>The reported criterion is a conservative <strong>Von Mises beam bound</strong>. It combines the section maximum of pressure, wall-force and bending normal stress with a conservative transverse beam-shear bound. The normal and shear maxima may occur at different positions within an element.</P>
      <FormulaBlock tex={String.raw`\sigma_{VM,bound}=\sqrt{\max_r\!\left(\sigma_{normal}(r)^2+3\tau_{pressure}(r)^2\right)+3\tau_{beam,bound}^2}`} label="Conservative elastic beam bound (conceptual form)" />
      <Bullets>
        <li>The strict custom threshold is applied only after numerical uncertainty is considered.</li>
        <li>Yield exceedance stops the elastic path; the module does not calculate plastic redistribution.</li>
        <li>Model-domain screens require full length / outside diameter ≥ 10 and maximum resultant slope ≤ 0.1.</li>
        <li>These scope screens are not code acceptance limits.</li>
      </Bullets>
      <Advanced title="Mesh and path refinement evidence"><P>The full span and intervention path are refined together through the documented element and increment levels. Acceptance requires two successive changes within the relative tolerance for maximum stress, maximum actuator force and excavated displacement, with absolute floors. Contact envelopes and event resolution are included when supports are present. The final stress change contributes to the reported uncertainty; convergence is not a guaranteed physical-error bound.</P></Advanced>
    </HelpSection>

    <HelpSection id="service-results" eyebrow="In-service Deflection" title="Results, presets and reporting">
      <Bullets>
        <li>Scenario comparison identifies the governing hypothesis and status.</li>
        <li>Detailed results show excavated and target profiles, governing phase, actuator forces, end reactions and moments, wall/effective force, critical element and separate normal/shear locations.</li>
        <li>With supports, select any sampled intervention stage to inspect its profile, reaction, gap and contact state; peak support and transverse loads remain available separately.</li>
        <li>Diagnostics expose refinement history, stress uncertainty, slope and axial residual rather than hiding incomplete paths.</li>
      </Bullets>
      <Subsection title="Presets and JSON transfer"><P>In-service presets form a separate, versioned local library containing the complete input set—not results or reports. They are stored on the current browser/device and site address, are not synchronized automatically, and can be moved with JSON export/import. Unsupported or malformed files are rejected without replacing current inputs. Loading clears obsolete results; review inputs and calculate again.</P></Subsection>
      <Subsection title="PDF snapshot"><P>The report records the completed request, selected displayed support stages and current display units. A unit-only change does not rerun mechanics. Export is unavailable when edited inputs no longer match the completed request.</P></Subsection>
    </HelpSection>

    <HelpSection id="service-limitations" eyebrow="In-service Deflection" title="Explicit exclusions and evidence limits">
      <Bullets>
        <li>Steel only: no HDPE, plastic steel or material aging model.</li>
        <li>No plasticity, post-buckling, torsion, ovalization, local sling/contact stress, defects, weld concentration or fatigue assessment.</li>
        <li>No moving excavation front, support capacity, local bearing or evolving settlement check. The temporary branch excludes surrounding-soil interaction; the permanent branch uses the documented reversible soil laws described above.</li>
        <li>The temporary reverse path assumes elastic, frictionless behavior without impact, hysteresis or construction dynamics.</li>
        <li>Analytical benchmarks and automated regression tests support implementation evidence; no independent commercial FE benchmark or field calibration is claimed.</li>
        <li>Optional CSA Z662:2023 checks assess minimum nominal wall (4.3.11.2) and the anchored pressure/temperature design state (4.7.1), with the temperature factor from 4.3.9. Separate design inputs and scope confirmations are required. They do not assess lifting, bending/stability (4.7.2), or Annex C, and never govern searches. ASME and European checks and overall normative compliance verdicts are not implemented.</li>
      </Bullets>
    </HelpSection>
  </div>
);

export default HelpInService;
