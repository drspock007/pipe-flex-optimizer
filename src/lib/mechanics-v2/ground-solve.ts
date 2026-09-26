// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Dedicated fixed-length branch with a rigid horizontal frictionless ground.
// The no-ground solver (solve.ts) is not modified. Mesh refined by doubling
// until displacements, maximum stress and reactions converge and the interior
// penetration is controlled; otherwise an explicit "incomplete" is returned.
// Distributed contact is a controlled numerical approximation, not exact.
// V2-7-R1: (1) exact path first (ground-fast.ts) when the exact no-ground
// solution clears the ground; (2) refinement stops once the strict equilibrium
// budget is exceeded on two consecutive meshes: round-off grows ~N^3 with the
// element stiffness (EI/h^3) and further doubling cannot restore it; the
// failure is then reported with its cause ("precision-loss").

import { BiaxialInput, BiaxialResult } from "./types";
import { validateInput } from "./validate";
import { solveRestrained } from "./restrained-solve";
import { LinearSolveError } from "./linear-algebra";
import { buildGroundMesh, GroundMesh } from "./ground-mesh";
import { maxPenetration, refineActive, solveGroundContact } from "./ground-contact";
import { buildLevelResult, LevelResult } from "./ground-result";
import { tryExactNoContact } from "./ground-fast";
import { GROUND_CONV_REL, GROUND_MAX_ELEMENTS, GROUND_MIN_ELEMENTS, GROUND_PEN_REL, GROUND_STRESS_FLOOR, RefinementLevel } from "./ground-types";

export interface GroundInput extends BiaxialInput { groundZ: number }
export interface GroundLimits { maxElements?: number; minElements?: number }

export function solveGroundFixedLength(input: GroundInput, limits: GroundLimits = {}): BiaxialResult {
  const errors = validateInput(input);
  if (typeof input.groundZ !== "number" || !Number.isFinite(input.groundZ)) errors.push("groundZ must be a finite number");
  if (errors.length) return { status: "invalid-input", errors };
  const { groundZ, hv } = input;
  if (0 < groundZ || hv < groundZ) {
    const which = [0 < groundZ ? "left end (z = 0)" : "", hv < groundZ ? `right end (z = hv = ${hv} mm)` : ""].filter(Boolean).join(" and ");
    return { status: "geometry-incompatible", message: `Imposed ${which} below the minimum pipe-axis elevation ${groundZ} mm` };
  }
  if (input.axialMode === "restrained") return solveRestrained(input, limits); // V2-9 dedicated solver
  try { return run(input, limits.maxElements ?? GROUND_MAX_ELEMENTS, limits.minElements ?? GROUND_MIN_ELEMENTS); }
  catch (e) {
    if (e instanceof LinearSolveError) return { status: "solver-error", message: e.message };
    throw e;
  }
}

