// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Fixed-length solver for axialMode "restrained" (V2-9), with or without the
// rigid horizontal frictionless ground. Dedicated path: the free-mode solvers
// (solve.ts, ground-solve.ts, ground-fast.ts) are not used as exact solutions
// here (their quartic span and N = 0 lateral closed form are invalid for N != 0).
// Hermite mesh doubled from RESTRAINED_MIN_ELEMENTS until two consecutive
// comparisons meet the change criteria (same thresholds as the ground branch,
// plus |dN|/A); stops with a named failure otherwise. No penalty, no widening.

import { BiaxialResult } from "./types";
import { LinearSolveError } from "./linear-algebra";
import { buildRMesh, refineRActive, RMesh } from "./restrained-state";
import { solveAxial } from "./restrained-axial";
import { buildRLevel, RLevel } from "./restrained-result";
import { GROUND_CONV_REL, GROUND_PEN_REL, GROUND_STRESS_FLOOR, RefinementLevel } from "./ground-types";
import { RESTRAINED_MAX_ELEMENTS, RESTRAINED_MIN_ELEMENTS, RestrainedLevel } from "./restrained-types";
import type { GroundInput } from "./ground-solve";

export type RestrainedInput = Omit<GroundInput, "groundZ"> & { groundZ?: number };
export interface RestrainedLimits { maxElements?: number; minElements?: number }

/** Called after validation and geometry checks by solveBiaxialFixedLength / solveGroundFixedLength. */
export function solveRestrained(input: RestrainedInput, limits: RestrainedLimits = {}): BiaxialResult {
  try { return run(input, limits.maxElements ?? RESTRAINED_MAX_ELEMENTS, limits.minElements ?? RESTRAINED_MIN_ELEMENTS); }
  catch (e) {
    if (e instanceof LinearSolveError) return { status: "solver-error", message: e.message };
    throw e;
  }
}

function run(input: RestrainedInput, maxElements: number, minElements: number): BiaxialResult {
  const { L, hv, hl, E, I, A, q, numSupports: n } = input;
  const groundZ = input.groundZ ?? null, EI = E * I, EA = E * A;
  const hAll = Math.max(Math.abs(hv), Math.abs(hl), groundZ === null ? 0 : Math.abs(groundZ));
  const dispScale = Math.max(hAll, (q * L ** 4) / (384 * EI), 1e-3);
  const forceScale0 = Math.max(q * L, (12 * EI * hAll) / L ** 3, 1e-6);
  if (![EI, EA, L ** 4, dispScale, forceScale0].every(Number.isFinite)) return { status: "numerical-failure", message: "Numerical overflow: derived scales are not finite" };
  const tolDisp = 1e-8 * dispScale, tolForce = 1e-8 * forceScale0, tolPen = GROUND_PEN_REL * dispScale;

  let perSpan = Math.max(1, Math.ceil(minElements / (n + 1)));
  let prev: { mesh: RMesh; active: boolean[]; lvl: RLevel; perSpan: number } | null = null;
  const levels: RestrainedLevel[] = [], refinement: RefinementLevel[] = [];
  let coarse: number | null = null, passes = 0, lossRun = 0;
  while ((n + 1) * perSpan <= maxElements) {
    const mesh = buildRMesh(L, hv, hl, EI, q, n, groundZ, perSpan, tolDisp);
    const init = prev ? refineRActive(prev.mesh, prev.active) : mesh.x.map(() => false);
    const ax = solveAxial(mesh, EA, init, tolDisp, tolForce);
    const lvl = buildRLevel(input, mesh, ax, forceScale0, dispScale, hAll, tolDisp, tolForce);
    const s = lvl.success, a = s.axial!;
    levels.push({ elements: a.elements, N: a.N, bendingMax: a.bendingMax, combinedMax: a.combinedMax, maxPenetration: lvl.pen, axialIterations: ax.iterations, contactIterations: ax.contactIterations });
    refinement.push({ elements: a.elements, maxStress: a.combinedMax, groundReaction: lvl.ground.totalReaction, contactTotal: lvl.ground.contactTotal, maxPenetration: lvl.pen, iterations: ax.contactIterations, contactConverged: ax.ok });
    if (s.diagnostics.messages.some((x) => x.startsWith("Non-finite"))) return { status: "numerical-failure", message: "Numerical overflow: non-finite value in the restrained solution", diagnostics: s.diagnostics };
    if (!ax.ok) {
      const contact = ax.message.startsWith("Vertical contact");
      return { status: "incomplete", cause: contact ? "contact-not-converged" : "axial-not-converged", refinement, diagnostics: s.diagnostics, message: `${ax.message} (${a.elements} elements)` };
    }
    if (coarse === null) coarse = perSpan;
    const ok = prev && lvl.pen <= tolPen && s.numericalValid && same(prev.lvl, lvl, prev.perSpan, perSpan, coarse, input.sigmaAllow, A, s.diagnostics.scales.force, dispScale);
    passes = ok ? passes + 1 : 0;
    if (passes >= 2) {
      a.refinement = levels;
      a.criterionUncertain = uncertain(prev!.lvl, lvl, input.sigmaAllow);
      if (groundZ !== null) {
        s.ground = { ...lvl.ground, level: groundZ, refinement, converged: true, tolPenetration: tolPen, maxPenetration: lvl.pen, elements: a.elements, precisionLoss: false, method: "mesh-refinement", criterionUncertain: a.criterionUncertain };
      }
      return s;
    }
    prev = { mesh, active: ax.active, lvl, perSpan };
    lossRun = lvl.precisionLoss ? lossRun + 1 : 0;
    if (lossRun >= 2) return { status: "incomplete", cause: "precision-loss", refinement, diagnostics: s.diagnostics, message: `Precision loss in the equilibrium check on two consecutive meshes (${a.elements} elements)` };
    perSpan *= 2;
  }
  return { status: "incomplete", cause: "mesh-not-converged", refinement, ...(prev ? { diagnostics: prev.lvl.success.diagnostics } : {}),
    message: `Mesh convergence not established within ${maxElements} elements (restrained axial mode)` };
}

