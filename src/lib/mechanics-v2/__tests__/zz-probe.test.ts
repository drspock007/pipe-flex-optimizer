import { it } from "vitest";
import { solveGroundFixedLength } from "@/lib/mechanics-v2";
import { REF } from "@/lib/mechanics-v2/__tests__/helpers";
it("p", () => {
  for (const [mn,mx] of [[64,2048],[128,2048],[256,2048],[512,2048],[1024,2048],[2048,2048]]) {
    for (const hl of [0,100000]) {
    const r:any = solveGroundFixedLength({ ...REF, hv:1000, hl, groundZ:0 }, {minElements:mn,maxElements:mx});
    if (r.status!=="ok") { console.log(mn,hl,r.status, JSON.stringify(r.refinement?.map((x:any)=>[x.elements,x.groundReaction.toFixed(4),x.maxStress.toFixed(5)]))); continue; }
    const g=r.ground; const last=g.contactZones.at(-1);
    console.log(mn,hl,g.elements,(g.totalReaction+r.endReactions.left.force).toFixed(4),r.maxStress.toFixed(5),last?.xEnd.toFixed(1), JSON.stringify(g.refinement.map((x:any)=>[x.elements,x.groundReaction.toFixed(4)])));
  }}
});
