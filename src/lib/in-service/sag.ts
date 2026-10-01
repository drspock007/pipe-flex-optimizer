import {stressBound} from './beam';
import {section,type ServiceInput,type Scenario,type ScenarioResult,type CaseResult,type ServiceReport,type Stage,type Status} from './types';
import {solveScenario,combineStatus} from './solve';

/** Simply supported, axially free Euler-Bernoulli beam. Zero gauge pressure enforced by validation. */
export function solveSimpleSag(i:ServiceInput,s:Scenario):ScenarioResult {
 const p=section(i),L=2*i.halfLength;
 const r:ScenarioResult={scenario:s,status:'numerical-failure',message:'Unrepresentable analytical result.',N0:0,wall0:0,criticalLoad:Math.PI**2*p.EI/L**2,stages:[],refinement:[],stressUncertainty:0};
 const sag=5*p.q*L**4/(384*p.EI),moment=p.q*L**2/8,reaction=p.q*L/2,slope=p.q*L**3/(24*p.EI);
 const stress=stressBound(p,0,moment,reaction);
 if(![...Object.values(p),L,sag,moment,reaction,slope,stress.vm,r.criticalLoad].every(Number.isFinite)||!(p.EI>0&&L>0))return r;
 if(L/i.od<10)return {...r,status:'out-of-domain',message:'Full span / OD < 10: outside the slender-beam model.'};
 const shape=Array.from({length:65},(_,j)=>{const x=L*j/64;return {x,z:-p.q*x*(L**3-2*L*x*x+x**3)/(24*p.EI),y:0};});
 const stage:Stage={phase:'excavation',fraction:1,vm:stress.vm,normalVm:stress.normal,x:L/2,shearX:0,element:[0,L],N:0,wall:0,midZ:-sag,midY:0,forceZ:0,forceY:0,leftZ:reaction,rightZ:reaction,leftY:0,rightY:0,leftMz:0,rightMz:0,leftMy:0,rightMy:0,maxSlope:slope,residual:0,shape,sagMax:sag,sagX:L/2};
 r.stages=[stage];r.worst=stage;r.excavated=stage;r.target=stage;r.utilization=stress.vm/(i.yield*i.allowablePercent/100);
 // Upper bound combines global bending and shear peaks at different positions.
 if(slope>.1)return {...r,status:'out-of-domain',message:'Slope exceeds 0.1: outside the small-strain/moderate-rotation scope.'};
 if(stress.vm>i.yield)return {...r,status:'out-of-domain',message:'Conservative beam stress bound exceeds yield. No plastic analysis.'};
 r.status=stress.vm<=i.yield*i.allowablePercent/100?'pass':'fail';
 r.message='Analytical static solution, axial sliding free. Global bending and shear maxima form a conservative von Mises bound; no mesh-convergence claim. Thermal expansion is free and generates no axial force.';
 return r;
}
export function solveSagCase(i:ServiceInput,check=()=>{}):CaseResult {
 const normalized:ServiceInput={...i,supports:{kind:'none'}};
 const scenarios=i.scenarios.map(s=>{
  check();const result=i.sag.boundary==='simple'?solveSimpleSag(normalized,s):solveScenario(normalized,s,check);
  const final=result.target;
  if(final){
   const levels=result.refinement;
   const uncertainty=i.sag.boundary==='simple'?0:levels.length>1?Math.abs(levels.at(-1).sag-levels.at(-2).sag)+.01:Infinity;
   const resolved=['pass','fail'].includes(result.status);
   let status:Status|'not-requested'=i.sag.limit===undefined?'not-requested':'uncertain';
   if(i.sag.limit!==undefined&&resolved){
    const d=final.sagMax-i.sag.limit;
    status=uncertainty===0?(d<=0?'pass':'fail'):Math.abs(d)<=uncertainty?'uncertain':d<0?'pass':'fail';
   }
   result.sag={value:final.sagMax,x:final.sagX,uncertainty,status};
  }
  return result;
 });
 return {halfLength:i.halfLength,displacement:0,scenarios,supportPositions:[],governing:scenarios.filter(s=>s.worst).sort((a,b)=>b.worst.vm-a.worst.vm)[0]?.scenario.id,
  status:combineStatus(scenarios.flatMap(s=>[s.status,...(s.sag&&s.sag.status!=='not-requested'?[s.sag.status]:[])]))};
}
/** Same exploratory resources as the movement search; length selection is deliberately reversed. */
export function runSag(r:ServiceReport,check:()=>void,limit:number,onProgress?:(s:string)=>void):void {
 const i=r.input;
 if(i.mode==='direct'){r.result=solveSagCase(i,check);r.message='Sag only: fixed full span, no actuator. Mechanical and deflection checks are separate.';return;}
 const lo=i.minHalfLength,hi=i.maxHalfLength;
 const evaluate=(value:number)=>{
  onProgress?.(`Sag-only span search: ${r.samples.length+1} / ${limit}`);
  const c=solveSagCase({...i,halfLength:value},check);r.result??=c;
  const usage=c.scenarios.flatMap(s=>s.utilization===undefined?[]:[s.utilization]);
  const row={value,status:c.status,maxUtilization:usage.length?Math.max(...usage):null};r.samples.push(row);return row;
 };
 try {
  for(let k=0;k<25;k++)evaluate(lo*Math.pow(hi/lo,k/24));
  for(let pass=0;pass<4&&r.samples.length<limit;pass++){
   const sorted=[...r.samples].sort((a,b)=>a.value-b.value);
   for(let k=0;k<sorted.length-1&&r.samples.length<limit;k++)if((sorted[k].status==='pass')!==(sorted[k+1].status==='pass'))evaluate(Math.sqrt(sorted[k].value*sorted[k+1].value));
  }
  const candidate=[...r.samples].filter(s=>s.status==='pass').sort((a,b)=>b.value-a.value)[0];
  if(candidate){
   onProgress?.('Rechecking largest verified sampled full span across all scenarios');
   r.result=solveSagCase({...i,halfLength:candidate.value},check);
   if(r.result.status==='pass'&&!r.budgetExhausted){r.candidate=candidate.value;r.boundReached=Math.abs(candidate.value-hi)<=1e-12*hi;}
  }
 } catch(e){
  if(!r.budgetExhausted)throw e;
 }
 r.samples.sort((a,b)=>a.value-b.value);
 r.message=r.candidate===undefined?'No common span verified; this does not prove that no admissible span exists.':'Largest verified sampled span satisfying stress and sag limits in all listed scenarios; not a certified global maximum.';
 if(r.boundReached)r.message+=' Upper search bound reached; no physical maximum established.';
 if(r.budgetExhausted)r.message+=' Global time budget exhausted; incomplete coverage.';
 r.message+=' Unresolved samples and unsampled intervals remain unverified.';
}
