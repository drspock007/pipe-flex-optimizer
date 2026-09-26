// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Shared adaptive 1-D sampler of the ground searches (Find h, Find L, V2-6/V2-7).
// It works on an abstract coordinate u (Find h: u = hv; Find L: u = ln L). The
// sample field "hv" of HeightSample stores that coordinate here.
//  1. Uniform grid of `grid` intervals over [lo, hi] (cached evaluations).
//  2. Adaptive refinement (ground-height-build.ts): verdict changes bisected down
//     to tol; same-verdict intervals split until estimated covered or minStep.
//  3. Budget (evaluations, time): exhaustion flags unexplored parts as "budget".
// Stress is never assumed monotone or convex; coverage is never certified.

import { assemble, needsSplit, slopeBound } from "./ground-height-build";
import { GH_SLOPE_SAFETY, HeightSample } from "./ground-height-types";

export interface SamplerSpec {
  lo: number; hi: number; grid: number; minStep: number; tol: number;
  maxEvaluations: number; maxMs: number; sigmaAllow: number;
  evaluate: (u: number) => Omit<HeightSample, "hv">;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function runSampler(p: SamplerSpec) {
  const t0 = now(), map = new Map<number, HeightSample>();
  let exhausted = false;
  const evalAt = (u: number): HeightSample | null => {
    const c = map.get(u);
    if (c) return c;
    if (map.size >= p.maxEvaluations || now() - t0 > p.maxMs) { exhausted = true; return null; }
    const s = { hv: u, ...p.evaluate(u) };
    map.set(u, s);
    return s;
  };
  const W = p.hi - p.lo;
  if (W === 0) evalAt(p.lo);
  else for (let i = 0; i <= p.grid; i++) if (evalAt(i === p.grid ? p.hi : p.lo + (W * i) / p.grid) === null) break;

  const sorted = () => [...map.values()].sort((a, b) => a.hv - b.hv);
  const sa = p.sigmaAllow;
  for (let changed = true; changed && !exhausted; ) {
    changed = false;
    const s = sorted(), S = slopeBound(s, sa, p.minStep, GH_SLOPE_SAFETY);
    for (let i = 0; i + 1 < s.length; i++) {
      if (!needsSplit(s, i, sa, S, p.tol, p.minStep)) continue;
      if (evalAt(0.5 * (s[i].hv + s[i + 1].hv)) === null) break;
      changed = true;
    }
  }
  const s = sorted(), S = slopeBound(s, sa, p.minStep, GH_SLOPE_SAFETY);
  const pending: [number, number][] = exhausted
    ? s.slice(0, -1).flatMap((a, i) => (needsSplit(s, i, sa, S, p.tol, p.minStep) ? [[a.hv, s[i + 1].hv] as [number, number]] : []))
    : [];
  if (exhausted && s.length && s[s.length - 1].hv < p.hi) pending.push([s[s.length - 1].hv, p.hi]); // unexplored tail
  const { zones, ranges } = assemble(s, sa, S, p.minStep, pending);
  return {
    samples: s, zones, ranges, exhausted, elapsedMs: now() - t0,
    uncertain: s.filter((x) => x.cls === "uncertain").length, failed: s.filter((x) => x.cls === "failed").length,
  };
}
