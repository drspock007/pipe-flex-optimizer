import { it } from "vitest";
import { searchHeightFixedSupports, solveBiaxialFixedLength } from "@/lib/mechanics-v2";
import { REF } from "@/lib/mechanics-v2/__tests__/helpers";
it("x", () => {
  const { hv: _h, numSupports: _n, ...b } = REF;
  for (const [n, hl] of [[0,0],[0,1000],[1,0],[1,1000],[2,0],[5,300],[10,0],[20,0]]) {
    const r = searchHeightFixedSupports({ ...b, hl }, n);
    console.log(n, hl, r.status, r.status==="ok"? JSON.stringify(r.ranges): (r as any).message, (r as any).diagnostics?.regimeCount, (r as any).diagnostics?.elapsedMs?.toFixed(1));
    if (r.status==="ok") { const h=r.extremes.max; const s=solveBiaxialFixedLength({...REF, hv:h, hl, numSupports:n}); console.log(" solve at max", s.status==="ok" && s.maxStress); }
  }
});
