// créé par Giovanni Malagnino, 2026-09-26 18:10 CEST (Europe/Rome, UTC+2)
// V2-11-R1: analytical full-ground-contact solution of the exactly flat case.
// Conditions (exact, checked after validation; no tolerance): hv = 0, hl = 0,
// groundZ = 0, q >= 0, initially straight unstressed pipe, supports at their
// usual levels hv*i/(n+1) = 0 (i.e. on the ground line).
// Continuous solution: z = y = 0, z' = y' = 0, Mv = Ml = 0, shear 0, stresses 0,
// N = 0 in restrained mode (no slope -> EA/(2L) int (z'^2 + y'^2) = 0).
// Reactions: with z = 0, EI z'''' = 0 = -q + p(x) + sum F_i delta(x - x_i),
// with a linear ground reaction measure p >= 0 and support forces F_i >= 0. q has no
// atom and p >= 0, so every F_i = 0; boundary shear and moment vanish, so the
// clamp forces and couples are 0. The ground carries p(x) = q on [0, L]
// (resultant qL). Unique; no mesh, no nodal contact, no refinement.

import { BiaxialSuccess, EquilibriumSet } from "./types";
import { equilibriumTolerances } from "./equilibrium";
import type { GroundInput } from "./ground-solve";

export const FLAT_METHOD_LABEL = "analytical full-ground-contact solution";

/** Exact trigger: strict equalities only (a small non-zero offset is NOT zero). */
export function isExactFlatOnGround(input: GroundInput): boolean {
  return input.hv === 0 && input.hl === 0 && input.groundZ === 0 && input.q >= 0;
}

/** Caller validates the input first. Returns null when the exact conditions do not hold. */
export function solveFlatOnGround(input: GroundInput): BiaxialSuccess | null {
  if (!isExactFlatOnGround(input)) return null;
  const { L, q, E, I, sigmaAllow, numSupports: n } = input;
  const EI = E * I, total = q * L;
  if (![EI, total].every(Number.isFinite)) return null; // caller falls back to the general path
  const xs = Array.from({ length: n + 2 }, (_, i) => (i * L) / (n + 1));
  const zero: EquilibriumSet = { translation: 0, rotation: 0, globalForce: 0, globalMoment: 0 };
  const forceScale = Math.max(total, 1e-6);
  const nodes = xs.map((x) => ({ x, z: 0, theta: 0 }));
  // One member per span; member q is the NET distributed load q - p = 0.
  const members = xs.slice(0, -1).map((x0, k) => ({
    index: k, xStart: x0, length: xs[k + 1] - x0, nodalDisplacements: [0, 0, 0, 0] as [number, number, number, number],
    endActions: { Fi: 0, Ci: 0, Fj: 0, Cj: 0 }, EI, q: 0,
  }));
  const supports = xs.slice(1, -1).map((x, k) => ({ index: k + 1, x, level: 0, z: 0, gap: 0, reaction: 0, active: false, sharedWithGround: true }));
  const res: BiaxialSuccess = {
    status: "ok", input, L, nodes, members, supports,
    endReactions: { left: { force: 0, couple: 0 }, right: { force: 0, couple: 0 } },
    critical: { x: 0, memberIndex: 0, Mv: 0, Ml: 0, Mres: 0, sigma: 0, phiTension: null, phiCompression: null },
    maxStress: 0, sigmaAllow, bendingCriterionMet: true, numericalValid: true, physicalValidity: "not-assessed",
    diagnostics: {
      converged: true, iterations: 0, contactValid: true, scales: { force: forceScale, moment: forceScale * L, displacement: 1e-3 },
      residuals: zero, residualTolerances: equilibriumTolerances(forceScale, L), normalizedResiduals: zero, equilibriumOk: true,
      tolDisp: 0, tolForce: 0, messages: [`${FLAT_METHOD_LABEL}: exact, no mesh`],
    },
    ground: {
      level: 0, totalReaction: total, combinedReaction: 0, endReaction: 0, contactTotal: total, precisionLoss: false,
      contactZones: [{ xStart: 0, xEnd: L }], contactPoints: [], criterionUncertain: false, contactNodes: 0,
      maxPenetration: 0, tolPenetration: 0, refinement: [], converged: true, elements: 0,
      method: "analytical-full-contact", distributedReaction: q,
    },
  };
  if (input.axialMode === "restrained") {
    res.axial = {
      N: 0, sigmaAxial: 0, bendingMax: 0, combinedMax: 0, combinedX: 0, combinedCriterionMet: true, criterionUncertain: false,
      strain: 0, maxSlope: 0, compatibilityResidual: 0, compatibilityTolerance: 0, axialIterations: 0, elements: 0, refinement: [],
      precisionLoss: false, longitudinalReaction: 0, method: "analytical-full-contact",
      lateral: {
        nodes: xs.map(() => ({ y: 0, theta: 0 })),
        endActions: members.map(() => [0, 0, 0, 0] as [number, number, number, number]),
        endReactions: { left: { force: 0, couple: 0 }, right: { force: 0, couple: 0 } },
      },
    };
  }
  return res;
}
