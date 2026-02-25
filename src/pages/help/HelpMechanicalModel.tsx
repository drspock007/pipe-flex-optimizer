// src/pages/help/HelpMechanicalModel.tsx

const HelpMechanicalModel = () => (
  <section id="mechanical-model" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">4. Mechanical Model</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      The pipeline segment is modeled as a <strong>1D Euler-Bernoulli beam</strong> with fixed-fixed (encastré-encastré)
      boundary conditions at both ends.
    </p>

    <h3 className="text-base font-semibold mt-4">Assumptions</h3>
    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
      <li>Linear elastic material behavior (Hooke's law)</li>
      <li>Small deformations and small rotations</li>
      <li>Plane sections remain plane (Bernoulli hypothesis)</li>
      <li>Shear deformation neglected (slender beam approximation)</li>
      <li>No axial loading, no torsion</li>
    </ul>

    <h3 className="text-base font-semibold mt-4">Sign conventions</h3>
    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
      <li>
        <strong>w (deflection)</strong>: positive downward in the FEM convention
      </li>
      <li>
        <strong>q (self-weight)</strong>: positive downward (gravity load)
      </li>
      <li>
        <strong>h (user input)</strong>: positive means the right end is higher than the left end
      </li>
      <li>
        <strong>h<sub>fem</sub></strong>: internally converted as h<sub>fem</sub> = −h<sub>user</sub> (positive = right end lower)
      </li>
    </ul>

    <h3 className="text-base font-semibold mt-4">Boundary conditions</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Left end: w = 0, θ = 0 (fully fixed). Right end: w = h<sub>fem</sub>, θ = 0 (imposed displacement, fixed rotation).
    </p>
  </section>
);

export default HelpMechanicalModel;
