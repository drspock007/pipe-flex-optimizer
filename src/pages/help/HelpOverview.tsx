import { Advanced, Bullets, HelpSection, Note, P, ScrollTable, Td, Th } from "./HelpPrimitives";

const HelpOverview = () => (
  <div className="space-y-6">
    <HelpSection id="getting-started" eyebrow="Getting started" title="Choose the model that matches the operation">
      <P>This application contains two independent engineering models. They share pipe catalogues, units and reporting conventions, but they do not share the same mechanics or acceptance criterion. Select the model from the physical operation—not from the result you hope to obtain.</P>
      <ScrollTable>
        <thead><tr><Th>Question</Th><Th>Pipe Lowering</Th><Th>In-service Deflection</Th></tr></thead>
        <tbody>
          <tr><Td>Intended operation</Td><Td>Lowering or differential end offsets of a fixed-end span</Td><Td>Temporary central movement of an operating steel pipe in a symmetric excavation</Td></tr>
          <tr><Td>Loads and axial state</Td><Td>Self-weight; free sliding or initially straight restrained ends; optional ground</Td><Td>Weight, gauge pressure, temperature and additional wall force; effective tension may be tensile or compressive</Td></tr>
          <tr><Td>Supports</Td><Td>Equally spaced vertical unilateral supports; optional rigid horizontal ground</Td><Td>None, equidistant pairs or custom temporary supports; permanent mode adds staged backfill interaction</Td></tr>
          <tr><Td>Governing result</Td><Td>Biaxial bending stress when free; combined axial plus biaxial normal stress when restrained</Td><Td>Conservative Von Mises beam bound over the complete intervention path</Td></tr>
          <tr><Td>Not covered</Td><Td>Pressure, temperature, local pipe details and code compliance</Td><Td>HDPE, plastic steel, irreversible soil behavior, local contact design and normative compliance</Td></tr>
        </tbody>
      </ScrollTable>
      <Note title="These tools support preliminary engineering—not final approval" tone="warning">A converged calculation and a met criterion do not establish physical validity, construction suitability or compliance with CSA, ASME or European requirements. A qualified engineer must select the model, verify its assumptions and independently review the result.</Note>
    </HelpSection>

    <HelpSection id="result-terminology" eyebrow="Getting started" title="Read the verdict before the number">
      <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-[minmax(150px,auto)_1fr]">
        {[
          ["Valid / converged", "The numerical checks required by that solver completed. This is not a physical-validity or code-compliance statement."],
          ["Criterion met / not met", "The reported model stress is respectively at or below, or above, the selected strict threshold. There is no hidden mechanical margin."],
          ["Uncertain", "The numerical uncertainty overlaps the threshold. It takes precedence over a pass/fail label."],
          ["Unresolved", "A failed, uncertain, interrupted or unsampled region has not been classified and must not be treated as failing or impossible."],
          ["Numerical failure", "The requested output could not be represented or solved reliably. The application does not substitute another model or a convenient mesh result."],
          ["Out of domain", "A documented model-scope screen was exceeded. No result within this model is claimed."],
          ["Instability risk", "The in-service initial effective compression reaches its Euler screen; the model stops without a post-buckling solution."],
        ].map(([term, meaning]) => <div className="contents" key={term}><dt className="font-semibold">{term}</dt><dd className="text-muted-foreground">{meaning}</dd></div>)}
      </dl>
      <Advanced title="Search results, represented values and certification language">
        <Bullets>
          <li>An exploratory range contains verified samples and estimated boundaries; it is not proof that all admissible regions were found.</li>
          <li>A represented length or height is a separately solved view used for charts and details. It can be changed without rerunning the search.</li>
          <li>A search candidate is recomputed before publication. Failed or uncertain samples remain visible as unresolved coverage.</li>
          <li>“Lowest computed stress” and “largest admissible value found” are observations, not demonstrated global optima.</li>
          <li>A support count is certified minimal only in the explicitly documented case where a verified candidate uses zero supports.</li>
        </Bullets>
      </Advanced>
    </HelpSection>

    <HelpSection id="units-and-exports" eyebrow="Getting started" title="Units, stale results and report snapshots">
      <Bullets>
        <li>The unit switch changes representation only; it does not restart a completed calculation.</li>
        <li>Editing a mechanical input invalidates results and export availability until the new request completes.</li>
        <li>Background calculations are isolated by request. Obsolete work is cancelled or ignored so it cannot overwrite a newer result.</li>
        <li>PDF exports use one coherent completed-request snapshot: inputs, derived values, result and displayed unit system belong together.</li>
        <li>A PDF records the model calculation; it is not a sealed design document or normative certificate.</li>
      </Bullets>
    </HelpSection>
  </div>
);

export default HelpOverview;
