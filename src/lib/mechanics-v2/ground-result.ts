// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Builds a BiaxialSuccess (plus ground data) from one converged mesh state.
// Nodal ground reactions are discrete forces, not contact pressures.

import { BiaxialInput, BiaxialSuccess, EquilibriumSet, MemberResult, SupportResult } from "./types";
import { memberEndActions } from "./beam-member";
import { fibreAngles, memberMaximum } from "./biaxial";
import { checkEquilibrium, equilibriumTolerances, normalizeResiduals } from "./equilibrium";
import { GroundMesh, GroundState, onGround, rowMagnitude } from "./ground-mesh";

/** ~500 machine epsilons (dimensionless), applied to the summed term magnitudes. */
const ROUNDOFF_REL = 1e-13;
const ZONE_MERGE_ELEMENTS = 3;
import { ContactZone, GroundReport } from "./ground-types";

export interface LevelResult {
  success: BiaxialSuccess;
  ground: Omit<GroundReport, "refinement" | "converged" | "tolPenetration" | "elements" | "precisionLoss">;
  /** Max vertical-plane bending stress c*max|Mv|/I (MPa), independent of hl. */
  verticalStress: number;
  /** True when the round-off share of a residual tolerance exceeds its mechanical budget. */
  precisionLoss: boolean;
}

