import { supportFractions, supportPeaks } from './supports';
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
  if(N0<=-criticalLoad*(1-1e-6)) return {...r,status:'unstable',message:'Initial effective compression reaches the full-span lateral fixed-fixed Euler load. Vertical supports do not restrain lateral buckling. No post-buckling or middle-restraint stabilization is attempted.'};
  const target=targetComponents(i),fractions=supportFractions(i);let consecutive=0;
  try {
    for(const n of [16,32,64,128]) {
      check();const steps=n/4,stages:Stage[]=[],contactSeed=new Set<number>();
      let contactEventsResolved=true;
      const previousStages=r.stages;
      r.target=undefined;r.excavated=undefined;
      const state=(q:number,z:number|null,y:number|null,phase:Stage['phase'],fraction:number)=>{
        let s:Stage;
        try {s=recover(p,D,n,i.pressure,q,solveBeam(p,D,n,N0,q,z,y,check,fractions,contactSeed),phase,fraction);}
        catch(e){throw new Error(`${phase} (${(fraction*100).toFixed(3)}%): ${e instanceof Error?e.message:String(e)}`);}
        stages.push(s);
        r.stages=stages;r.worst=stages.reduce((a,b)=>a.vm>=b.vm?a:b);
        r.utilization=r.worst.vm/(i.yield*i.allowablePercent/100);
        if(s.maxSlope>0.1) throw new ScopeStop(`Resultant slope exceeds 0.1 during ${phase}; outside the moderate-rotation implementation scope. Path stopped.`);
        if(s.vm>i.yield) throw new ScopeStop(`Conservative beam stress bound exceeds yield during ${phase}; elastic intervention is not verified. Path stopped; no plastic analysis.`);
        return s;
      };
      const transition=(a:Stage,b:Stage)=>a.supports?.some((v,j)=>v.state!=='limit'&&b.supports[j].state!=='limit'&&v.state!==b.supports[j].state)??false;
      const refineEvent=(a:Stage,b:Stage,at:(t:number)=>Stage,depth=0):Stage[]=>{
        if(!transition(a,b))return [b];
        if(b.fraction-a.fraction<=1/(steps*64))return [b];
        if(depth>=8){contactEventsResolved=false;return [b];}
        const m=at((a.fraction+b.fraction)/2);
        return [...refineEvent(a,m,at,depth+1),...refineEvent(m,b,at,depth+1)];
      };
      const ramp=(phase:'excavation'|'displacement',at:(t:number)=>Stage,start:Stage)=>{
        let previous:Stage={...start,phase,fraction:0};const ordered:Stage[]=[];
        for(let k=1;k<=steps;k++) {const next=at(k/steps);ordered.push(...refineEvent(previous,next,at));previous=next;}
        const others=stages.filter(v=>v.phase!==phase);stages.splice(0,stages.length,...others,...ordered);
      };
      const initial=state(0,null,null,'initial',0);
      ramp('excavation',t=>state(p.q*t,null,null,'excavation',t),initial);
      const excavated=stages[stages.length-1];r.excavated=excavated;
      ramp('displacement',t=>state(p.q,target.z===null?null:excavated.midZ+t*(target.z-excavated.midZ),target.y===null?null:excavated.midY+t*(target.y-excavated.midY),'displacement',t),excavated);
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
      const supportReactions=supportPeaks(stages).map(v=>v.reaction);
      const supportGaps=fractions.map((_,j)=>Math.max(...stages.map(v=>Math.abs(v.supports?.[j]?.gap??0))));
      const previousByStep=new Map(previousStages.map(v=>[`${v.phase}:${v.fraction}`,v]));
      const pathSupportChange=fractions.length?Math.max(0,...stages.map(v=>{
        const old=previousByStep.get(`${v.phase}:${v.fraction}`);if(!old?.supports)return 0;
        return Math.max(0,...v.supports.flatMap((c,j)=>[delta(c.reaction,old.supports[j].reaction,1),delta(c.gap,old.supports[j].gap,0.01)]));
      })):0;
      const supportChange=prev?Math.max(pathSupportChange,...supportReactions.map((v,j)=>delta(v,prev.supportReactions?.[j]??0,1)),...supportGaps.map((v,j)=>delta(v,prev.supportGaps?.[j]??0,0.01))):Infinity;
      const change=prev?Math.max(delta(worst.vm,prev.vm,0.05),delta(maxForce,prev.maxForce,1),delta(excavated.midZ,prev.sag,0.01),supportChange):Infinity;
      r.stages=[...stages,...reverse];r.worst=worst;r.excavated=excavated;r.target=last;
      r.stressUncertainty=prev?Math.abs(worst.vm-prev.vm)+0.01:Infinity;
      r.refinement.push({elements:fractions.length?(stages[0].shape.length-1)/2:n,increments:steps,vm:worst.vm,maxForce,sag:excavated.midZ,change,supportReactions,supportGaps,contactEventsResolved});
      r.utilization=worst.vm/(i.yield*i.allowablePercent/100);
      if(maxSlope>0.1) return {...r,status:'out-of-domain',message:'Resultant slope exceeds 0.1: outside this moderate-rotation implementation scope.'};
      if(worst.vm>i.yield) return {...r,status:'out-of-domain',message:'Conservative beam stress bound exceeds yield; elastic intervention is not verified. No plastic analysis performed.'};
      consecutive=change<=0.005&&contactEventsResolved?consecutive+1:0;
      if(consecutive>=2) {
        const difference=worst.vm-i.yield*i.allowablePercent/100;
        const status:Status=Math.abs(difference)<=r.stressUncertainty?'uncertain':difference<0?'pass':'fail';
        return {...r,status,message:status==='uncertain'?'Threshold lies within numerical stress uncertainty.':status==='pass'?'Custom criterion met on the refined elastic path; no normative compliance verdict.':`Custom criterion exceeded during ${worst.phase} (${(100*worst.fraction).toFixed(1)}%). ${worst.phase==='excavation'?'The excavated state already exceeds the selected threshold.':''}`};
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
  return {halfLength:i.halfLength,displacement:i.displacement,status:combineStatus(scenarios.map(s=>s.status)),scenarios,governing,supportPositions:supportFractions(i).map(f=>f*2*i.halfLength)};
}
