// src/pages/help/HelpIntroduction.tsx

const HelpIntroduction = () => (
  <section id="introduction" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">1. Introduction</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      <strong>Pipe Lowering — Flexibility Optimizer</strong> is a specialized engineering tool designed for
      mechanical and structural engineers working in the oil &amp; gas industry. It performs{" "}
      <strong>pipeline flexibility and differential settlement analysis</strong> using the Finite Element Method (FEM).
    </p>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The tool models a straight pipe segment as an <strong>Euler-Bernoulli beam</strong> with fixed-fixed boundary
      conditions, subjected to self-weight and imposed differential settlement between supports. It automatically
      determines the minimum number of intermediate supports (hoists / sidebooms) required to keep bending stresses
      within the allowable limit.
    </p>
    <h3 className="text-base font-semibold mt-4">Typical use cases</h3>
    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
      <li>Assessing the effect of ground settlement on a pipeline span</li>
      <li>Determining the maximum allowable span length for a given settlement</li>
      <li>Finding the maximum tolerable settlement for a fixed span length</li>
      <li>Optimizing the number and placement of intermediate supports</li>
    </ul>
  </section>
);

export default HelpIntroduction;