function uncertain(a: RLevel, b: RLevel, sigmaAllow: number): boolean {
  const sa = a.success.axial!.combinedMax, sb = b.success.axial!.combinedMax;
  const tol = GROUND_CONV_REL * Math.max(sb, GROUND_STRESS_FLOOR * sigmaAllow);
  return (sa <= sigmaAllow) !== (sb <= sigmaAllow) || Math.abs(sb - sigmaAllow) <= tol;
}

function same(a: RLevel, b: RLevel, pa: number, pb: number, coarse: number, sigmaAllow: number, A: number, F: number, D: number): boolean {
  const xa = a.success.axial!, xb = b.success.axial!, floor = GROUND_STRESS_FLOOR * sigmaAllow;
  const close = (u: number, v: number, ref: number) => Math.abs(u - v) <= GROUND_CONV_REL * ref;
  if (!close(xa.combinedMax, xb.combinedMax, Math.max(xb.combinedMax, floor))) return false;
  if (!close(xa.bendingMax, xb.bendingMax, Math.max(xb.bendingMax, floor))) return false;
  if (!close(a.verticalStress, b.verticalStress, Math.max(b.verticalStress, floor))) return false;
  if (!close(xa.N / A, xb.N / A, Math.max(xb.combinedMax, floor))) return false;
  if (!close(a.ground.contactTotal, b.ground.contactTotal, F)) return false;
  if (a.success.supports.some((s, k) => !s.sharedWithGround && !close(s.reaction, b.success.supports[k].reaction, F))) return false;
  const sa = a.success.nodes, sb = b.success.nodes, stepA = pa / coarse, stepB = pb / coarse;
  for (let k = 0; k * stepA < sa.length; k++) {
    if (!close(sa[k * stepA].z, sb[k * stepB].z, D)) return false;
    if (!close(xa.lateral.nodes[k * stepA].y, xb.lateral.nodes[k * stepB].y, D)) return false;
  }
  return true;
}
