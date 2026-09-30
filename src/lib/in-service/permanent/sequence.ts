import {type ServiceInput,type Scenario,section,initialForces,targetComponents} from '../types';
import {supportFractions,supportMesh} from '../supports';
import {pairs} from './profile';
import {equilibrium,shape,type Equilibrium,type LoadState,type Spring} from './fem';
export interface PermanentStage {name:string;fraction:number;mesh:number[];state:Equilibrium;pressure:number;temperature:number;equipment:[number,number]}
export interface PermanentScenario {scenario:Scenario;status:'complete'|'unresolved'|'out-of-domain';message:string;stages:PermanentStage[];target?:PermanentStage;released?:PermanentStage;final?:PermanentStage;operations:PermanentStage[];heights:number[];mechanical:'satisfied'|'exceeded'|'uncertain'|'not evaluated';position:'satisfied'|'exceeded'|'uncertain'|'not evaluated';soilLimited:boolean;refinement:{elements:number;increments:number;stress:number;change:number}[];uncertainty:number}
export interface PermanentResult {version:'permanent-elastic-1';validation:'numerically benchmarked';scenarios:PermanentScenario[]}
const clone=(l:LoadState):LoadState=>({...l,loads:[...l.loads],fixed:new Map(l.fixed),forces:new Map(l.forces),obstacles:l.obstacles.map(o=>({...o})),springs:l.springs.map(o=>({...o}))});
class ScopeError extends Error {}
export function constructionPath(i:ServiceInput,sc:Scenario,n:number,steps:number,check:()=>void,trace?:(stage:PermanentStage,load:LoadState)=>void):PermanentScenario {
 const p=i.permanent,D=2*i.halfLength,ps=pairs(i),initial=supportFractions(i),rightOf=(f:number)=>initial.find(x=>Math.abs(x+f-1)<4*Number.EPSILON)??1-f,all=[...initial,...ps,...ps.map(rightOf),...p.zones.flatMap(z=>[z.start,z.end]).filter(x=>x>0&&x<1),.5];
 const mesh=supportMesh(D,n,all),nodes=mesh.length,mid=mesh.indexOf(D/2),dof=nodes*5;
 const base=section(i),critical=4*Math.PI**2*base.EI/D**2;
 const r:PermanentScenario={scenario:sc,status:'unresolved',message:'Incomplete path.',stages:[],operations:[],heights:[],mechanical:'not evaluated',position:'not evaluated',soilLimited:false,refinement:[],uncertainty:Infinity};
 if(![D,critical,...Object.values(base)].every(Number.isFinite)||D/i.od<10||initialForces(i,sc).effective<=-critical*(1-1e-6)){r.status='out-of-domain';r.message='Initial slenderness or free-span compression outside the retained stable domain.';return r;}
 let load:LoadState={pressure:i.pressure,temperature:i.temperature,density:i.fluidDensity,weightFactor:0,loads:new Array(nodes).fill(0),fixed:new Map(),forces:new Map(),obstacles:initial.map((f,j)=>({id:`initial ${j+1}`,node:mesh.indexOf(f*D),height:0})),springs:[]};
 load.density=effectiveFluidDensity(i);
 for(const node of [0,nodes-1])for(let k=0;k<5;k++)load.fixed.set(node*5+k,0);
 let current:Equilibrium|undefined;
 const record=(name:string,t:number,l:LoadState):PermanentStage=>{
  check();const e=equilibrium(i,sc,mesh,l,current?.d??new Array(dof).fill(0),check);current=e;
  const st={name,fraction:t,mesh,state:e,pressure:l.pressure,temperature:l.temperature,equipment:[1,3].map(k=>l.fixed.has(mid*5+k)?e.reactions[mid*5+k]:l.forces.get(mid*5+k)??0) as [number,number]};r.stages.push(st);trace?.(st,clone(l));
  if(e.vm>i.yield)throw new ScopeError('Elastic steel stress bound exceeds yield.');
  if(e.slope>.1)throw new ScopeError('Resultant slope bound exceeds 0.1.');
  r.soilLimited ||= e.soil.some(s=>s.limited);return st;
 };
 const ramp=(name:string,at:(t:number)=>LoadState)=>{
  record(name,0,at(0));let prev=current;const walk=(a:number,b:number,depth:number)=>{
   const saved=prev,st=record(name,b,at(b));const changed=saved&&st.state.contacts.some(c=>{const old=saved.contacts.find(o=>o.id===c.id);return old&&(old.reaction>1e-6)!==(c.reaction>1e-6);});
   if(changed&&b-a>1/(steps*64)){if(depth>=8)throw new Error('Unresolved support contact transition.');r.stages.pop();current=saved;walk(a,(a+b)/2,depth+1);walk((a+b)/2,b,depth+1);}else prev=st.state;
  };for(let k=1;k<=steps;k++)walk((k-1)/steps,k/steps,0);load=at(1);
 };
 const hold=()=>{const t=targetComponents(i);if(t.z!==null)load.fixed.set(mid*5+1,current.d[mid*5+1]);if(t.y!==null)load.fixed.set(mid*5+3,current.d[mid*5+3]);};
 const lower=(ids:string[],name:string)=>{
  const selected=load.obstacles.filter(o=>ids.includes(o.id));let distance=1;
  for(let attempt=0;attempt<30;attempt++){
   const start=clone(load);ramp(`${name} / lowering ${attempt+1}`,t=>({...clone(start),obstacles:start.obstacles.map(o=>ids.includes(o.id)?{...o,height:o.height-t*distance}:o)}));
   if(current.contacts.filter(o=>ids.includes(o.id)).every(o=>o.reaction===0)){load.obstacles=load.obstacles.filter(o=>!ids.includes(o.id));return;}
   distance*=2;
  }throw new Error(`Could not unload ${selected.length} supports.`);
 };
 const release=()=>{
  const start=clone(load),controlled=[mid*5+1,mid*5+3].filter(j=>start.fixed.has(j)),forces=controlled.map(j=>current.reactions[j]);
  ramp('Equipment release',t=>{const l=clone(start);controlled.forEach((j,k)=>{l.fixed.delete(j);l.forces.set(j,(1-t)*forces[k]);});return l;});
  load.forces.clear();r.released=r.stages.at(-1);
 };
 try{
  record('Initial',0,load);const start=clone(load);ramp('Excavation',t=>({...clone(start),weightFactor:t}));hold();
  if(p.initialSupports==='remove'&&load.obstacles.length)lower(load.obstacles.map(o=>o.id),'Initial support unloading');
  const from=clone(load),target=targetComponents(i);
  ramp('Imposed movement',t=>{const l=clone(from);for(const [axis,v] of [[1,target.z],[3,target.y]] as const)if(v!==null)l.fixed.set(mid*5+axis,from.fixed.get(mid*5+axis)+t*(v-from.fixed.get(mid*5+axis)));return l;});r.target=r.stages.at(-1);
  // Reused/remaining loaded supports must be unloaded before any height change.
  if(load.obstacles.length)lower(load.obstacles.map(o=>o.id),'Repositioning: unload initial supports');
  ps.forEach((f,j)=>{const left=mesh.indexOf(f*D),right=mesh.indexOf(rightOf(f)*D),h=p.heightMode==='common'?p.heights[j]:(current.d[left*5+1]+current.d[right*5+1])/2;r.heights.push(h);});
  const before=clone(load),installationShape=[...current.d];
  ramp('Support positioning',t=>{const l=clone(before);ps.forEach((f,j)=>{for(const x of [f,rightOf(f)]){const node=mesh.indexOf(x*D),h=r.heights[j],touch=installationShape[node*5+1];l.obstacles.push({id:`pair ${j+1} ${x<.5?'left':'right'}`,node,height:p.heightMode==='fitted'?h:Math.min(h,touch)+t*Math.max(0,h-touch)});}});return l;});
  if(p.release==='before')release();
  const stages=[...new Set(p.zones.map(z=>z.step))].sort((a,b)=>a-b);
  for(const step of stages){
   const added:Spring[]=[],weights=new Array(nodes).fill(0),construction=new Array(nodes).fill(0);
   p.zones.forEach((z,index)=>{if(z.step!==step)return;
    const lengths=new Array(nodes).fill(0);for(let e=0;e<nodes-1;e++)if(mesh[e]>=z.start*D-1e-8&&mesh[e+1]<=z.end*D+1e-8){const half=(mesh[e+1]-mesh[e])/2;lengths[e]+=half;lengths[e+1]+=half;}
    lengths.forEach((length,node)=>{if(!length)return;const ref=current.d;weights[node]+=z.weight*length;construction[node]+=z.construction*length;
     added.push({node,axis:0,reference:ref[node*5],sign:0,curve:z.axial,length,factor:1,zone:`${index+1}: ${z.name}`},{node,axis:3,reference:ref[node*5+3],sign:0,curve:z.lateral,length,factor:1,zone:`${index+1}: ${z.name}`},{node,axis:1,reference:ref[node*5+1]-z.bedOffset,sign:-1,curve:z.down,length,factor:1,zone:`${index+1}: ${z.name}`},{node,axis:1,reference:ref[node*5+1],sign:1,curve:z.up,length,factor:1,zone:`${index+1}: ${z.name}`});});
   });
   const start=clone(load);ramp(`Backfill stage ${step}`,t=>({...clone(start),springs:[...start.springs,...added.map(s=>({...s,factor:t}))],loads:start.loads.map((v,j)=>v+t*(weights[j]+construction[j]))}));
   const full=clone(load);ramp(`Remove construction load ${step}`,t=>({...clone(full),loads:full.loads.map((v,j)=>v-t*construction[j])}));
  }
  if(p.release==='after')release();
  for(const j of p.removalOrder.length?p.removalOrder:ps.map((_,j)=>j))lower(load.obstacles.filter(o=>o.id.startsWith(`pair ${j+1} `)).map(o=>o.id),`Remove pair ${j+1}`);
  r.final=record('Final backfilled state',1,load);const finalLoad=clone(load),finalState=current;
  for(const op of p.operations){current=finalState;load=clone(finalLoad);ramp(`Operation: ${op.name}`,t=>({...clone(finalLoad),pressure:finalLoad.pressure+t*(op.pressure-finalLoad.pressure),temperature:finalLoad.temperature+t*(op.temperature-finalLoad.temperature),density:finalLoad.density+t*(op.fluidDensity-finalLoad.density)}));r.operations.push(r.stages.at(-1));}
  r.status='complete';r.message='Completed numerical path; convergence and scope assessment follow.';
 }catch(e){r.status=e instanceof ScopeError?'out-of-domain':'unresolved';r.message=e instanceof Error?e.message:String(e);}
 return r;
}
import {effectiveFluidDensity} from '../fluid';
export function runPermanent(i:ServiceInput,check:()=>void):PermanentResult {
 const scenarios=i.scenarios.map(sc=>{
  let previous:PermanentScenario|undefined,consecutive=0;const history:PermanentScenario['refinement']=[];
  for(const [n,steps] of [[16,4],[32,8],[64,16],[128,32]]){
   let r:PermanentScenario;
   try{r=constructionPath(i,sc,n,steps,check);}catch(e){return previous?{...previous,status:'unresolved' as const,mechanical:'not evaluated' as const,position:'not evaluated' as const,message:String(e)}:{scenario:sc,status:'unresolved' as const,message:String(e),stages:[],operations:[],heights:[],mechanical:'not evaluated' as const,position:'not evaluated' as const,soilLimited:false,refinement:[],uncertainty:Infinity};}
   const peak=Math.max(0,...r.stages.map(s=>s.state.vm));
   const metrics=(v:PermanentScenario):{value:number;floor:number}[]=>{
    const out=[{value:Math.max(0,...v.stages.map(s=>s.state.vm)),floor:.05},...v.heights.map(value=>({value,floor:.01}))];
    const interpolate=(st:PermanentStage,x:number,axis:number)=>{let e=0;while(e<st.mesh.length-2&&st.mesh[e+1]<x)e++;const l=st.mesh[e+1]-st.mesh[e],t=(x-st.mesh[e])/l;if(axis===0)return st.state.d[5*e]*(1-t)+st.state.d[5*(e+1)]*t;const h=shape(t,l).h;return h.reduce((a,b,j)=>a+b*st.state.d[5*e+[axis,axis+1,axis+5,axis+6][j]],0);};
    for(const st of [v.released,v.final,...v.operations].filter(Boolean))for(let k=0;k<=32;k++)for(const axis of [0,1,3])out.push({value:interpolate(st,i.halfLength*k/16,axis),floor:.01});
    const names=[...new Set(v.stages.map(st=>st.name))];
    for(const name of names){const sts=v.stages.filter(st=>st.name===name);out.push({value:Math.max(...sts.map(st=>st.state.vm)),floor:.05},{value:Math.max(...sts.map(st=>Math.hypot(...st.equipment))),floor:1});
     for(const id of [...new Set(sts.flatMap(st=>st.state.contacts.map(c=>c.id)))].sort())out.push({value:Math.max(0,...sts.flatMap(st=>st.state.contacts.filter(c=>c.id===id).map(c=>c.reaction))),floor:1},{value:Math.max(0,...sts.flatMap(st=>st.state.contacts.filter(c=>c.id===id).map(c=>Math.abs(c.gap)))),floor:.01});
     out.push({value:Math.max(0,...sts.flatMap(st=>st.state.soil.map(c=>Math.abs(c.perLength)*2*i.halfLength))),floor:1});
    }return out;
   };
   const a=metrics(r),b=previous?metrics(previous):[];
   const change=previous&&a.length===b.length?Math.max(...a.map((v,j)=>Math.abs(v.value-b[j].value)/Math.max(v.floor,Math.abs(v.value),Math.abs(b[j].value)))):Infinity;
   history.push({elements:n,increments:steps,stress:peak,change});r.refinement=[...history];
   if(r.status!=='complete')return r;
   consecutive=change<=.005?consecutive+1:0;
   if(consecutive>=2){r.uncertainty=Math.abs(peak-Math.max(...previous.stages.map(s=>s.state.vm)))+.01;const allowable=i.yield*i.allowablePercent/100;r.mechanical=peak>allowable+r.uncertainty?'exceeded':peak<allowable-r.uncertainty?'satisfied':'uncertain';
    const t=targetComponents(i),limits=i.permanent;let uncertain=false,exceeded=false;
    const displacementUncertainty=Math.max(.01,...a.filter(v=>v.floor===.01).map((v,j)=>Math.abs(v.value-b.filter(v=>v.floor===.01)[j].value)+.01));
    for(const st of [r.final,...r.stages.filter(st=>st.name.startsWith('Operation:'))]){const mid=st.mesh.indexOf(i.halfLength);for(const [axis,v,tol] of [[1,t.z,limits.verticalTolerance],[3,t.y,limits.lateralTolerance]] as const){if(v===null)continue;const error=Math.abs(st.state.d[5*mid+axis]-v),u=displacementUncertainty;exceeded ||= error>tol+u;uncertain ||= error>=tol-u;}}
    r.position=r.soilLimited?'not evaluated':exceeded?'exceeded':uncertain?'uncertain':'satisfied';r.message='Numerically converged elastic beam path. Numerically benchmarked elastic model; site applicability and excluded integrity checks require separate assessment. No permanent installation approval.';return r;
   }previous=r;
  }
  previous.status='unresolved';previous.message='Mesh/path convergence not established within existing refinement levels.';return previous;
 });return {version:'permanent-elastic-1',validation:'numerically benchmarked',scenarios};
}
