// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Find L with a rigid frictionless ground (V2-7). Same exploratory method as
// Find h (ground-sampler.ts) on u = ln L over [ln Lmin, ln Lmax]; each L is
// solved by the complete ground solver (mesh convergence, penetration,
// equilibrium, uncertainty). q stays fixed (total weight qL). Coverage is never
// certified; conclusions hold only within the searched domain.

import { validateInput } from "./validate";
import { GroundLimits } from "./ground-solve";
import { classifyGround } from "./ground-classify";
import { runSampler } from "./ground-sampler";
import type { HeightSample } from "./ground-height-types";
import { GL_GRID, GL_MAX_EVALUATIONS, GL_MAX_MS, GL_MIN_STEP_DIV, GroundLengthInput, GroundLengthResult, LengthSample } from "./ground-length-types";

export type LengthEvaluator = (L: number) => Omit<HeightSample, "hv">;
export interface GroundLengthLimits { maxEvaluations?: number; maxMs?: number; grid?: number; solve?: GroundLimits; evaluate?: LengthEvaluator }

export function searchLengthGround(input: GroundLengthInput, numSupports: number, limits: GroundLengthLimits = {}): GroundLengthResult {
  const { Lmin, Lmax, groundZ, hv } = input;
  const errors = validateInput({ ...input, L: 1, numSupports });
  if (typeof groundZ !== "number" || !Number.isFinite(groundZ)) errors.push("groundZ must be a finite number");
  if (!Number.isFinite(Lmin) || !Number.isFinite(Lmax) || !(Lmin > 0) || !(Lmin < Lmax)) errors.push("Search domain requires finite 0 < Lmin < Lmax");
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return { status: "not-implemented", message: 'axialMode "restrained" is available in Fixed L and Find h only: Find L and Min. supports are not available with it' };
  if (groundZ > 0 || hv < groundZ) {
    const which = [groundZ > 0 ? "left end (z = 0)" : "", hv < groundZ ? `right end (z = hv = ${hv} mm)` : ""].filter(Boolean).join(" and ");
    return { status: "geometry-incompatible", message: `Imposed ${which} below the minimum pipe-axis elevation ${groundZ} mm` };
  }
  const maxE = limits.maxEvaluations ?? GL_MAX_EVALUATIONS, maxMs = limits.maxMs ?? GL_MAX_MS;
  const lo = Math.log(Lmin), hi = Math.log(Lmax), W = hi - lo;
  const minStep = W / GL_MIN_STEP_DIV, tol = Math.max(1e-6 * W, 1e-7);
  const r = runSampler({ lo, hi, grid: limits.grid ?? GL_GRID, minStep, tol, maxEvaluations: maxE, maxMs, sigmaAllow: input.sigmaAllow,
    evaluate: (u) => { const L = u === lo ? Lmin : u === hi ? Lmax : Math.exp(u);
      return limits.evaluate ? limits.evaluate(L) : classifyGround({ ...input, L, numSupports }, limits.solve); } });
  const toL = (u: number) => (u === lo ? Lmin : u === hi ? Lmax : Math.exp(u));
  const samples: LengthSample[] = r.samples.map(({ hv: u, ...s }) => ({ L: toL(u), ...s }));
  const b = (x: { value: number; bracket: number | null; domainEdge: boolean }) => ({ value: toL(x.value), included: true as const, bracket: x.bracket === null ? null : toL(x.bracket), domainEdge: x.domainEdge && (x.value === lo || x.value === hi) });
  const ranges = r.ranges.map((g) => ({ lower: b(g.lower), upper: b(g.upper) }));
  const adm = samples.filter((s) => s.cls === "admissible");
  const boundaryHits: ("lower" | "upper")[] = [];
  if (samples[0]?.cls === "admissible" && samples[0].L === Lmin) boundaryHits.push("lower");
  const last = samples[samples.length - 1];
  if (last?.cls === "admissible" && last.L === Lmax) boundaryHits.push("upper");
  const common = {
    scope: { numSupports, hv, hl: input.hl, groundZ }, domain: { lower: Lmin, upper: Lmax }, ranges,
    zones: r.zones.map((z) => ({ ...z, from: toL(z.from), to: toL(z.to) })), samples, boundaryHits,
    largestFound: adm.length ? adm[adm.length - 1].L : null,
    lowestStress: adm.reduce<LengthSample | null>((m, s) => (m === null || (s.maxStress as number) < (m.maxStress as number) ? s : m), null),
    diagnostics: { evaluations: samples.length, elapsedMs: r.elapsedMs, boundaryTolRel: Math.expm1(tol), minStepRel: Math.expm1(minStep), maxEvaluations: maxE, maxMs },
    coverage: { certified: false as const, completion: r.exhausted ? "resource-limit" as const : "normal" as const, uncertainEvaluations: r.uncertain, failedEvaluations: r.failed },
  };
  if (r.exhausted) return { ...common, status: "incomplete", message: `Resource limit reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s): unexplored portions are reported as unresolved` };
  return { ...common, status: ranges.length ? "found" : "none-found" };
}
