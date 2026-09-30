import type { ServiceInput, Stage, ScenarioResult } from './types';
export type SupportLayout = { kind:'none' } | { kind:'equidistant'; count:number } | { kind:'custom'; fractions:number[] };
export interface SupportContact { x:number; gap:number; reaction:number; state:'contact'|'detached'|'limit' }
export function supportFractions(i:ServiceInput):number[] {
  const s=i.supports;
  if(!s||s.kind==='none')return [];
  if(s.kind==='equidistant')return Array.from({length:s.count},(_,j)=>(j+1)/(s.count+1));
  return [...s.fractions].sort((a,b)=>a-b);
}
export function validateSupports(i:ServiceInput):string[] {
  if(i.mode==='supports')return Number.isInteger(i.maxSupports??10)&&(i.maxSupports??10)>=0&&(i.maxSupports??10)<=20&&(i.maxSupports??10)%2===0?[]:['Support search ceiling must be even, from 0 to 20.'];
  const s=i.supports;if(!s||s.kind==='none')return [];
  if(s.kind==='equidistant')return Number.isInteger(s.count)&&s.count>=2&&s.count<=20&&s.count%2===0?[]:['Use an even number of supports, from 2 to 20.'];
  if(s.kind!=='custom')return ['Unknown support layout.'];
  const f=s.fractions;
  if(!Array.isArray(f)||!f.length||f.length>20||f.some(x=>!Number.isFinite(x)||x<=0||x>=1||x===0.5)||new Set(f).size!==f.length)return ['Custom supports: 1–20 unique interior positions, excluding the actuator at the centre.'];
  return [];
}
/** Merge exact physical nodes into the nested uniform refinement grids. */
export function supportMesh(D:number,n:number,fractions:number[]):number[] {
  const nodes=[...Array.from({length:n+1},(_,j)=>D*j/n),...fractions.map(x=>x*D)].sort((a,b)=>a-b);
  const unique=[...new Set(nodes)];
  if(unique.some((x,j)=>j>0&&x-unique[j-1]<1e-9*Math.max(1,D)))throw new Error('Support spacing is too small for a numerically resolved mesh.');
  return unique;
}
export function supportPeaks(stages:Stage[]) {
  const first=stages.find(s=>s.supports?.length);if(!first)return [];
  return first.supports.map((v,j)=>{
    const peak=stages.reduce((a,b)=>(b.supports?.[j]?.reaction??0)>(a.supports?.[j]?.reaction??0)?b:a,first);
    return {...v,reaction:peak.supports[j].reaction,phase:peak.phase,fraction:peak.fraction};
  });
}

export function selectedStage(s:ScenarioResult,index?:number):Stage {return index===undefined?s.target??s.stages.at(-1):s.stages[index]??s.target??s.stages.at(-1);}

/** Resultant transverse force peaks, with signed components at that state. */
export function reactionPeaks(stages:Stage[]) {
  if(!stages.length)return [];
  return ([['Actuator','forceZ','forceY'],['Left clamp','leftZ','leftY'],['Right clamp','rightZ','rightY']] as const).map(([name,z,y])=>{
    const stage=stages.reduce((a,b)=>Math.hypot(b[z],b[y])>Math.hypot(a[z],a[y])?b:a);
    return {name,vertical:stage[z],lateral:stage[y],resultant:Math.hypot(stage[z],stage[y]),phase:stage.phase,fraction:stage.fraction};
  });
}