export function buildLevelResult(
  input: BiaxialInput, m: GroundMesh, s: GroundState, active: boolean[],
  scales: { force: number; displacement: number }, tolDisp: number, tolForce: number, iterations: number, maxPen: number,
): LevelResult {
  const { L, I, c, q, hl, sigmaAllow } = input;
  const N = m.x.length - 1, nd = 2 * (N + 1), EI = m.EI;
  const members: MemberResult[] = m.x.slice(0, -1).map((x0, e) => {
    const length = m.x[e + 1] - x0, qe = q;
    const de = s.d.slice(2 * e, 2 * e + 4) as [number, number, number, number];
    const [Fi, Ci, Fj, Cj] = memberEndActions(EI, qe, length, de);
    return { index: e, xStart: x0, length, nodalDisplacements: de, endActions: { Fi, Ci, Fj, Cj }, EI, q: qe };
  });
  let nodal = 0, combined = 0, contactNodes = 0, sumF = 0, sumM = 0, translation = 0, rotation = 0;
  for (let i = 1; i < N; i++) {
    const r = s.res[2 * i];
    rotation = Math.max(rotation, Math.abs(s.res[2 * i + 1]));
    if (!active[i]) { translation = Math.max(translation, Math.abs(r)); continue; }
    sumF += r; sumM += r * m.x[i];
    if (m.kind[i] === "ground") { nodal += r; contactNodes++; }
    else if (m.kind[i] === "shared") { combined += r; contactNodes++; }
  }
  sumF += s.res[0] + s.res[nd - 2];
  sumM += s.res[1] + s.res[nd - 1] + s.res[nd - 2] * L;
  const residuals: EquilibriumSet = { translation, rotation, globalForce: Math.abs(sumF - q * L), globalMoment: Math.abs(sumM - (q * L * L) / 2) };
  // Round-off-aware tolerances: 1e-7 of the scale plus ROUNDOFF_REL times the
  // magnitude of the terms summed in K d - F (fine meshes cancel large terms).
  const base = equilibriumTolerances(scales.force, L);
  let magT = 0, magR = 0, sumMagF = 0, sumMagM = 0;
  for (let i = 0; i <= N; i++) {
    const mt = rowMagnitude(m, s, 2 * i), mr = rowMagnitude(m, s, 2 * i + 1);
    magT = Math.max(magT, mt); magR = Math.max(magR, mr);
    sumMagF += mt; sumMagM += mt * m.x[i] + mr;
  }
  const residualTolerances: EquilibriumSet = {
    translation: base.translation + ROUNDOFF_REL * magT, rotation: base.rotation + ROUNDOFF_REL * magR,
    globalForce: base.globalForce + ROUNDOFF_REL * sumMagF, globalMoment: base.globalMoment + ROUNDOFF_REL * sumMagM,
  };
  const eq = checkEquilibrium(residuals, residualTolerances);
  // The round-off estimate explains residuals but never accepts them: a
  // residual above the mechanical budget (1e-7 of the scale) is precision loss.
  const precisionLoss = (Object.keys(base) as (keyof EquilibriumSet)[]).some((k) => residuals[k] > base[k]);

  const supports: SupportResult[] = m.supportNode.map((i, k) => {
    const lv = (m.hv * m.x[i]) / L, z = s.d[2 * i];
    const reaction = active[i] && m.kind[i] !== "ground" ? s.res[2 * i] : 0;
    return { index: k + 1, x: m.x[i], level: lv, z, gap: z - lv, reaction, active: reaction > 0, sharedWithGround: m.kind[i] === "shared" };
  });
  const messages = [...eq.failures];
  if (precisionLoss) messages.push("Equilibrium residual above the mechanical budget (1e-7 of scale): precision loss from round-off");
  let contactValid = true;
  for (let i = 1; i < N; i++) {
    const g = s.d[2 * i] - m.level[i], r = active[i] ? s.res[2 * i] : 0;
    if (g < -tolDisp || r < -tolForce) { contactValid = false; messages.push(`Contact condition violated at node ${i}`); }
  }
  const zones: ContactZone[] = [];
  for (let i = 0; i <= N; i++) {
    if (!onGround(m, active, i)) continue;
    // Estimated zones: contact nodes separated by at most ZONE_MERGE_ELEMENTS
    // elements are merged (discrete contact alternates with near-zero gaps).
    const last = zones[zones.length - 1], h = m.x[1] - m.x[0];
    if (last && m.x[i] - last.xEnd <= ZONE_MERGE_ELEMENTS * h * (1 + 1e-9)) last.xEnd = m.x[i];
    else zones.push({ xStart: m.x[i], xEnd: m.x[i] });
  }

  let critical = { x: 0, memberIndex: 0, Mv: 0, Ml: 0, Mres: -1 };
  members.forEach((mb) => {
    const mm = memberMaximum(mb, L, hl);
    if (mm.Mres > critical.Mres) critical = { x: mb.xStart + mm.xi, memberIndex: mb.index, Mv: mm.Mv, Ml: mm.Ml, Mres: mm.Mres };
  });
  const maxStress = (c * critical.Mres) / I;
  const verticalStress = (c * Math.max(...members.map((mb) => memberMaximum(mb, L, 0).Mres))) / I;
  // Ends coinciding with the ground: the clamp and the neighbouring contact
  // nodes share one obstacle, so only their sum is mesh-independent.
  const endReaction = (m.endOnGround[0] ? s.res[0] : 0) + (m.endOnGround[1] ? s.res[nd - 2] : 0);
  const finite = [maxStress, verticalStress, endReaction, nodal, combined, ...s.d, ...s.res].every(Number.isFinite);
  if (!finite) messages.push("Non-finite value in the ground solution");
  const moment = scales.force * L;
  const success: BiaxialSuccess = {
    status: "ok", input, L,
    nodes: m.x.map((x, i) => ({ x, z: s.d[2 * i], theta: s.d[2 * i + 1] })),
    members, supports,
    endReactions: { left: { force: s.res[0], couple: s.res[1] }, right: { force: s.res[nd - 2], couple: s.res[nd - 1] } },
    critical: { ...critical, sigma: maxStress, ...fibreAngles(critical.Mv, critical.Ml, 1e-12 * Math.max(moment, 1)) },
    maxStress, sigmaAllow, bendingCriterionMet: maxStress <= sigmaAllow,
    numericalValid: finite && contactValid && eq.ok && !precisionLoss, physicalValidity: "not-assessed",
    diagnostics: {
      converged: true, iterations, contactValid, scales: { ...scales, moment }, residuals, residualTolerances,
      normalizedResiduals: normalizeResiduals(residuals, scales.force, L), equilibriumOk: eq.ok, tolDisp, tolForce, messages,
    },
  };
  return {
    success, verticalStress, precisionLoss,
    ground: {
      level: m.groundZ, totalReaction: nodal, combinedReaction: combined, endReaction,
      contactTotal: nodal + combined + endReaction, contactZones: zones, contactNodes, maxPenetration: maxPen,
    },
  };
}
