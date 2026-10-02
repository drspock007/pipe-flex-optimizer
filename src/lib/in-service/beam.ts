import { supportMesh, type SupportContact } from './supports';
import { BandMatrix, bandFactor } from '../mechanics-v2/banded';
import { elementMatrixN, endActionsN, slopeSquared, hermiteAt, hermiteCoeffs, momentCoeffsN } from '../mechanics-v2/restrained-element';
import { polyAdd, polyMul, polyEval, polyDeriv, extremaCandidates } from '../mechanics-v2/poly-roots';
import type { Section, Stage } from './types';

interface Plane { d: number[]; res: number[]; contacts?:SupportContact[]; contactIterations?:number }
function plane(EI: number, N: number, q: number, D: number, n: number, middle: number|null, mesh?:number[], active:number[]=[]): Plane {
  const nd=2*(n+1), mid=mesh?2*mesh.indexOf(D/2):n, d=new Array<number>(nd).fill(0);
  const fixed=new Set([0,1,nd-2,nd-1]);
  active.forEach(j=>fixed.add(2*j));
  if(middle!==null) { fixed.add(mid); d[mid]=middle; }
  const map=new Int32Array(nd).fill(-1), free:number[]=[];
  for(let j=0;j<nd;j++) if(!fixed.has(j)) {map[j]=free.length; free.push(j);}
  const length=(e:number)=>mesh?mesh[e+1]-mesh[e]:D/n;
  const K=new BandMatrix(free.length,3);
  for(let e=0;e<n;e++) {
    const ke=elementMatrixN(EI,N,length(e));
    for(let a=0;a<4;a++) for(let b=a;b<4;b++) {
      const j=map[2*e+a], k=map[2*e+b]; if(j>=0&&k>=0) K.add(j,k,ke[a][b]);
    }
  }
  const residual=() => {
    const r=new Array<number>(nd).fill(0);
    for(let e=0;e<n;e++) endActionsN(EI,N,q,length(e),d.slice(2*e,2*e+4)).forEach((v,j)=>r[2*e+j]+=v);
    return r;
  };
  const solve=bandFactor(K);
  for(let pass=0;pass<3;pass++) {
    const r=residual(), correction=solve(free.map(j=>-r[j]));
    free.forEach((j,k)=>d[j]+=correction[k]);
  }
  const res=residual();
  const forceScale=Math.max(1,Math.abs(q*D),...res.map((v,j)=>Math.abs(v)/(j%2?D:1)));
  const freeResidual=Math.max(0,...free.map(j=>Math.abs(res[j])/(j%2?D:1)));
  if(!Number.isFinite(freeResidual) || freeResidual>1e-7*forceScale) throw new Error('Free-DOF equilibrium residual exceeds tolerance.');
  return {d,res};
}
/** Primal/dual active set for vertical point obstacles, on the positive stiffness branch. */
function contactPlane(EI:number,N:number,q:number,D:number,mesh:number[],middle:number|null,supportNodes:number[],seed:Set<number>,check:()=>void):Plane {
  const active=new Set(seed),seen=new Set<string>();
  for(let iteration=0;iteration<200;iteration++) {
    check();const key=[...active].sort((a,b)=>a-b).join(',');
    if(seen.has(key))throw new Error('Support contact active-set cycle; unresolved.');seen.add(key);
    const out=plane(EI,N,q,D,mesh.length-1,middle,mesh,[...active]);
    const dispScale=Math.max(1,Math.abs(middle??0),...out.d.filter((_,j)=>j%2===0).map(Math.abs));
    const forceScale=Math.max(1,Math.abs(q*D),...out.res.filter((_,j)=>j%2===0).map(Math.abs));
    const gapTol=1e-8*dispScale,forceTol=1e-8*forceScale;
    // Remove a tensile constraint first, then admit the deepest penetrating free support.
    const tensile=[...active].filter(j=>out.res[2*j]<-forceTol).sort((a,b)=>out.res[2*a]-out.res[2*b]);
    if(tensile.length){active.delete(tensile[0]);continue;}
    const penetrating=supportNodes.filter(j=>!active.has(j)&&out.d[2*j]<-gapTol).sort((a,b)=>out.d[2*a]-out.d[2*b]);
    if(penetrating.length){active.add(penetrating[0]);continue;}
    seed.clear();active.forEach(j=>seed.add(j));
    out.contacts=supportNodes.map(j=>({x:mesh[j],gap:out.d[2*j],reaction:active.has(j)?Math.max(0,out.res[2*j]):0,
      state:out.d[2*j]>gapTol?'detached':out.res[2*j]>forceTol?'contact':'limit'}));
    out.contactIterations=iteration+1;return out;
  }
  throw new Error('Support contact did not converge in 200 iterations.');
}
export interface BeamState { N:number; z:Plane; y:Plane; compatibility:number; iterations:number; mesh?:number[] }
export function solveBeam(p:Section,D:number,n:number,N0:number,q:number,z:number|null,y:number|null,check=()=>{},fractions:number[]=[],contactSeed=new Set<number>()):BeamState {
  if(n%2 || n<4) throw new Error('Beam mesh requires an even element count >=4.');
  const mesh=fractions.length?supportMesh(D,n,fractions):undefined;
  const count=mesh?mesh.length-1:n, supportNodes=fractions.map(f=>mesh?.indexOf(f*D)??-1);
  const c=p.EA/(2*D);
  const evaluate=(N:number) => {
    check();
    const vz=mesh?contactPlane(p.EI,N,q,D,mesh,z,supportNodes,contactSeed,check):plane(p.EI,N,q,D,n,z), vy=plane(p.EI,N,0,D,count,y,mesh);
    let S=0;
    for(let e=0;e<count;e++) {const l=mesh?mesh[e+1]-mesh[e]:D/n;S+=slopeSquared(l,vz.d.slice(2*e,2*e+4))+slopeSquared(l,vy.d.slice(2*e,2*e+4));}
    const geometric=c*S, h=N-N0-geometric;
    if(![S,N,h].every(Number.isFinite)||S<0) throw new Error('Non-finite axial compatibility.');
    return {N,z:vz,y:vy,h,geometric};
  };
  let lo=evaluate(N0), hi=evaluate(N0+lo.geometric), iterations=2;
  const tolerance=1e-8*Math.max(1,Math.abs(N0),hi.N-lo.N);
  const out=(v:ReturnType<typeof evaluate>):BeamState=>({N:v.N,z:v.z,y:v.y,compatibility:Math.abs(v.h),iterations,mesh});
  if(Math.abs(lo.h)<=tolerance) return out(lo);
  if(Math.abs(hi.h)<=tolerance) return out(hi);
  if(!(lo.h<0 && hi.h>=0)) throw new Error('Could not establish axial compatibility bracket.');
  let side=0;
  while(iterations++<80) {
    let N=(lo.N*hi.h-hi.N*lo.h)/(hi.h-lo.h);
    if(!(N>lo.N && N<hi.N)) N=(lo.N+hi.N)/2;
    const mid=evaluate(N);
    if(Math.abs(mid.h)<=tolerance) return out(mid);
    if(mid.h<0) {lo=mid;if(side===-1) hi={...hi,h:hi.h/2};side=-1;}
    else {hi=mid;if(side===1) lo={...lo,h:lo.h/2};side=1;}
  }
  throw new Error('Axial compatibility did not converge.');
}
function magnitudeMax(a:number[],b:number[]) {
  const sq=polyAdd(polyMul(a,a),polyMul(b,b));
  let value=-1,u=0;
  for(const x of extremaCandidates(sq)) {const v=Math.hypot(polyEval(a,x),polyEval(b,x));if(v>value){value=v;u=x;}}
  return {value,u};
}
/** Conservative section bound, including radial pressure and beam shear. */
export function stressBound(p:Section, wall:number, moment:number, shear:number) {
  const normal=Math.max(...[p.ri,p.ro].map(r=>Math.sqrt((Math.abs(wall/p.A-p.a)+moment*r/p.I)**2+3*(p.b/(r*r))**2)));
  const tau=shear*(p.ro*p.ro+p.ro*p.ri+p.ri*p.ri)/(3*p.I);
  return {normal,vm:Math.hypot(normal,Math.sqrt(3)*tau)};
}
export function recover(p:Section,D:number,n:number,pressure:number,q:number,b:BeamState,phase:Stage['phase'],fraction:number):Stage {
  const wall=b.N+pressure*p.Ai, mesh=b.mesh, mid=mesh?2*mesh.indexOf(D/2):n;
  if(mesh)n=mesh.length-1;
  const firstLength=mesh?mesh[1]:D/n;
  const base=stressBound(p,wall,0,0);
  const out:Stage={phase,fraction,vm:base.vm,normalVm:base.normal,x:0,shearX:0,element:[0,firstLength],N:b.N,wall,
    midZ:b.z.d[mid],midY:b.y.d[mid],forceZ:b.z.res[mid],forceY:b.y.res[mid],
    leftZ:b.z.res[0],rightZ:b.z.res[2*n],leftY:b.y.res[0],rightY:b.y.res[2*n],
    leftMz:b.z.res[1],rightMz:b.z.res[2*n+1],leftMy:b.y.res[1],rightMy:b.y.res[2*n+1],
    sagMax:0,sagX:0,maxSlope:0,residual:b.compatibility,shape:[],supports:b.z.contacts,contactIterations:b.z.contactIterations};
  for(let e=0;e<n;e++) {
    const l=mesh?mesh[e+1]-mesh[e]:D/n, x0=mesh?mesh[e]:e*l;
    const dz=b.z.d.slice(2*e,2*e+4),dy=b.y.d.slice(2*e,2*e+4);
    const az=endActionsN(p.EI,b.N,q,l,dz),ay=endActionsN(p.EI,b.N,0,l,dy);
    const mz=momentCoeffsN(l,b.N,q,dz,az[0],az[1]),my=momentCoeffsN(l,b.N,0,dy,ay[0],ay[1]);
    const moment=magnitudeMax(mz,my), shear=magnitudeMax(polyDeriv(mz).map(v=>v/l),polyDeriv(my).map(v=>v/l));
    const stress=stressBound(p,wall,moment.value,shear.value);
    if(stress.vm>=out.vm) Object.assign(out,{vm:stress.vm,normalVm:stress.normal,x:x0+moment.u*l,shearX:x0+shear.u*l,element:[x0,x0+l]});
    const zCoeffs=hermiteCoeffs(l,dz);
    for(const u of extremaCandidates(zCoeffs)){const sag=-polyEval(zCoeffs,u);if(sag>out.sagMax){out.sagMax=sag;out.sagX=x0+u*l;}}
    const sz=polyDeriv(hermiteCoeffs(l,dz)).map(v=>v/l),sy=polyDeriv(hermiteCoeffs(l,dy)).map(v=>v/l);
    out.maxSlope=Math.max(out.maxSlope,magnitudeMax(sz,sy).value);
    for(let j=0;j<2;j++) out.shape.push({x:x0+j*l/2,z:hermiteAt(l,dz,j/2).w,y:hermiteAt(l,dy,j/2).w});
  }
  out.shape.push({x:D,z:0,y:0});
  if(![out.vm,out.maxSlope,out.forceZ,out.forceY,out.x].every(Number.isFinite)) throw new Error('Non-finite recovered state.');
  return out;
}
