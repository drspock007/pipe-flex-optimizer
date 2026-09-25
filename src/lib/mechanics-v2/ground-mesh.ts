// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Beam mesh for the ground branch: installed supports are mesh nodes exactly,
// each span is split into perSpan exact Hermite members. One obstacle per node
// (the dominant one): no redundant constraint, no singular matrix.
// Ground contact is represented by discrete nodal forces: between two contact
// nodes the member carries q and its own end actions, so the reconstructed
// (quartic) field is exactly the one of the loads actually represented. Its
// inter-node sag and moment vanish with refinement and are checked.

import { BandMatrix, bandSolve } from "./banded";
import { memberLoad, memberStiffness } from "./beam-member";
import { rootsInUnit } from "./roots";

export type NodeKind = "end" | "ground" | "support" | "shared";

export interface GroundMesh {
  x: number[]; kind: NodeKind[]; level: number[]; supportNode: number[];
  K: BandMatrix; EI: number; q: number; L: number; hv: number; groundZ: number;
  endOnGround: [boolean, boolean];
}

export function buildGroundMesh(L: number, hv: number, EI: number, q: number, n: number, groundZ: number, perSpan: number, tolDisp: number): GroundMesh {
  const N = (n + 1) * perSpan;
  const x = Array.from({ length: N + 1 }, (_, i) => (i * L) / N);
  x[N] = L;
  const supportNode = Array.from({ length: n }, (_, s) => (s + 1) * perSpan);
  const kind: NodeKind[] = x.map((_, i) => (i === 0 || i === N ? "end" : "ground"));
  const level = x.map(() => groundZ);
  supportNode.forEach((i) => {
    const ls = (hv * x[i]) / L;
    if (Math.abs(ls - groundZ) <= tolDisp) { kind[i] = "shared"; level[i] = Math.max(ls, groundZ); }
    else if (ls > groundZ) { kind[i] = "support"; level[i] = ls; }
  });
  const K = new BandMatrix(2 * (N + 1), 3);
  for (let e = 0; e < N; e++) {
    const ke = memberStiffness(EI, x[e + 1] - x[e]);
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) K.add(2 * e + a, 2 * e + b, ke[a][b]);
  }
  const endOnGround: [boolean, boolean] = [Math.abs(groundZ) <= tolDisp, Math.abs(hv - groundZ) <= tolDisp];
  return { x, kind, level, supportNode, K, EI, q, L, hv, groundZ, endOnGround };
}

/** True when node i rests on the ground (ends: imposed level equals the ground). */
export function onGround(m: GroundMesh, active: boolean[], i: number): boolean {
  const N = m.x.length - 1;
  if (i === 0) return m.endOnGround[0];
  if (i === N) return m.endOnGround[1];
  return active[i] && m.kind[i] !== "support";
}

export interface GroundState { d: number[]; res: number[]; F: number[] }

/** Solve with the active nodes prescribed at their obstacle level. res = K d - F. */
export function solveGroundState(m: GroundMesh, active: boolean[]): GroundState {
  const N = m.x.length - 1, nd = 2 * (N + 1);
  const F = new Array<number>(nd).fill(0);
  for (let e = 0; e < N; e++) {
    const fe = memberLoad(m.q, m.x[e + 1] - m.x[e]);
    for (let a = 0; a < 4; a++) F[2 * e + a] += fe[a];
  }
  const d = new Array<number>(nd).fill(NaN);
  d[0] = 0; d[1] = 0; d[nd - 2] = m.hv; d[nd - 1] = 0;
  for (let i = 1; i < N; i++) if (active[i]) d[2 * i] = m.level[i];
  const free: number[] = [];
  const map = new Int32Array(nd).fill(-1);
  for (let i = 0; i < nd; i++) if (Number.isNaN(d[i])) { map[i] = free.length; free.push(i); }
  const R = new BandMatrix(free.length, 3);
  const rhs = free.map((i) => F[i]);
  free.forEach((i, a) => {
    for (let j = Math.max(0, i - 3); j <= Math.min(nd - 1, i + 3); j++) {
      const k = m.K.get(i, j);
      if (k === 0) continue;
      if (map[j] < 0) rhs[a] -= k * d[j];
      else if (j >= i) R.add(a, map[j], k);
    }
  });
  const df = free.length ? bandSolve(R, rhs) : [];
  free.forEach((i, a) => (d[i] = df[a]));
  const res = d.map((_, i) => {
    let s = -F[i];
    for (let j = Math.max(0, i - 3); j <= Math.min(nd - 1, i + 3); j++) s += m.K.get(i, j) * d[j];
    return s;
  });
  return { d, res, F };
}

/** Sum of |K_ij d_j| + |F_i| for row i (round-off scale of the residual, same unit as row i). */
export function rowMagnitude(m: GroundMesh, s: GroundState, i: number): number {
  let v = Math.abs(s.F[i]);
  const nd = s.d.length;
  for (let j = Math.max(0, i - 3); j <= Math.min(nd - 1, i + 3); j++) v += Math.abs(m.K.get(i, j) * s.d[j]);
  return v;
}

/** Exact minimum of z over one member (quartic), from its end values and load qe. */
export function memberMinZ(zi: number, ti: number, zj: number, tj: number, l: number, qe: number, EI: number): number {
  const Q = (qe * l ** 4) / (24 * EI);
  const c = [zi, ti * l, -3 * zi - 2 * ti * l + 3 * zj - tj * l - Q, 2 * zi + ti * l - 2 * zj + tj * l + 2 * Q, -Q];
  const z = (u: number) => c.reduceRight((acc, v) => acc * u + v, 0);
  const cand = [0, 1, ...rootsInUnit([c[1], 2 * c[2], 3 * c[3], 4 * c[4]])];
  return Math.min(...cand.map(z));
}
