// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Orchestration of the V2 fixed-length biaxial solver (linear, axial mode "free").
// In "free" mode the global longitudinal force is neglected (ideal frictionless
// sliding); L is the projected length. Large-rotation kinematics are not solved.

import { BiaxialInput, BiaxialResult, Diagnostics, MemberResult, SupportResult } from "./types";
import { validateInput } from "./validate";
import { buildVerticalSystem, condense, nodalReactions, solveDisplacements } from "./vertical-system";
import { solveContact } from "./contact";
import { memberEndActions } from "./beam-member";
import { fibreAngles, memberMaximum } from "./biaxial";
import { LinearSolveError } from "./linear-algebra";

export function solveBiaxialFixedLength(input: BiaxialInput): BiaxialResult {
  const errors = validateInput(input);
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") {
    return { status: "not-implemented", message: 'axialMode "restrained" is not implemented' };
  }
  try {
    return run(input);
  } catch (e) {
    if (e instanceof LinearSolveError) return { status: "solver-error", message: e.message };
    throw e;
  }
}

function run(input: BiaxialInput): BiaxialResult {
  const { L, hv, hl, E, I, c, q, sigmaAllow, numSupports: n } = input;
  const EI = E * I;
  const dispScale = Math.max(Math.abs(hv), Math.abs(hl), (q * L ** 4) / (384 * EI), 1e-3);
  const forceScale = Math.max(q * L, (12 * EI * Math.max(Math.abs(hv), Math.abs(hl))) / L ** 3, 1e-6);
  const tolDisp = 1e-8 * dispScale;
  const tolForce = 1e-8 * forceScale;

  const sys = buildVerticalSystem(L, hv, EI, q, n);
  let R = new Array<number>(n).fill(0);
  let contact = { converged: true, iterations: 0, message: "no supports" };
  if (n > 0) {
    const { g0, C } = condense(sys);
    const out = solveContact(g0, C, tolDisp, tolForce);
    R = out.R;
    contact = out;
  }
  const d = solveDisplacements(sys, R);
  const Rall = nodalReactions(sys, d);
  const nd = d.length;

  // Post-solve validation on unrounded values.
  const messages: string[] = contact.converged ? [] : [contact.message];
  let freeDofResidual = 0;
  sys.free.forEach((dof, k) => {
    const applied = k % 2 === 0 ? R[k / 2] : 0;
    freeDofResidual = Math.max(freeDofResidual, Math.abs(Rall[dof] - applied));
  });
  let sumF = 0;
  let sumM = 0;
  const reactionNodes = [0, ...sys.levels.map((_, s) => s + 1), sys.nodesX.length - 1];
  for (const node of reactionNodes) {
    const Fz = node === 0 || node === sys.nodesX.length - 1 ? Rall[2 * node] : R[node - 1];
    const Ct = node === 0 || node === sys.nodesX.length - 1 ? Rall[2 * node + 1] : 0;
    sumF += Fz;
    sumM += Fz * sys.nodesX[node] + Ct;
  }
  const forceResidual = Math.abs(sumF - q * L);
  const momentResidual = Math.abs(sumM - (q * L * L) / 2);

  const supports: SupportResult[] = sys.levels.map((level, s) => {
    const z = d[2 * (s + 1)];
    const gap = z - level;
    return { index: s + 1, x: sys.nodesX[s + 1], level, z, gap, reaction: R[s], active: R[s] > 0 };
  });
  let contactValid = true;
  for (const s of supports) {
    const complementary = Math.min(Math.abs(s.gap) / tolDisp, Math.abs(s.reaction) / tolForce) <= 1;
    if (s.gap < -tolDisp || s.reaction < -tolForce || !complementary) {
      contactValid = false;
      messages.push(`Contact condition violated at support ${s.index}`);
    }
  }
  const equilibriumOk =
    forceResidual <= 1e-7 * forceScale &&
    momentResidual <= 1e-7 * forceScale * L &&
    freeDofResidual <= 1e-7 * forceScale * Math.max(L, 1);
  if (!equilibriumOk) messages.push("Equilibrium residuals exceed tolerance");

  const diagnostics: Diagnostics = {
    converged: contact.converged, iterations: contact.iterations, contactValid,
    forceResidual, momentResidual, freeDofResidual, tolDisp, tolForce, messages,
  };
  if (!contact.converged || !contactValid) return { status: "contact-not-converged", diagnostics };

  const members: MemberResult[] = sys.nodesX.slice(0, -1).map((x0, e) => {
    const length = sys.nodesX[e + 1] - x0;
    const de = d.slice(2 * e, 2 * e + 4) as [number, number, number, number];
    const [Fi, Ci, Fj, Cj] = memberEndActions(EI, q, length, de);
    return { index: e, xStart: x0, length, nodalDisplacements: de, endActions: { Fi, Ci, Fj, Cj }, EI, q };
  });

  let critical = { x: 0, memberIndex: 0, Mv: 0, Ml: 0, Mres: -1 };
  members.forEach((m) => {
    const mm = memberMaximum(m, L, hl);
    if (mm.Mres > critical.Mres) {
      critical = { x: m.xStart + mm.xi, memberIndex: m.index, Mv: mm.Mv, Ml: mm.Ml, Mres: mm.Mres };
    }
  });
  const maxStress = (c * critical.Mres) / I;
  const angles = fibreAngles(critical.Mv, critical.Ml, 1e-12 * Math.max(forceScale * L, 1));

  return {
    status: "ok", input, L,
    nodes: sys.nodesX.map((x, i) => ({ x, z: d[2 * i], theta: d[2 * i + 1] })),
    members, supports,
    endReactions: {
      left: { force: Rall[0], couple: Rall[1] },
      right: { force: Rall[nd - 2], couple: Rall[nd - 1] },
    },
    critical: { ...critical, sigma: maxStress, ...angles },
    maxStress, sigmaAllow,
    bendingCriterionMet: maxStress <= sigmaAllow,
    modelValid: contact.converged && contactValid && equilibriumOk,
    diagnostics,
  };
}