function run(input: GroundInput, maxElements: number, minElements: number): BiaxialResult {
  const { L, hv, E, I, q, numSupports: n, groundZ } = input;
  const EI = E * I;
  // Vertical scales only: hl must not loosen vertical contact tolerances.
  const hMax = Math.max(Math.abs(hv), Math.abs(groundZ));
  const dispScale = Math.max(hMax, (q * L ** 4) / (384 * EI), 1e-3);
  const forceScale = Math.max(q * L, (12 * EI * hMax) / L ** 3, 1e-6);
  if (![EI, L ** 4, dispScale, forceScale].every(Number.isFinite)) return { status: "numerical-failure", message: "Numerical overflow: derived scales are not finite" };
  const tolDisp = 1e-8 * dispScale, tolForce = 1e-8 * forceScale, tolPen = GROUND_PEN_REL * dispScale;
  const exact = tryExactNoContact(input, tolPen, tolDisp);
  if (exact) return exact;
  const scales = { force: forceScale, displacement: dispScale };

  let perSpan = Math.max(1, Math.ceil(minElements / (n + 1)));
  let prev: { mesh: GroundMesh; active: boolean[]; lvl: LevelResult; perSpan: number } | null = null;
  const refinement: RefinementLevel[] = [];
  let coarse: number | null = null;
  let passes = 0, lossRun = 0;
  while ((n + 1) * perSpan <= maxElements) {
    const mesh = buildGroundMesh(L, hv, EI, q, n, groundZ, perSpan, tolDisp);
    const init = prev ? refineActive(prev.mesh, prev.active) : mesh.x.map(() => false);
    const out = solveGroundContact(mesh, init, tolDisp, tolForce, 50 + 4 * mesh.x.length);
    const pen = maxPenetration(mesh, out.state);
    const lvl = buildLevelResult(input, mesh, out.state, out.active, scales, tolDisp, tolForce, out.iterations, pen);
    if (!lvl.success.diagnostics.messages.every((x) => !x.startsWith("Non-finite"))) {
      return { status: "numerical-failure", message: "Numerical overflow: non-finite value in the ground solution", diagnostics: lvl.success.diagnostics };
    }
    refinement.push({ elements: mesh.x.length - 1, maxStress: lvl.success.maxStress, groundReaction: lvl.ground.totalReaction, contactTotal: lvl.ground.contactTotal, maxPenetration: pen, iterations: out.iterations, contactConverged: out.converged });
    if (!out.converged) return { status: "contact-not-converged", diagnostics: { ...lvl.success.diagnostics, converged: false, messages: [out.message] } };
    if (coarse === null) coarse = perSpan;
    const ok = prev && pen <= tolPen && lvl.success.numericalValid && same(prev.lvl, lvl, prev.perSpan, perSpan, coarse, input.sigmaAllow, forceScale, dispScale);
    passes = ok ? passes + 1 : 0;
    if (passes >= 2) {
      lvl.success.ground = { ...lvl.ground, refinement, converged: true, tolPenetration: tolPen, elements: mesh.x.length - 1, precisionLoss: lvl.precisionLoss, method: "mesh-refinement",
        criterionUncertain: criterionUncertain(prev!.lvl, lvl, input.sigmaAllow) };
      return lvl.success;
    }
    prev = { mesh, active: out.active, lvl, perSpan };
    lossRun = lvl.precisionLoss ? lossRun + 1 : 0;
    if (lossRun >= 2) {
      return { status: "incomplete", cause: "precision-loss", refinement, diagnostics: lvl.success.diagnostics,
        message: `Precision loss in the equilibrium check: residuals above the strict budget (1e-7 of scale) on two consecutive meshes (${mesh.x.length - 1} elements); further refinement only increases round-off` };
    }
    perSpan *= 2;
  }
  const last = prev?.lvl.success.diagnostics;
  const loss = !!prev?.lvl.precisionLoss;
  return {
    status: "incomplete", cause: loss ? "precision-loss" : "mesh-not-converged",
    message: `Mesh convergence not established within ${maxElements} elements: two consecutive refinements must meet the change criteria, penetration tolerance and equilibrium budget${loss ? " (precision loss on the last mesh)" : ""}`,
    refinement, ...(last ? { diagnostics: last } : {}),
  };
}

/** Verdict maxStress <= sigmaAllow not decidable at the convergence precision. */
function criterionUncertain(a: LevelResult, b: LevelResult, sigmaAllow: number): boolean {
  const sa = a.success.maxStress, sb = b.success.maxStress;
  const tol = GROUND_CONV_REL * Math.max(sb, GROUND_STRESS_FLOOR * sigmaAllow);
  return (sa <= sigmaAllow) !== (sb <= sigmaAllow) || Math.abs(sb - sigmaAllow) <= tol;
}

/** Convergence test between two successive meshes (see tolerances in ground-types.ts). */
function same(a: LevelResult, b: LevelResult, pa: number, pb: number, coarse: number, sigmaAllow: number, F: number, D: number): boolean {
  const sa = a.success, sb = b.success;
  const floor = GROUND_STRESS_FLOOR * sigmaAllow;
  if (Math.abs(sa.maxStress - sb.maxStress) > GROUND_CONV_REL * Math.max(sb.maxStress, floor)) return false;
  // Vertical check on its own: a large lateral stress must not hide a vertical error.
  if (Math.abs(a.verticalStress - b.verticalStress) > GROUND_CONV_REL * Math.max(b.verticalStress, floor)) return false;
  // Ground + coinciding supports + ends on the ground: only their sum is determinate.
  if (Math.abs(a.ground.contactTotal - b.ground.contactTotal) > GROUND_CONV_REL * F) return false;
  if (sa.supports.some((s, k) => !s.sharedWithGround && Math.abs(s.reaction - sb.supports[k].reaction) > GROUND_CONV_REL * F)) return false;
  const stepA = pa / coarse, stepB = pb / coarse;
  for (let k = 0; k * stepA < sa.nodes.length; k++) {
    if (Math.abs(sa.nodes[k * stepA].z - sb.nodes[k * stepB].z) > GROUND_CONV_REL * D) return false;
  }
  return true;
}
