// créé par Giovanni Malagnino, 2026-09-26 17:55 CEST (Europe/Rome, UTC+2)
// Shared exploratory length sampling (V2-7 ground, V2-11 restrained): the
// adaptive sampler (ground-sampler.ts) on u = ln L over the SAMPLED domain
// [Ls, Lmax], mapped back to L. Domain-edge flags refer to the REQUESTED domain
// [Lmin, Lmax]: a sampled lower bound raised by a necessary condition is not a
// requested domain edge. Identical evaluations are memoized.

import { runSampler } from "./ground-sampler";
import type { HeightSample } from "./ground-height-types";
import type { GroundLengthRange, LengthSample } from "./ground-length-types";

export type LengthClassifier = (L: number) => Omit<HeightSample, "hv">;

export interface LengthSamplingOptions {
  Lmin: number; // requested lower edge (mm)
  Ls: number; // sampled lower edge (mm), >= Lmin
  Lmax: number; // requested and sampled upper edge (mm)
  grid: number; minStepDiv: number; maxEvaluations: number; maxMs: number; sigmaAllow: number;
  evaluate: LengthClassifier;
}

export function sampleLengths(o: LengthSamplingOptions) {
  const lo = Math.log(o.Ls), hi = Math.log(o.Lmax), W = hi - lo;
  const minStep = W / o.minStepDiv, tol = Math.max(1e-6 * W, 1e-7);
  const toL = (u: number) => (u === lo ? o.Ls : u === hi ? o.Lmax : Math.exp(u));
  const memo = new Map<number, Omit<HeightSample, "hv">>();
  const r = runSampler({ lo, hi, grid: o.grid, minStep, tol, maxEvaluations: o.maxEvaluations, maxMs: o.maxMs, sigmaAllow: o.sigmaAllow,
    evaluate: (u) => { const L = toL(u); let c = memo.get(L); if (!c) { c = o.evaluate(L); memo.set(L, c); } return c; } });
  const samples: LengthSample[] = r.samples.map(({ hv: u, ...s }) => ({ L: toL(u), ...s }));
  const isEdge = (u: number) => (u === lo && o.Ls === o.Lmin) || u === hi;
  const b = (x: { value: number; bracket: number | null; domainEdge: boolean }) =>
    ({ value: toL(x.value), included: true as const, bracket: x.bracket === null ? null : toL(x.bracket), domainEdge: x.domainEdge && isEdge(x.value) });
  const ranges: GroundLengthRange[] = r.ranges.map((g) => ({ lower: b(g.lower), upper: b(g.upper) }));
  const adm = samples.filter((s) => s.cls === "admissible");
  const boundaryHits: ("lower" | "upper")[] = [];
  if (samples[0]?.cls === "admissible" && samples[0].L === o.Lmin) boundaryHits.push("lower");
  const last = samples[samples.length - 1];
  if (last?.cls === "admissible" && last.L === o.Lmax) boundaryHits.push("upper");
  return {
    exhausted: r.exhausted, elapsedMs: r.elapsedMs, samples, ranges, boundaryHits,
    zones: r.zones.map((z) => ({ ...z, from: toL(z.from), to: toL(z.to) })),
    admissible: adm,
    largestFound: adm.length ? adm[adm.length - 1].L : null,
    lowestStress: adm.reduce<LengthSample | null>((m, s) => (m === null || (s.maxStress as number) < (m.maxStress as number) ? s : m), null),
    diagnostics: { evaluations: samples.length, elapsedMs: r.elapsedMs, boundaryTolRel: Math.expm1(tol), minStepRel: Math.expm1(minStep), maxEvaluations: o.maxEvaluations, maxMs: o.maxMs },
    coverage: { certified: false as const, completion: r.exhausted ? "resource-limit" as const : "normal" as const, uncertainEvaluations: r.uncertain, failedEvaluations: r.failed },
  };
}
