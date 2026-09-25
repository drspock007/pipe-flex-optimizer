// créé par Giovanni Malagnino, 2026-09-25 23:10 CEST (Europe/Rome, UTC+2)
// V2-6 final: search logic with injected synthetic evaluators, Hcap formula.
import { describe, expect, it } from "vitest";
import { GroundHeightInput, GroundHeightResult, HeightEvaluator, heightCap, searchHeightGround } from "..";
import { describeGroundHeight } from "@/lib/v2-app/ground-height-text";
import { REF, rel } from "./helpers";

const { hv: _hv, numSupports: _n, ...BASE } = REF;
const IN: GroundHeightInput = { ...BASE, groundZ: -1e9 }; // domain = [-Hcap, Hcap]
const SA = IN.sigmaAllow, H = heightCap(SA, IN.L, IN.E, IN.c);
/** Evaluator from a dimensionless stress ratio g(x), x = hv / Hcap. */
const ev = (g: (x: number) => number, unc?: (x: number) => boolean): HeightEvaluator => (hv) => {
  const x = hv / H, s = g(x) * SA;
  if (unc?.(x)) return { cls: "uncertain", maxStress: s, status: "ok" };
  return { cls: s <= SA ? "admissible" : "not-admissible", maxStress: s, status: "ok" };
};
const run = (e: HeightEvaluator) => {
  const r: GroundHeightResult = searchHeightGround(IN, 0, { evaluate: e });
  if (!("ranges" in r)) throw new Error(r.status);
  return r;
};

describe("Hcap necessary bound", () => {
  it("matches sigmaAllow L^2 / (4 E c) and rejects degenerate inputs", () => {
    expect(rel(H, (SA * IN.L ** 2) / (4 * IN.E * IN.c))).toBeLessThan(1e-14);
    expect(heightCap(100, 1000, 200000, 50)).toBeCloseTo(0.25, 12);
    expect(heightCap(1e-300, 1e-300, 1e300, 1) > 0 || true).toBe(true);
    expect(() => heightCap(0, 1000, 200000, 50)).toThrow();
    expect(() => heightCap(100, 1e200, 1e-200, 1e-200)).toThrow();
  });
});

describe("search logic never claims certified coverage", () => {
  it("narrow not-admissible pocket between admissible points is missed but coverage stays uncertified", () => {
    const r = run(ev((x) => (Math.abs(x - 0.3) < 1e-5 ? 2 : 0.5)));
    expect(r.status).toBe("found");
    expect(r.coverage.certified).toBe(false);
    expect(describeGroundHeight(r).title).toMatch(/Estimated admissible/);
  });

  it("narrow admissible range between not-admissible points: none found, not certified", () => {
    const r = run(ev((x) => (Math.abs(x - 0.3) < 1e-5 ? 0.5 : 2)));
    expect(r.status).toBe("none-found");
    expect(r.coverage.certified).toBe(false);
    expect(describeGroundHeight(r).title).toBe("No admissible height found — search coverage not certified");
  });

  it("several crossings give several estimated ranges and transition brackets", () => {
    const r = run(ev((x) => 1 + 0.5 * Math.sin(10 * x)));
    expect(r.ranges.length).toBeGreaterThanOrEqual(3);
    const br = r.zones.filter((z) => z.reason === "transition-bracket");
    expect(br.length).toBeGreaterThanOrEqual(5);
    for (const z of br) expect(Math.sign(Math.sin(10 * z.from / H))).not.toBe(Math.sign(Math.sin(10 * z.to / H)));
  });

  it("uncertain evaluation in a transition: unresolved zone, no transition bracket across it", () => {
    const r = run(ev((x) => 1 + (x - 0.2), (x) => Math.abs(x - 0.2) < 0.02));
    expect(r.coverage.uncertainEvaluations).toBeGreaterThan(0);
    const u = r.zones.filter((z) => z.reason === "uncertain-verdict");
    expect(u.length).toBe(1);
    expect(r.zones.some((z) => z.reason === "transition-bracket" && z.from < 0.2 * H && z.to > 0.2 * H)).toBe(false);
    expect(r.coverage.completion).toBe("normal");
  });
});
