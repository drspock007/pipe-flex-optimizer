// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Active-set resolution of the nodal unilateral contacts of the ground branch
// (no penalty). Deterministic single exchange: the most negative reaction
// leaves first; otherwise the most penetrating node enters (lowest index on ties).

import { GROUND_ENTER_REL } from "./ground-types";
import { GroundMesh, GroundState, memberMinZ, onGround, solveGroundState } from "./ground-mesh";

export interface ActiveSetOutcome {
  state: GroundState; active: boolean[]; converged: boolean; iterations: number; message: string;
}

export function solveGroundContact(m: GroundMesh, init: boolean[], tolDisp: number, tolForce: number, maxIter: number): ActiveSetOutcome {
  const N = m.x.length - 1;
  const active = init.slice();
  let iterations = 0;
  while (iterations < maxIter) {
    iterations++;
    const state = solveGroundState(m, active);
    let leave = -1, rMin = -tolForce;
    for (let i = 1; i < N; i++) if (active[i] && state.res[2 * i] < rMin) { rMin = state.res[2 * i]; leave = i; }
    if (leave >= 0) { active[leave] = false; continue; }
    // Strict admission: a looser threshold lets nodes penetrate by up to tolDisp,
    // which freezes a spurious alternating pattern (numerical plateau).
    let enter = -1, gMin = -GROUND_ENTER_REL * tolDisp;
    for (let i = 1; i < N; i++) {
      if (active[i]) continue;
      const g = state.d[2 * i] - m.level[i];
      if (g < gMin) { gMin = g; enter = i; }
    }
    if (enter >= 0) { active[enter] = true; continue; }
    return { state, active, converged: true, iterations, message: "converged" };
  }
  return { state: solveGroundState(m, active), active, converged: false, iterations, message: `Ground active set did not converge within ${maxIter} iterations` };
}

/** Warm start on the doubled mesh: old nodes keep their status, new mid-nodes
 *  are active when both neighbours rested on the ground. */
export function refineActive(prev: GroundMesh, active: boolean[]): boolean[] {
  const N = prev.x.length - 1;
  const out = new Array<boolean>(2 * N + 1).fill(false);
  for (let i = 0; i <= N; i++) out[2 * i] = active[i] && i > 0 && i < N;
  for (let e = 0; e < N; e++) out[2 * e + 1] = onGround(prev, active, e) && onGround(prev, active, e + 1);
  return out;
}

/** Max penetration below the ground level, including interior minima of each member (mm). */
export function maxPenetration(m: GroundMesh, s: GroundState): number {
  let pen = 0;
  for (let e = 0; e < m.x.length - 1; e++) {
    const [zi, ti, zj, tj] = s.d.slice(2 * e, 2 * e + 4);
    const zMin = memberMinZ(zi, ti, zj, tj, m.x[e + 1] - m.x[e], m.q, m.EI);
    pen = Math.max(pen, m.groundZ - zMin);
  }
  return pen;
}
