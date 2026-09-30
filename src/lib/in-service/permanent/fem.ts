import {BandMatrix,bandFactor} from '../../mechanics-v2/banded';
import {section,initialForces,type ServiceInput,type Scenario} from '../types';
import type {SoilCurve} from './profile';
export interface Obstacle {id:string;node:number;height:number}
export interface Spring {node:number;axis:0|1|3;reference:number;sign:1|-1|0;curve:SoilCurve;length:number;factor:number;zone:string}
export interface LoadState {pressure:number;temperature:number;density:number;weightFactor:number;loads:number[];fixed:Map<number,number>;forces:Map<number,number>;obstacles:Obstacle[];springs:Spring[]}
export interface Equilibrium {d:number[];residual:number;reactions:number[];contacts:{id:string;node:number;height:number;reaction:number;gap:number}[];soil:{zone:string;node:number;axis:number;direction:string;force:number;perLength:number;displacement:number;limited:boolean}[];axial:number[];vm:number;slope:number;iterations:number}
// Cubic Hermite transverse interpolation; linear nodal axial displacement with
// condensed within-element geometric extension. Axial force is elementwise constant.
const gauss=[[-.906179845938664,.236926885056189],[-.538469310105683,.478628670499366],[0,.568888888888889],[.538469310105683,.478628670499366],[.906179845938664,.236926885056189]];
export function shape(t:number,l:number){return {h:[1-3*t*t+2*t*t*t,l*(t-2*t*t+t*t*t),3*t*t-2*t*t*t,l*(-t*t+t*t*t)],b:[(-6*t+6*t*t)/l,1-4*t+3*t*t,(6*t-6*t*t)/l,-2*t+3*t*t],c:[(-6+12*t)/l**2,(-4+6*t)/l,(6-12*t)/l**2,(-2+6*t)/l]};}
const dot=(a:number[],b:number[])=>a.reduce((s,v,j)=>s+v*b[j],0);
export function soilLaw(c:SoilCurve,x:number){
 const d=Math.abs(x),p=c.points,last=p.at(-1)!;let j=1;while(j<p.length-1&&d>p[j].displacement)j++;
 const a=p[j-1],b=p[j],k=(b.reaction-a.reaction)/(b.displacement-a.displacement);
 const limited=d>=last.displacement||a.reaction+k*(d-a.displacement)>=last.reaction;
 return {force:Math.sign(x)*Math.min(last.reaction,a.reaction+k*(d-a.displacement)),tangent:d>=last.displacement?0:k,limited};
}
export function assemble(i:ServiceInput,s:Scenario,mesh:number[],d:number[],load:LoadState){
 const p=section({...i,pressure:load.pressure,temperature:load.temperature,fluidType:'custom',fluidDensity:load.density}),{effective:N0}=initialForces({...i,pressure:load.pressure,temperature:load.temperature},s,p);
 const size=d.length,K=new BandMatrix(size,9),r=new Array<number>(size).fill(0),axial:number[]=[],soil:Equilibrium['soil']=[];let vm=0,maxSlope=0;
 for(let e=0;e<mesh.length-1;e++){
  const l=mesh[e+1]-mesh[e],ix=Array.from({length:10},(_,j)=>5*e+j),v=ix.map(j=>d[j]),z=[v[1],v[2],v[6],v[7]],y=[v[3],v[4],v[8],v[9]],g=new Array<number>(10).fill(0),G=Array.from({length:10},()=>new Array<number>(10).fill(0)),kb=Array.from({length:10},()=>new Array<number>(10).fill(0));
  let stretch=0;
  g[0]=-1;g[5]=1;
  for(const [xi,w] of gauss){const t=(xi+1)/2,wt=w*l/2,{h,b,c}=shape(t,l),sz=dot(b,z),sy=dot(b,y);stretch+=wt*(sz*sz+sy*sy)/2;
   for(const [offset,vec,slope] of [[1,z,sz],[3,y,sy]] as [number,number[],number][]){const ids=[offset,offset+1,offset+5,offset+6];
    ids.forEach((j,a)=>{g[j]+=wt*b[a]*slope;r[ix[j]]+=wt*p.EI*c[a]*dot(c,vec);if(offset===1)r[ix[j]]+=wt*p.q*load.weightFactor*h[a];ids.forEach((k,bj)=>{G[j][k]+=wt*b[a]*b[bj];kb[j][k]+=wt*p.EI*c[a]*c[bj];});});}
  }
  const strain=(v[5]-v[0]+stretch)/l,N=N0+p.EA*strain;axial.push(N);
  for(let a=0;a<10;a++){r[ix[a]]+=N*g[a];for(let b=a;b<10;b++)K.add(ix[a],ix[b],kb[a][b]+p.EA/l*g[a]*g[b]+N*G[a][b]);}
  // Elementwise upper bound: independent maxima of normal bending and shear.
  const M=Math.max(...[0,1].map(t=>{const c=shape(t,l).c;return p.EI*Math.hypot(dot(c,z),dot(c,y));}));
  const third=[12/l**3,6/l**2,-12/l**3,6/l**2],V=p.EI*Math.hypot(dot(third,z),dot(third,y));
  const wall=N+load.pressure*p.Ai,tau=V*(p.ro*p.ro+p.ro*p.ri+p.ri*p.ri)/(3*p.I);
  vm=Math.max(vm,Math.sqrt(Math.max(...[p.ri,p.ro].map(radius=>(Math.abs(wall/p.A-p.a)+M*radius/p.I)**2+3*p.b*p.b/radius**4))+3*tau*tau));
  // Slope squared is quartic. Bound via extrema of each quadratic component.
  const maxComponent=(vec:number[])=>{const a=6*(vec[0]-vec[2])/l+3*(vec[1]+vec[3]),b=6*(vec[2]-vec[0])/l-4*vec[1]-2*vec[3],t=a? -b/(2*a):-1;return Math.max(...[0,1,...(t>0&&t<1?[t]:[])].map(t=>Math.abs(dot(shape(t,l).b,vec))));};
  maxSlope=Math.max(maxSlope,Math.hypot(maxComponent(z),maxComponent(y)));
 }
 for(const sp of load.springs){const j=5*sp.node+sp.axis,delta=d[j]-sp.reference,engaged=sp.sign===0||delta*sp.sign>0;
  const q=engaged?soilLaw(sp.curve,delta):{force:0,tangent:0,limited:false},factor=sp.length*sp.factor;
  r[j]+=q.force*factor;K.add(j,j,q.tangent*factor);soil.push({zone:sp.zone,node:sp.node,axis:sp.axis,direction:sp.axis===0?'axial':sp.axis===3?'lateral':sp.sign===1?'uplift':'bearing',force:-q.force*factor,perLength:-q.force*sp.factor,displacement:delta,limited:engaged&&q.limited&&factor>0});
 }
 load.loads.forEach((v,j)=>r[5*j+1]+=v);load.forces.forEach((v,j)=>r[j]-=v);
 return {K,r,axial,soil,vm,slope:maxSlope};
}
export function equilibrium(i:ServiceInput,s:Scenario,mesh:number[],load:LoadState,seed:number[],check:()=>void=()=>{}):Equilibrium {
 const d=[...seed],n=d.length,active=new Set<string>();
 const length=mesh.at(-1)!,scaleD=Math.max(1,length),base=section(i),forceScale=Math.max(1,base.q*length,...load.loads.map(Math.abs),...load.forces.values()),gapTol=1e-8*Math.max(1,...d.map(Math.abs));
 for(const o of load.obstacles)if(d[5*o.node+1]<=o.height+gapTol)active.add(o.id);
 let iterations=0;
 for(let contact=0;contact<200;contact++){
  check();const fixed=new Map(load.fixed);for(const o of load.obstacles)if(active.has(o.id))fixed.set(5*o.node+1,o.height);
  fixed.forEach((v,j)=>d[j]=v);const free=Array.from({length:n},(_,j)=>j).filter(j=>!fixed.has(j)),map=new Int32Array(n).fill(-1);free.forEach((j,k)=>map[j]=k);
  let converged=false;
  const norm=(r:number[])=>Math.max(0,...free.map(j=>Math.abs(r[j])/(j%5===2||j%5===4?scaleD:1)));
  for(let it=0;it<80;it++){
   check();iterations++;const a=assemble(i,s,mesh,d,load),K=new BandMatrix(free.length,9);
   for(const j of free)for(let k=j;k<=Math.min(n-1,j+9);k++)if(map[k]>=0)K.add(map[j],map[k],a.K.get(j,k));
   const solve=bandFactor(K); // No regularization: tangent must remain positive definite.
   const error=norm(a.r);if(error<=1e-7*forceScale){converged=true;break;}
   const step=solve(free.map(j=>-a.r[j]));let accepted=false;
   for(let factor=1;factor>=1/4096;factor/=2){const trial=[...d];free.forEach((j,k)=>trial[j]+=factor*step[k]);const err=norm(assemble(i,s,mesh,trial,load).r);if(err<error){d.splice(0,n,...trial);accepted=true;break;}}
   if(!accepted)throw new Error('Permanent Newton line search unresolved.');
  }
  if(!converged)throw new Error('Permanent Newton iteration limit; unresolved.');
  const out=assemble(i,s,mesh,d,load);
  const tensile=load.obstacles.find(o=>active.has(o.id)&&out.r[5*o.node+1]<-1e-8*forceScale);
  if(tensile){active.delete(tensile.id);continue;}
  const penetration=load.obstacles.find(o=>!active.has(o.id)&&d[5*o.node+1]<o.height-gapTol);
  if(penetration){active.add(penetration.id);continue;}
  if(![...d,out.vm,out.slope,...out.axial].every(Number.isFinite))throw new Error('Non-finite permanent equilibrium.');
  return {d,residual:Math.max(0,...free.map(j=>Math.abs(out.r[j])/(j%5===2||j%5===4?scaleD:1))),reactions:out.r,contacts:load.obstacles.map(o=>({...o,reaction:active.has(o.id)?Math.max(0,out.r[5*o.node+1]):0,gap:d[5*o.node+1]-o.height})),soil:out.soil,axial:out.axial,vm:out.vm,slope:out.slope,iterations};
 }
 throw new Error('Permanent contact iteration limit; unresolved.');
}
