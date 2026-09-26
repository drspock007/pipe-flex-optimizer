// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Builds one mesh level of the restrained branch (V2-9). Reactions come from
// the residual of the FULL formulation (K + N G) d - F, geometric part included.
// Global balances adapted to the model (longitudinal reactions -N / +N at the
// ends, lines of action at z = 0 and z = hv, y = 0 and y = hl):
//   vertical: sum of vertical reactions = q L;
//             sum (R x + C) = q L^2/2 + N hv   (couple of the end tensions);
//   lateral:  sum of lateral reactions = 0;  sum (R x + C) = N hl.

import { BiaxialInput, BiaxialSuccess, EquilibriumSet, MemberResult, SupportResult } from "./types";
import { fibreAngles } from "./biaxial";
import { checkEquilibrium, equilibriumTolerances, normalizeResiduals } from "./equilibrium";
import { memberMinZ } from "./ground-mesh";
import { endActionsN } from "./restrained-element";
import { fieldMaxima } from "./restrained-maxima";
import { RMesh } from "./restrained-state";
import { AxialOutcome } from "./restrained-axial";
import { ContactZone } from "./ground-types";

export interface RLevel {
  success: BiaxialSuccess; verticalStress: number; precisionLoss: boolean; pen: number;
  ground: { totalReaction: number; combinedReaction: number; endReaction: number; contactTotal: number; contactZones: ContactZone[]; contactPoints: number[]; contactNodes: number };
}

function planeBalance(m: RMesh, res: number[], fixedNode: (i: number) => boolean, load: number, moment: number) {
  const Ne = m.x.length - 1, nd = res.length;
  let t = 0, r = 0, sF = res[0] + res[nd - 2], sM = res[1] + res[nd - 1] + res[nd - 2] * m.L;
  for (let i = 1; i < Ne; i++) {
    r = Math.max(r, Math.abs(res[2 * i + 1]));
    if (fixedNode(i)) { sF += res[2 * i]; sM += res[2 * i] * m.x[i]; } else t = Math.max(t, Math.abs(res[2 * i]));
  }
  return { translation: t, rotation: r, globalForce: Math.abs(sF - load), globalMoment: Math.abs(sM - moment) };
}

