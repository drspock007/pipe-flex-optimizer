// créé par Giovanni Malagnino, 2026-09-26 05:05 CEST (Europe/Rome, UTC+2)
// V2-7-R1 exact path when the ground is inactive. The installed-support problem
// is solved WITHOUT ground by the exact member solver (solve.ts, one exact
// Hermite+quartic member per span). If the exact deflected shape stays above
// the ground by more than the penetration tolerance on EVERY member (exact
// interior minima, not plotted points), the ground carries no load and this
// solution is the exact solution of the contact problem (convex problem, zero
// ground multiplier). No mesh is involved, hence no mesh convergence claimed.
// Ends lying on the ground (e.g. groundZ = 0) are cleared by a strictly positive
// curvature margin at the end. Any ambiguous case returns null (mesh path).

import { solveBiaxialFixedLength } from "./solve";
import { rootsInUnit } from "./roots";
import { BiaxialSuccess, MemberResult } from "./types";
import type { GroundInput } from "./ground-solve";

/** minClearance = TRUE global minimum of z - groundZ over [0, L] (ends included,
 *  exact member minima); ok = contact excluded: every position except an end
 *  lying on the ground clears it by > tolAmb (mm), and such an end has a
 *  strictly positive curvature margin. */
export interface ExactClearance { minClearance: number; ok: boolean }

export function exactClearance(r: BiaxialSuccess, groundZ: number, tolAmb: number, tolDisp: number): ExactClearance {
  const onL = Math.abs(groundZ) <= tolDisp, onR = Math.abs(r.input.hv - groundZ) <= tolDisp;
  const last = r.members.length - 1;
  let minAll = Infinity, minCheck = Infinity, ok = true;
  r.members.forEach((mb: MemberResult, e) => {
    const [zi, ti, zj, tj] = mb.nodalDisplacements, l = mb.length;
    const Q = (mb.q * l ** 4) / (24 * mb.EI);
    const c = [zi, ti * l, -3 * zi - 2 * ti * l + 3 * zj - tj * l - Q, 2 * zi + ti * l - 2 * zj + tj * l + 2 * Q, -Q];
    const z = (u: number) => c.reduceRight((acc, v) => acc * u + v, 0);
    const skip0 = e === 0 && onL, skip1 = e === last && onR;
    // Curvature margin at an end lying on the ground: z ~ g + k u^2 near it.
    if (skip0) ok = ok && c[2] > tolAmb;
    if (skip1) ok = ok && c[2] + 3 * c[3] + 6 * c[4] > tolAmb;
    for (const u of [0, 1, ...rootsInUnit([c[1], 2 * c[2], 3 * c[3], 4 * c[4]])]) {
      const g = z(u) - groundZ;
      minAll = Math.min(minAll, g); // published value: nothing excluded
      if (!(skip0 && u < 1e-6) && !(skip1 && u > 1 - 1e-6)) minCheck = Math.min(minCheck, g); // decision only
    }
  });
  if (!Number.isFinite(minAll)) return { minClearance: NaN, ok: false };
  return { minClearance: minAll, ok: ok && (minCheck > tolAmb || minCheck === Infinity) };
}

/** Exact ground-inactive solution, or null when contact cannot be excluded. */
export function tryExactNoContact(input: GroundInput, tolAmb: number, tolDisp: number): BiaxialSuccess | null {
  const { groundZ, hv, numSupports: n, L } = input;
  // A support at the ground level shares an obstacle: leave it to the mesh path.
  for (let i = 1; i <= n; i++) if (Math.abs((hv * i) / (n + 1) - groundZ) <= tolDisp) return null;
  const r = solveBiaxialFixedLength(input);
  if (r.status !== "ok" || !r.numericalValid) return null;
  const cl = exactClearance(r, groundZ, tolAmb, tolDisp);
  if (!cl.ok || !Number.isFinite(cl.minClearance)) return null;
  const onL = Math.abs(groundZ) <= tolDisp, onR = Math.abs(hv - groundZ) <= tolDisp;
  const endReaction = (onL ? r.endReactions.left.force : 0) + (onR ? r.endReactions.right.force : 0);
  const zones = [...(onL ? [{ xStart: 0, xEnd: 0 }] : []), ...(onR ? [{ xStart: L, xEnd: L }] : [])];
  return {
    ...r,
    supports: r.supports.map((s) => ({ ...s, sharedWithGround: false })),
    ground: {
      level: groundZ, totalReaction: 0, combinedReaction: 0, endReaction, contactTotal: endReaction,
      precisionLoss: false, contactZones: zones, contactPoints: [], criterionUncertain: false, contactNodes: 0,
      maxPenetration: 0, tolPenetration: tolAmb, refinement: [], converged: true, elements: r.members.length,
      method: "exact-no-contact", minClearance: cl.minClearance,
    },
  };
}
