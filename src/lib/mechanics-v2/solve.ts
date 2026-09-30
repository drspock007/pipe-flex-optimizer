// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Orchestration of the V2 fixed-length biaxial solver (linear, axial mode "free").
// In "free" mode the global longitudinal force is neglected (ideal frictionless
// sliding); L is the projected length. Large-rotation kinematics are not solved
// and physical validity (small rotations) is reported as "not-assessed".

import { BiaxialInput, BiaxialResult, BiaxialSuccess, Diagnostics, MemberResult, SupportResult } from "./types";
import { validateInput } from "./validate";
import { solveRestrained } from "./restrained-solve";
import { buildVerticalSystem, condense, nodalReactions, solveDisplacements } from "./vertical-system";
import { solveContact } from "./contact";
import { memberEndActions } from "./beam-member";
import { fibreAngles, memberMaximum } from "./biaxial";
import { LinearSolveError } from "./linear-algebra";
import { checkEquilibrium, equilibriumResiduals, equilibriumTolerances, normalizeResiduals } from "./equilibrium";

export function solveBiaxialFixedLength(input: BiaxialInput): BiaxialResult {
  const errors = validateInput(input);
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return solveRestrained(input); // V2-9 dedicated solver
  try {
    return run(input);
  } catch (e) {
    if (e instanceof LinearSolveError) return { status: "solver-error", message: e.message };
    throw e;
  }
}

const allFinite = (v: number[]) => v.every(Number.isFinite);

function run(input: BiaxialInput): BiaxialResult {
  const { L, hv, hl, E, I, c, q, sigmaAllow, numSupports: n } = input;
  const EI = E * I;
  const hMax = Math.max(Math.abs(hv), Math.abs(hl));
  const dispScale = Math.max(hMax, (q * L ** 4) / (384 * EI), 1e-3);
  const forceScale = Math.max(q * L, (12 * EI * hMax) / L ** 3, 1e-6);
  if (!allFinite([EI, L ** 4, L ** 3, dispScale, forceScale, forceScale * L])) {
    return { status: "numerical-failure", message: "Derived scales overflow (EI, L^3, L^4 or force scale)" };
  }
  const tolDisp = 1e-8 * dispScale;
  const tolForce = 1e-8 * forceScale;

  const sys = buildVerticalSystem(L, hv, EI, q, n);
  let R = new Array<number>(n).fill(0);
  let contact = { converged: true, iterations: 0, message: "no supports" };
  if (n > 0) {
    const { g0, C } = condense(sys);
    if (!allFinite([...g0, ...C.flat()])) {
      return { status: "numerical-failure", message: "Non-finite condensed contact data" };
    }
    const out = solveContact(g0, C, tolDisp, tolForce);
    R = out.R;
    contact = out;
  }
  const d = solveDisplacements(sys, R);
  const Rall = nodalReactions(sys, d);

  // Post-solve validation on unrounded values.
  const messages: string[] = contact.converged ? [] : [contact.message];
  const residuals = equilibriumResiduals(sys, Rall, R, q, L);
  const residualTolerances = equilibriumTolerances(forceScale, L);
  const eq = checkEquilibrium(residuals, residualTolerances);
  messages.push(...eq.failures);

  const supports: SupportResult[] = sys.levels.map((level, s) => {
    const z = d[2 * (s + 1)];
    const gap = z - level;
    return { index: s + 1, x: sys.nodesX[s + 1], level, z, gap, reaction: R[s], active: R[s] > 0 };
  });
  let contactValid = true;
  for (const s of supports) {
    const complementary = Math.min(Math.abs(s.gap) / tolDisp, Math.abs(s.reaction) / tolForce) <= 1;
    if (!(s.gap >= -tolDisp) || !(s.reaction >= -tolForce) || !complementary) {
      contactValid = false;
      messages.push(`Contact condition violated at support ${s.index}`);
    }
  }

  const diagnostics: Diagnostics = {
    converged: contact.converged, iterations: contact.iterations, contactValid,
    scales: { force: forceScale, moment: forceScale * L, displacement: dispScale },
    residuals, residualTolerances,
    normalizedResiduals: normalizeResiduals(residuals, forceScale, L),
    equilibriumOk: eq.ok, tolDisp, tolForce, messages,
  };
  if (!contact.converged || !contactValid) return { status: "contact-not-converged", diagnostics };
  if (!eq.ok || !allFinite([...d, ...Rall])) {
    return { status: "numerical-failure", message: "Equilibrium check failed or non-finite solution", diagnostics };
  }

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

  const result: BiaxialSuccess = {
    status: "ok", input, L,
    nodes: sys.nodesX.map((x, i) => ({ x, z: d[2 * i], theta: d[2 * i + 1] })),
    members, supports,
    endReactions: {
      left: { force: Rall[0], couple: Rall[1] },
      right: { force: Rall[Rall.length - 2], couple: Rall[Rall.length - 1] },
    },
    critical: { ...critical, sigma: maxStress, ...angles },
    maxStress, sigmaAllow,
    bendingCriterionMet: maxStress <= sigmaAllow,
    numericalValid: contact.converged && contactValid && eq.ok,
    physicalValidity: "not-assessed",
    diagnostics,
  };
  const published = [
    maxStress, critical.x, critical.Mv, critical.Ml,
    ...members.flatMap((m) => [m.endActions.Fi, m.endActions.Ci, m.endActions.Fj, m.endActions.Cj]),
    ...supports.flatMap((s) => [s.z, s.gap, s.reaction]),
  ];
  if (!allFinite(published)) {
    return { status: "numerical-failure", message: "Non-finite derived results", diagnostics };
  }
  return result;
}
