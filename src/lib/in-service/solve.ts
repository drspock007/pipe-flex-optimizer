import { initialForces, section, targetComponents, validate, type ServiceInput, type Scenario, type ScenarioResult, type Stage, type CaseResult, type Status } from './types';
import { solveBeam, recover } from './beam';

class ScopeStop extends Error {}
const score=(s:Stage)=>Math.hypot(s.forceZ,s.forceY);
const delta=(a:number,b:number,floor:number)=>Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),floor/0.005);
export function solveScenario(i:ServiceInput,scenario:Scenario,check=()=>{}):ScenarioResult {
  const p=section(i),D=2*i.halfLength,{wall:wall0,effective:N0}=initialForces(i,scenario,p);
  const criticalLoad=4*Math.PI**2*p.EI/(D*D);
  const r:ScenarioResult={scenario,status:'numerical-failure',message:'',N0,wall0,criticalLoad,stages:[],refinement:[],stressUncertainty:0};
  if(![...Object.values(p),D,N0,wall0,criticalLoad].every(Number.isFinite) || !(p.EA>0&&p.EI>0&&p.ri>0&&criticalLoad>0)) return {...r,message:'Non-finite or unrepresentable derived section/load.'};
  if(D/i.od<10) return {...r,status:'out-of-domain',message:'Full length / OD < 10: outside the slender-beam implementation scope.'};
  if(N0<=-criticalLoad*(1-1e-6)) return {...r,status:'unstable',message:'Initial effective compression reaches the unsupported fixed-fixed Euler load. No post-buckling or middle-restraint stabilization is attempted.'};
  const target=targetComponents(i);let consecutive=0;
  try {
    for(const n of [16,32,64,128]) {
      check();const steps=n/4,stages:Stage[]=[];
      r.target=undefined;r.excavated=undefined;
      const state=(q:number,z:number|null,y:number|null,phase:Stage['phase'],fraction:number)=>{
        const s=recover(p,D,n,i.pressure,q,solveBeam(p,D,n,N0,q,z,y,check),phase,fraction);
        stages.push(s);
        r.stages=stages;r.worst=stages.reduce((a,b)=>a.vm>=b.vm?a:b);
        r.utilization=r.worst.vm/(i.yield*i.allowablePercent/100);
        if(s.maxSlope>0.1) throw new ScopeStop(`Resultant slope exceeds 0.1 during ${phase}; outside the moderate-rotation implementation scope. Path stopped.`);
        if(s.vm>i.yield) throw new ScopeStop(`Conservative beam stress bound exceeds yield during ${phase}; elastic intervention is not verified. Path stopped; no plastic analysis.`);
        return s;
      };
      state(0,null,null,'initial',0);
      for(let k=1;k<=steps;k++) state(p.q*k/steps,null,null,'excavation',k/steps);
      const excavated=stages[stages.length-1];r.excavated=excavated;
      for(let k=1;k<=steps;k++) {
        const t=k/steps;
        state(p.q,target.z===null?null:excavated.midZ+t*(target.z-excavated.midZ),target.y===null?null:excavated.midY+t*(target.y-excavated.midY),'displacement',t);
      }
      const last=stages[stages.length-1];
      // Reversible elastic path: no second independent solve that could switch branches.
      const reverse:Stage[]=[
        ...stages.filter(s=>s.phase==='displacement').reverse().map(s=>({...s,phase:'return' as const})),
        {...excavated,phase:'return',fraction:0},
        ...stages.filter(s=>s.phase!=='displacement').reverse().map(s=>({...s,phase:'restoration' as const})),
      ];
      const worst=stages.reduce((a,b)=>a.vm>=b.vm?a:b);
      const maxSlope=Math.max(...stages.map(s=>s.maxSlope));
      const maxForce=Math.max(...stages.map(score));
      const prev=r.refinement.at(-1);
      const change=prev?Math.max(delta(worst.vm,prev.vm,0.05),delta(maxForce,prev.maxForce,1),delta(excavated.midZ,prev.sag,0.01)):Infinity;
      r.stages=[...stages,...reverse];r.worst=worst;r.excavated=excavated;r.target=last;
      r.stressUncertainty=prev?Math.abs(worst.vm-prev.vm)+0.01:Infinity;
      r.refinement.push({elements:n,increments:steps,vm:worst.vm,maxForce,sag:excavated.midZ,change});
      r.utilization=worst.vm/(i.yield*i.allowablePercent/100);
      if(maxSlope>0.1) return {...r,status:'out-of-domain',message:'Resultant slope exceeds 0.1: outside this moderate-rotation implementation scope.'};
      if(worst.vm>i.yield) return {...r,status:'out-of-domain',message:'Conservative beam stress bound exceeds yield; elastic intervention is not verified. No plastic analysis performed.'};
      consecutive=change<=0.005?consecutive+1:0;
      if(consecutive>=2) {
        const difference=worst.vm-i.yield*i.allowablePercent/100;
        const status:Status=Math.abs(difference)<=r.stressUncertainty?'uncertain':difference<0?'pass':'fail';
        return {...r,status,message:status==='uncertain'?'Threshold lies within numerical stress uncertainty.':status==='pass'?'Custom criterion met on the refined elastic path; no normative compliance verdict.':'Custom criterion exceeded on the intervention path.'};
      }
    }
    return {...r,status:'uncertain',message:'Mesh/path refinement did not meet the convergence requirement at the resource limit.'};
  } catch(e) {return {...r,status:e instanceof ScopeStop?'out-of-domain':'numerical-failure',message:e instanceof Error?e.message:String(e)};}
}
export function combineStatus(statuses:Status[]):Status {
  for(const s of ['invalid','numerical-failure','unstable','out-of-domain','uncertain','fail'] as Status[]) if(statuses.includes(s)) return s;
  return statuses.length?'pass':'invalid';
}
export function solveCase(i:ServiceInput,check=()=>{}):CaseResult {
  if(validate(i).length) return {halfLength:i.halfLength,displacement:i.displacement,status:'invalid',scenarios:[]};
  const scenarios=i.scenarios.map(s=>solveScenario(i,s,check));
  const governing=scenarios.filter(s=>s.worst).sort((a,b)=>b.worst.vm-a.worst.vm)[0]?.scenario.id;
  return {halfLength:i.halfLength,displacement:i.displacement,status:combineStatus(scenarios.map(s=>s.status)),scenarios,governing};
}
