import { it } from "vitest";
import { solveGroundFixedLength } from "@/lib/mechanics-v2";
import { REF } from "@/lib/mechanics-v2/__tests__/helpers";
it("p", () => {
  for (const [hv,n] of [[0,0],[0,3]]) for (const m of [64,128,256,512,1024]) {
    const r:any = solveGroundFixedLength({ ...REF, hv, hl:0, numSupports:n, groundZ:0 }, {minElements:m,maxElements:m});
    const d=r.diagnostics; console.log(hv,n,m,r.status,JSON.stringify(d?.residuals),JSON.stringify(d?.residualTolerances), JSON.stringify(r.refinement?.[0]));
  }
});