export function buildRLevel(input: BiaxialInput, m: RMesh, ax: AxialOutcome, forceScale0: number, dispScale: number, hAll: number, tolDisp: number, tolForce: number): RLevel {
  const { L, I, c, A, E, q, sigmaAllow } = input;
  const { N, vert, lat, active } = ax;
  const Ne = m.x.length - 1, nd = 2 * (Ne + 1), EI = m.EI;
  const forceScale = Math.max(forceScale0, (N * hAll) / L);
  const els = m.x.slice(0, -1).map((x0, e) => {
    const l = m.x[e + 1] - x0, dz = vert.d.slice(2 * e, 2 * e + 4), dy = lat.d.slice(2 * e, 2 * e + 4);
    return { l, x0, dz, dy, av: endActionsN(EI, N, q, l, dz), al: endActionsN(EI, N, 0, l, dy) };
  });
  const members: MemberResult[] = els.map((e, k) => ({
    index: k, xStart: e.x0, length: e.l, nodalDisplacements: e.dz as [number, number, number, number],
    endActions: { Fi: e.av[0], Ci: e.av[1], Fj: e.av[2], Cj: e.av[3] }, EI, q,
  }));
  const rv = planeBalance(m, vert.res, (i) => active[i], q * L, (q * L * L) / 2 + N * m.hv);
  const rl = planeBalance(m, lat.res, () => false, 0, N * m.hl);
  const residuals: EquilibriumSet = {
    translation: Math.max(rv.translation, rl.translation), rotation: Math.max(rv.rotation, rl.rotation),
    globalForce: Math.max(rv.globalForce, rl.globalForce), globalMoment: Math.max(rv.globalMoment, rl.globalMoment),
  };
  const residualTolerances = equilibriumTolerances(forceScale, L);
  const eq = checkEquilibrium(residuals, residualTolerances);
  const messages = [...eq.failures];
  if (!eq.ok) messages.push("Equilibrium residual above the mechanical budget (1e-7 of scale): precision loss");
  const compatOk = ax.compat <= ax.tolN;
  if (!compatOk) messages.push(`Axial compatibility residual ${ax.compat} N exceeds ${ax.tolN} N`);

  const contactPoints: number[] = [];
  let nodal = 0, combined = 0, contactNodes = 0, contactValid = true;
  for (let i = 1; i < Ne; i++) {
    const g = vert.d[2 * i] - m.level[i], r = active[i] ? vert.res[2 * i] : 0;
    if (g < -tolDisp || r < -tolForce) { contactValid = false; messages.push(`Contact condition violated at node ${i}`); }
    if (!active[i]) continue;
    if (m.kind[i] === "ground") { nodal += r; contactNodes++; contactPoints.push(m.x[i]); }
    else if (m.kind[i] === "shared") { combined += r; contactNodes++; contactPoints.push(m.x[i]); }
  }
  const zones: ContactZone[] = [];
  const h = L / Ne;
  const on = (i: number) => (i === 0 ? m.endOnGround[0] : i === Ne ? m.endOnGround[1] : active[i] && m.kind[i] !== "support");
  for (let i = 0; i <= Ne; i++) {
    if (!on(i)) continue;
    const last = zones[zones.length - 1];
    if (last && m.x[i] - last.xEnd <= 3 * h * (1 + 1e-9)) last.xEnd = m.x[i]; else zones.push({ xStart: m.x[i], xEnd: m.x[i] });
  }
  const endReaction = (m.endOnGround[0] ? vert.res[0] : 0) + (m.endOnGround[1] ? vert.res[nd - 2] : 0);
  let pen = 0;
  if (m.groundZ !== null) for (const e of els) pen = Math.max(pen, m.groundZ - memberMinZ(e.dz[0], e.dz[1], e.dz[2], e.dz[3], e.l, q, EI));

  const supports: SupportResult[] = m.supportNode.map((i, k) => {
    const lv = (m.hv * m.x[i]) / L, z = vert.d[2 * i];
    const reaction = active[i] && m.kind[i] !== "ground" ? vert.res[2 * i] : 0;
    return { index: k + 1, x: m.x[i], level: lv, z, gap: z - lv, reaction, active: reaction > 0, sharedWithGround: m.kind[i] === "shared" };
  });
  const fm = fieldMaxima(els, N, q);
  const maxStress = (c * fm.Mres) / I, verticalStress = (c * fm.MvAbs) / I;
  const combinedMax = N / A + maxStress;
  const finite = [N, maxStress, combinedMax, endReaction, ...vert.d, ...vert.res, ...lat.d, ...lat.res].every(Number.isFinite);
  if (!finite) messages.push("Non-finite value in the restrained solution");
  const moment = forceScale * L;
  const success: BiaxialSuccess = {
    status: "ok", input, L,
    nodes: m.x.map((x, i) => ({ x, z: vert.d[2 * i], theta: vert.d[2 * i + 1] })),
    members, supports,
    endReactions: { left: { force: vert.res[0], couple: vert.res[1] }, right: { force: vert.res[nd - 2], couple: vert.res[nd - 1] } },
    critical: { x: fm.x, memberIndex: Math.min(Ne - 1, Math.floor(fm.x / h)), Mv: fm.Mv, Ml: fm.Ml, Mres: fm.Mres, sigma: maxStress, ...fibreAngles(fm.Mv, fm.Ml, 1e-12 * Math.max(moment, 1)) },
    maxStress, sigmaAllow, bendingCriterionMet: maxStress <= sigmaAllow,
    numericalValid: finite && contactValid && eq.ok && compatOk && ax.ok, physicalValidity: "not-assessed",
    diagnostics: {
      converged: ax.ok, iterations: ax.contactIterations, contactValid, scales: { force: forceScale, moment, displacement: dispScale },
      residuals, residualTolerances, normalizedResiduals: normalizeResiduals(residuals, forceScale, L), equilibriumOk: eq.ok, tolDisp, tolForce, messages,
    },
    axial: {
      N, sigmaAxial: N / A, bendingMax: maxStress, combinedMax, combinedX: fm.x, combinedCriterionMet: combinedMax <= sigmaAllow,
      criterionUncertain: false, strain: N / (E * A), maxSlope: fm.slope, compatibilityResidual: ax.compat, compatibilityTolerance: ax.tolN,
      axialIterations: ax.iterations, elements: Ne, refinement: [], precisionLoss: !eq.ok, longitudinalReaction: N,
      lateral: {
        nodes: m.x.map((_, i) => ({ y: lat.d[2 * i], theta: lat.d[2 * i + 1] })),
        endActions: els.map((e) => e.al as [number, number, number, number]),
        endReactions: { left: { force: lat.res[0], couple: lat.res[1] }, right: { force: lat.res[nd - 2], couple: lat.res[nd - 1] } },
      },
    },
  };
  return {
    success, verticalStress, precisionLoss: !eq.ok, pen,
    ground: { totalReaction: nodal, combinedReaction: combined, endReaction, contactTotal: nodal + combined + endReaction, contactZones: zones, contactPoints, contactNodes },
  };
}
