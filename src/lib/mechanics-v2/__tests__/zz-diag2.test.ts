import { it } from "vitest";
import { REF } from "./helpers";
import { buildGroundMesh } from "../ground-mesh";
import { solveGroundContact, refineActive, maxPenetration } from "../ground-contact";
import { buildLevelResult } from "../ground-result";
import { GROUND_CONV_REL, GROUND_STRESS_FLOOR } from "../ground-types";
it("d", { timeout: 300000 }, () => {
  const { L: _L, numSupports: _n, ...B } = REF;
  for (const [n, hv, L] of [[8,2500,7500],[20,2500,15000],[3,2500,10590]] as const) {
    const inp:any = {...B,L,hv,numSupports:n,groundZ:0};
    const EI=inp.E*inp.I, D=Math.max(hv,inp.q*L**4/(384*EI),1e-3), F=Math.max(inp.q*L,12*EI*hv/L**3,1e-6);
    let per=Math.max(1,Math.ceil(16/(n+1))), prev:any=null;
    console.log(`CASE n=${n} L=${L}`);
    while((n+1)*per<=2048){
      const m=buildGroundMesh(L,hv,EI,inp.q,n,0,per,1e-8*D);
      const init=prev?refineActive(prev.m,prev.a):m.x.map(()=>false);
      const o=solveGroundContact(m,init,1e-8*D,1e-8*F,50+4*m.x.length);
      const pen=maxPenetration(m,o.state);
      const l=buildLevelResult(inp,m,o.state,o.active,{force:F,displacement:D},1e-8*D,1e-8*F,o.iterations,pen);
      const kinds=m.kind.filter((k,i)=>o.active[i]).join(",");
      let why="";
      if(prev){const a=prev.l,b=l,fl=GROUND_STRESS_FLOOR*inp.sigmaAllow;
        why+=`dS=${(Math.abs(a.success.maxStress-b.success.maxStress)/Math.max(b.success.maxStress,fl)).toExponential(1)} dV=${(Math.abs(a.verticalStress-b.verticalStress)/Math.max(b.verticalStress,fl)).toExponential(1)} dC=${(Math.abs(a.ground.contactTotal-b.ground.contactTotal)/F).toExponential(1)} dR=${Math.max(0,...a.success.supports.map((s:any,k:number)=>Math.abs(s.reaction-b.success.supports[k].reaction)/F)).toExponential(1)}`;}
      console.log(` N=${m.x.length-1} active=[${kinds}] valid=${l.success.numericalValid} ${why} conv=${GROUND_CONV_REL}`);
      prev={m,a:o.active,l}; per*=2;
    }
  }
});
