// créé par Giovanni Malagnino, 2026-09-25 21:15 CEST (Europe/Rome, UTC+2)
// V2-5 finalisation: signed clamp reaction at ground level, strict equilibrium flag, shared labels/units.

import { describe, expect, it } from "vitest";
import { solveGroundFixedLength } from "..";
import { groundReactionRows } from "@/lib/v2-app/ground-labels";
import { formatMomentPair } from "@/lib/unit-conversions";

const D = 114.3, t = 4.78, d = D - 2 * t;
const I = (Math.PI / 64) * (D ** 4 - d ** 4), A = (Math.PI / 4) * (D ** 2 - d ** 2);

describe("ground finalisation", () => {
  const r = solveGroundFixedLength({ L: 30000, hv: 2500, hl: 0, E: 207000, A, I, c: D / 2, q: 0.1298229279719568, sigmaAllow: 305.15, numSupports: 2, axialMode: "free", groundZ: 0 });

  it("two supports, ground at 0: zero ground reaction, negative left clamp kept signed", () => {
    if (r.status !== "ok") throw new Error(r.status);
    const g = r.ground!;
    expect(Math.abs(r.maxStress - 295.7513)).toBeLessThan(1e-3);
    expect(g.totalReaction).toBe(0);
    expect(Math.abs(g.endReaction - -953.955)).toBeLessThan(1e-2);
    expect(g.contactTotal).toBeCloseTo(g.totalReaction + g.combinedReaction + g.endReaction, 9);
    const rows = groundReactionRows(g, (v) => v.toFixed(3));
    expect(rows.map((x) => x[0])).toEqual(["Ground reaction", "Clamped end(s) at ground level", "Sum of vertical reactions at ground level (including clamps)"]);
    expect(rows[1][1]).toBe(g.endReaction.toFixed(3));
    expect(rows[2][2]).toBe("= ground + clamps");
  });

  it("equilibriumOk reflects the strict mechanical check; round-off kept separately", () => {
    if (r.status !== "ok") throw new Error(r.status);
    const dg = r.diagnostics;
    expect(dg.roundoffTolerances).toBeDefined();
    const strictOk = (Object.keys(dg.residuals) as (keyof typeof dg.residuals)[]).every((k) => dg.residuals[k] <= dg.residualTolerances[k]);
    expect(dg.equilibriumOk).toBe(strictOk);
    expect(r.ground!.precisionLoss).toBe(!dg.equilibriumOk);
  });

  it("moments share one SI/imperial conversion", () => {
    expect(formatMomentPair(1.35582e6, -2 * 1.35582e6, "Imperial")).toBe("1.00 / -2.00 kip·ft");
    expect(formatMomentPair(1e6, 0, "SI")).toBe("1.00 / 0.00 kN·m");
  });
});
