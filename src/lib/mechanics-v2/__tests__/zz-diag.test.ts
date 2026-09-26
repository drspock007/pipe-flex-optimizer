import { it } from "vitest";
import { REF } from "/dev-server/src/lib/mechanics-v2/__tests__/helpers";
import { buildGroundMesh } from "/dev-server/src/lib/mechanics-v2/ground-mesh";
import { solveGroundContact, refineActive, maxPenetration } from "/dev-server/src/lib/mechanics-v2/ground-contact";
import { buildLevelResult } from "/dev-server/src/lib/mechanics-v2/ground-result";
import { solveGroundFixedLength } from "/dev-server/src/lib/mechanics-v2/ground-solve";
it("d", { timeout: 300000 }, () => {
  console.log("REF", JSON.stringify(REF));
  const { L: _L, numSupports: _n, ...B } = REF;
  for (const [n, hv] of [[0,1000],[0,2500],[3,2500],[8,2500],[20,2500]] as const) {
    const Ls = Array.from({length:17},(_,k)=>7500*Math.pow(16,k/16));
    const row = Ls.map(L=>{const r:any=solveGroundFixedLength({...B,L,hv,numSupports:n,groundZ:0}); return r.status==="ok"?"ok":r.status.slice(0,4);});
    console.log("FIXED n="+n,"hv="+hv, row.join(" "));
  }
  for (const [n, hv, L] of [[0,2500,7500],[20,2500,7500],[20,2500,15000]] as const) {
    const inp:any = {...B,L,hv,numSupports:n,groundZ:0};
    const EI=inp.E*inp.I, hMax=hv, D=Math.max(hMax,inp.q*L**4/(384*EI),1e-3), F=Math.max(inp.q*L,12*EI*hMax/L**3,1e-6);
    let per=Math.max(1,Math.ceil(16/(n+1))), prev:any=null;
    console.log(`CASE n=${n} L=${L} F=${F.toExponential(3)} tolF=${(1e-7*F).toExponential(2)}`);
    while((n+1)*per<=2048){
      const m=buildGroundMesh(L,hv,EI,inp.q,n,0,per,1e-8*D);
      const init=prev?refineActive(prev.m,prev.a):m.x.map(()=>false);
      const o=solveGroundContact(m,init,1e-8*D,1e-8*F,50+4*m.x.length);
      const pen=maxPenetration(m,o.state);
      const l=buildLevelResult(inp,m,o.state,o.active,{force:F,displacement:D},1e-8*D,1e-8*F,o.iterations,pen);
      const r=l.success.equilibrium.residuals, nr=o.active.filter(Boolean).length;
      console.log(` N=${m.x.length-1} act=${nr} conv=${o.converged} s=${l.success.maxStress.toFixed(5)} pen=${pen.toExponential(2)} tr=${(r.translation/F).toExponential(2)} rot=${(r.rotation/F/L).toExponential(2)} gF=${(r.globalForce/F).toExponential(2)} gM=${(r.globalMoment/F/L).toExponential(2)} valid=${l.success.numericalValid} ploss=${l.precisionLoss} msg=${l.success.diagnostics.messages.slice(0,2).join("|").slice(0,120)}`);
      prev={m,a:o.active}; per*=2;
    }
  }
});
