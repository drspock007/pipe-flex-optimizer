import {backfillLoad,initialBackfillLoad} from './backfill-load';
import {effectiveFluidDensity} from '../fluid';
import type {ServiceInput} from '../types';
import {defaultPermanent,emptyZone,pairs,type PermanentProfile,type SoilCurve} from './profile';

/** Illustrative sensitivity cases, not calibrated soil classes or design values. */
export const SOIL_STARTERS = [
  {id:'soft',label:'More flexible response — example',factor:0.25},
  {id:'medium',label:'Intermediate response — example',factor:1},
  {id:'stiff',label:'Stiffer response — example',factor:4},
] as const;
export type SoilStarter=typeof SOIL_STARTERS[number]['id'];
export const STARTER_NOTE='Illustrative starting values, not site soil data. Review against project/geotechnical information; no universally conservative soil stiffness.';
export function soilStarter(id:SoilStarter){
 const factor=SOIL_STARTERS.find(v=>v.id===id)!.factor;
 const curve=(movement:number,resistance:number):SoilCurve=>({source:`${id} example v1: ${STARTER_NOTE}`,points:[{displacement:0,reaction:0},{displacement:movement,reaction:resistance*factor}]});
 return {axial:curve(20,20),lateral:curve(50,40),down:curve(10,100),up:curve(25,10)};
}
export function starterZone(){return {...emptyZone(),name:'Uniform backfill',bedOffset:0,weight:1,construction:0,...soilStarter('medium')};}
export function starterOperation(i:ServiceInput,name='Construction conditions repeated'){
 return {name,pressure:i.pressure,temperature:i.temperature,fluidDensity:effectiveFluidDensity(i)};
}
export function starterPermanent(i:ServiceInput):PermanentProfile{
 return {...defaultPermanent(),defaultsReviewed:false,reusePositions:!!i.supports&&i.supports.kind!=='none',pairs:[.25],verticalTolerance:10,lateralTolerance:10,zones:[{...starterZone(),loadEstimate:initialBackfillLoad(i.od),weight:backfillLoad(initialBackfillLoad(i.od))}],operations:[starterOperation(i)]};
}
export type BackfillLayout='uniform'|'halves'|'ends';
export function backfillLayout(kind:BackfillLayout,base:PermanentProfile['zones'][number]){
 const zones=kind==='uniform'?[{name:'Full excavation',start:0,end:1,step:1}]:kind==='halves'?[{name:'Left half',start:0,end:.5,step:1},{name:'Right half',start:.5,end:1,step:2}]:[{name:'Left end',start:0,end:.25,step:1},{name:'Centre',start:.25,end:.75,step:2},{name:'Right end',start:.75,end:1,step:1}];
 return zones.map(z=>({...structuredClone(base),...z}));
}
/** Split the longest zone; preserve full coverage and copy its documented properties. */
export function splitBackfillZone(zones:PermanentProfile['zones']){
 if(!zones.length)return [starterZone()];
 const index=zones.reduce((best,z,j)=>z.end-z.start>zones[best].end-zones[best].start?j:best,0),z=zones[index],mid=(z.start+z.end)/2;
 return zones.flatMap((v,j)=>j!==index?[structuredClone(v)]:[{...structuredClone(z),name:z.name+' — left',end:mid},{...structuredClone(z),name:z.name+' — right',start:mid}]);
}
/** Explicit fill action only: never refill a field while the user is clearing it. */
export function fillPermanentBlanks(i:ServiceInput):PermanentProfile{
 const p=structuredClone(i.permanent??starterPermanent(i)),fallback=starterPermanent(i);
 const finite=(value:number,replacement:number)=>Number.isFinite(value)?value:replacement;
 p.defaultsReviewed=false;
 p.verticalTolerance=finite(p.verticalTolerance,10);p.lateralTolerance=finite(p.lateralTolerance,10);
 if(!p.pairs.length)p.pairs=[.25];else p.pairs=p.pairs.map((x,j)=>finite(x,.5*(j+1)/(p.pairs.length+1)));
 if(!p.zones.length)p.zones=fallback.zones;
 p.zones=p.zones.map((zone,j)=>{
  const sample=starterZone(),z={...zone,name:zone.name.trim()?zone.name:`Zone ${j+1}`};
  for(const k of ['start','end','step','bedOffset','weight','construction'] as const)z[k]=finite(z[k],k==='start'?j/p.zones.length:k==='end'?(j+1)/p.zones.length:sample[k]);
  for(const key of ['axial','lateral','down','up'] as const){const c=z[key],end=sample[key].points[1];z[key]={source:c.source.trim()?(c.points.some(pt=>!Number.isFinite(pt.displacement)||!Number.isFinite(pt.reaction))?c.source+'; missing points filled from '+sample[key].source:c.source):sample[key].source,points:c.points.map((pt,k)=>({displacement:finite(pt.displacement,end.displacement*k/(c.points.length-1)),reaction:finite(pt.reaction,end.reaction*k/(c.points.length-1))}))};}
  if(z.loadEstimate){const e=initialBackfillLoad(i.od);z.loadEstimate={cover:finite(z.loadEstimate.cover,e.cover),width:finite(z.loadEstimate.width,e.width),density:finite(z.loadEstimate.density,e.density)};z.weight=backfillLoad(z.loadEstimate);}
  return z;
 });
 if(!p.operations.length)p.operations=fallback.operations;
 p.operations=p.operations.map((o,j)=>({...o,name:o.name.trim()?o.name:`Operating case ${j+1}`,pressure:finite(o.pressure,i.pressure),temperature:finite(o.temperature,i.temperature),fluidDensity:finite(o.fluidDensity,effectiveFluidDensity(i))}));
 if(p.heightMode==='common')p.heights=pairs({...i,permanent:p}).map((_,j)=>finite(p.heights[j],0));
 return p;
}
