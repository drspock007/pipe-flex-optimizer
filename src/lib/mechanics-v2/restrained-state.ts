// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Inner problem of the restrained solver: for a GIVEN tension N >= 0 both
// planes are linear (K + N G) and uncoupled; the vertical plane carries the
// unilateral contacts (supports and optional ground, one dominant obstacle
// per node, no penalty), the lateral plane has none. One step of iterative
// refinement with the cancellation-free element residual (restrained-element.ts)
// removes the O(eps |K| |d|) round-off of the band solve.

import { BandMatrix, bandFactor } from "./banded";
import { elementMatrixN, endActionsN } from "./restrained-element";
import { GROUND_ENTER_REL } from "./ground-types";

export type RNodeKind = "end" | "ground" | "support" | "shared" | "free";

export interface RMesh {
  x: number[]; kind: RNodeKind[]; level: number[]; supportNode: number[];
  L: number; hv: number; hl: number; EI: number; q: number; groundZ: number | null;
  endOnGround: [boolean, boolean];
}

export function buildRMesh(L: number, hv: number, hl: number, EI: number, q: number, n: number, groundZ: number | null, perSpan: number, tolDisp: number): RMesh {
  const N = (n + 1) * perSpan;
  const x = Array.from({ length: N + 1 }, (_, i) => (i * L) / N);
  x[N] = L;
  const supportNode = Array.from({ length: n }, (_, s) => (s + 1) * perSpan);
  const g = groundZ ?? -Infinity;
  const kind: RNodeKind[] = x.map((_, i) => (i === 0 || i === N ? "end" : groundZ === null ? "free" : "ground"));
  const level = x.map(() => g);
  supportNode.forEach((i) => {
    const ls = (hv * x[i]) / L;
    if (groundZ !== null && Math.abs(ls - groundZ) <= tolDisp) { kind[i] = "shared"; level[i] = Math.max(ls, groundZ); }
    else if (ls > g) { kind[i] = "support"; level[i] = ls; }
  });
  const endOnGround: [boolean, boolean] = groundZ === null ? [false, false] : [Math.abs(groundZ) <= tolDisp, Math.abs(hv - groundZ) <= tolDisp];
  return { x, kind, level, supportNode, L, hv, hl, EI, q, groundZ, endOnGround };
}

export interface PlaneState { d: number[]; res: number[] }

/** Residual (K + N G) d - F assembled from cancellation-free element end actions. */
export function planeResidual(m: RMesh, N: number, q: number, d: number[]): number[] {
  const res = new Array<number>(d.length).fill(0);
  for (let e = 0; e < m.x.length - 1; e++) {
    const a = endActionsN(m.EI, N, q, m.x[e + 1] - m.x[e], d.slice(2 * e, 2 * e + 4));
    for (let k = 0; k < 4; k++) res[2 * e + k] += a[k];
  }
  return res;
}

/** Solve one plane with prescribed DOFs (NaN = free), then one refinement step. */
export function solvePlane(m: RMesh, N: number, q: number, end: number, fixedNodes: boolean[]): PlaneState {
  const Ne = m.x.length - 1, nd = 2 * (Ne + 1);
  const d = new Array<number>(nd).fill(NaN);
  d[0] = 0; d[1] = 0; d[nd - 2] = end; d[nd - 1] = 0;
  for (let i = 1; i < Ne; i++) if (fixedNodes[i]) d[2 * i] = m.level[i];
  const map = new Int32Array(nd).fill(-1), free: number[] = [];
  for (let i = 0; i < nd; i++) if (Number.isNaN(d[i])) { map[i] = free.length; free.push(i); }
  if (!free.length) return { d, res: planeResidual(m, N, q, d) };
  const K = new BandMatrix(free.length, 3);
  const d0 = d.map((v) => (Number.isNaN(v) ? 0 : v));
  for (let e = 0; e < Ne; e++) {
    const ke = elementMatrixN(m.EI, N, m.x[e + 1] - m.x[e]);
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) {
      const i = map[2 * e + a], j = map[2 * e + b];
      if (i >= 0 && j >= 0) K.add(i, j, ke[a][b]);
    }
  }
  const solve = bandFactor(K);
  let res = planeResidual(m, N, q, d0);
  let df = solve(free.map((i) => -res[i]));
  free.forEach((i, a) => (d0[i] = df[a]));
  for (let pass = 0; pass < 2; pass++) {
    res = planeResidual(m, N, q, d0);
    df = solve(free.map((i) => -res[i]));
    free.forEach((i, a) => (d0[i] += df[a]));
  }
  return { d: d0, res: planeResidual(m, N, q, d0) };
}

export interface VerticalOutcome { state: PlaneState; active: boolean[]; converged: boolean; iterations: number }

/** Active set on the vertical nodal contacts at fixed N (same deterministic rules as the N = 0 ground branch). */
export function solveVertical(m: RMesh, N: number, init: boolean[], tolDisp: number, tolForce: number, maxIter: number): VerticalOutcome {
  const Ne = m.x.length - 1, active = init.slice();
  let iterations = 0;
  while (iterations < maxIter) {
    iterations++;
    const state = solvePlane(m, N, m.q, m.hv, active);
    let leave = -1, rMin = -tolForce;
    for (let i = 1; i < Ne; i++) if (active[i] && state.res[2 * i] < rMin) { rMin = state.res[2 * i]; leave = i; }
    if (leave >= 0) { active[leave] = false; continue; }
    let enter = -1, gMin = -GROUND_ENTER_REL * tolDisp;
    for (let i = 1; i < Ne; i++) {
      if (active[i] || m.kind[i] === "free") continue;
      const g = state.d[2 * i] - m.level[i];
      if (g < gMin) { gMin = g; enter = i; }
    }
    if (enter >= 0) { active[enter] = true; continue; }
    return { state, active, converged: true, iterations };
  }
  return { state: solvePlane(m, N, m.q, m.hv, active), active, converged: false, iterations };
}

/** Warm start on the doubled mesh (old nodes keep their status, mid-nodes when both neighbours are on the ground). */
export function refineRActive(prev: RMesh, active: boolean[]): boolean[] {
  const N = prev.x.length - 1, out = new Array<boolean>(2 * N + 1).fill(false);
  const on = (i: number) => (i === 0 ? prev.endOnGround[0] : i === N ? prev.endOnGround[1] : active[i] && prev.kind[i] !== "support");
  for (let i = 1; i < N; i++) out[2 * i] = active[i];
  for (let e = 0; e < N; e++) out[2 * e + 1] = on(e) && on(e + 1);
  return out;
}
