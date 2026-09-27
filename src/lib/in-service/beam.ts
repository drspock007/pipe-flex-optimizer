import { BandMatrix, bandFactor } from '../mechanics-v2/banded';
import { elementMatrixN, endActionsN, slopeSquared, hermiteAt, hermiteCoeffs, momentCoeffsN } from '../mechanics-v2/restrained-element';
import { polyAdd, polyMul, polyEval, polyDeriv, extremaCandidates } from '../mechanics-v2/poly-roots';
import type { Section, Stage } from './types';

interface Plane { d: number[]; res: number[] }
function plane(EI: number, N: number, q: number, D: number, n: number, middle: number|null): Plane {
  const nd=2*(n+1), l=D/n, d=new Array<number>(nd).fill(0);
  const fixed=new Set([0,1,nd-2,nd-1]);
  if(middle!==null) { fixed.add(n); d[n]=middle; }
  const map=new Int32Array(nd).fill(-1), free:number[]=[];
  for(let j=0;j<nd;j++) if(!fixed.has(j)) {map[j]=free.length; free.push(j);}
  const K=new BandMatrix(free.length,3), ke=elementMatrixN(EI,N,l);
  for(let e=0;e<n;e++) for(let a=0;a<4;a++) for(let b=a;b<4;b++) {
    const j=map[2*e+a], k=map[2*e+b]; if(j>=0&&k>=0) K.add(j,k,ke[a][b]);
  }
  const residual=() => {
    const r=new Array<number>(nd).fill(0);
    for(let e=0;e<n;e++) endActionsN(EI,N,q,l,d.slice(2*e,2*e+4)).forEach((v,j)=>r[2*e+j]+=v);
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
export interface BeamState { N:number; z:Plane; y:Plane; compatibility:number; iterations:number }
export function solveBeam(p:Section,D:number,n:number,N0:number,q:number,z:number|null,y:number|null,check=()=>{}):BeamState {
  if(n%2 || n<4) throw new Error('Beam mesh requires an even element count >=4.');
  const c=p.EA/(2*D), l=D/n;
  const evaluate=(N:number) => {
    check();
    const vz=plane(p.EI,N,q,D,n,z), vy=plane(p.EI,N,0,D,n,y);
    let S=0;
    for(let e=0;e<n;e++) S+=slopeSquared(l,vz.d.slice(2*e,2*e+4))+slopeSquared(l,vy.d.slice(2*e,2*e+4));
    const geometric=c*S, h=N-N0-geometric;
    if(![S,N,h].every(Number.isFinite)||S<0) throw new Error('Non-finite axial compatibility.');
    return {N,z:vz,y:vy,h,geometric};
  };
  let lo=evaluate(N0), hi=evaluate(N0+lo.geometric), iterations=2;
  const tolerance=1e-8*Math.max(1,Math.abs(N0),hi.N-lo.N);
  const out=(v:ReturnType<typeof evaluate>):BeamState=>({N:v.N,z:v.z,y:v.y,compatibility:Math.abs(v.h),iterations});
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
  const wall=b.N+pressure*p.Ai, l=D/n;
  const base=stressBound(p,wall,0,0);
  const out:Stage={phase,fraction,vm:base.vm,normalVm:base.normal,x:0,shearX:0,element:[0,l],N:b.N,wall,
    midZ:b.z.d[n],midY:b.y.d[n],forceZ:b.z.res[n],forceY:b.y.res[n],
    leftZ:b.z.res[0],rightZ:b.z.res[2*n],leftY:b.y.res[0],rightY:b.y.res[2*n],
    leftMz:b.z.res[1],rightMz:b.z.res[2*n+1],leftMy:b.y.res[1],rightMy:b.y.res[2*n+1],
    maxSlope:0,residual:b.compatibility,shape:[]};
  for(let e=0;e<n;e++) {
    const dz=b.z.d.slice(2*e,2*e+4),dy=b.y.d.slice(2*e,2*e+4);
    const az=endActionsN(p.EI,b.N,q,l,dz),ay=endActionsN(p.EI,b.N,0,l,dy);
    const mz=momentCoeffsN(l,b.N,q,dz,az[0],az[1]),my=momentCoeffsN(l,b.N,0,dy,ay[0],ay[1]);
    const moment=magnitudeMax(mz,my), shear=magnitudeMax(polyDeriv(mz).map(v=>v/l),polyDeriv(my).map(v=>v/l));
    const stress=stressBound(p,wall,moment.value,shear.value);
    if(stress.vm>=out.vm) Object.assign(out,{vm:stress.vm,normalVm:stress.normal,x:(e+moment.u)*l,shearX:(e+shear.u)*l,element:[e*l,(e+1)*l]});
    const sz=polyDeriv(hermiteCoeffs(l,dz)).map(v=>v/l),sy=polyDeriv(hermiteCoeffs(l,dy)).map(v=>v/l);
    out.maxSlope=Math.max(out.maxSlope,magnitudeMax(sz,sy).value);
    for(let j=0;j<2;j++) out.shape.push({x:(e+j/2)*l,z:hermiteAt(l,dz,j/2).w,y:hermiteAt(l,dy,j/2).w});
  }
  out.shape.push({x:D,z:0,y:0});
  if(![out.vm,out.maxSlope,out.forceZ,out.forceY,out.x].every(Number.isFinite)) throw new Error('Non-finite recovered state.');
  return out;
}
