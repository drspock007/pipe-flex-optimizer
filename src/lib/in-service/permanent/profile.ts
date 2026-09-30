import {backfillLoad} from './backfill-load';
import { z } from 'zod';
import type {ServiceInput} from '../types';
import {supportFractions} from '../supports';
const num=z.number().finite().nullable().transform(v=>v===null?NaN:v);
const curve=z.object({source:z.string(),points:z.array(z.object({displacement:num,reaction:num})).min(2).max(30)});
/** Canonical units: mm, N, MPa, C. Distributed reactions N/mm. */
export const permanentSchema=z.object({
 version:z.literal(1),defaultsReviewed:z.boolean().optional(),clampsConfirmed:z.boolean(),propertiesConfirmed:z.boolean(),
 initialSupports:z.enum(['keep','remove']),release:z.enum(['before','after']),
 reusePositions:z.boolean(),pairs:z.array(num).max(10),heightMode:z.enum(['fitted','common']),heights:z.array(num).max(10),
 removalOrder:z.array(num).max(10),verticalTolerance:num,lateralTolerance:num,
 zones:z.array(z.object({name:z.string(),material:z.string().optional(),loadEstimate:z.object({cover:num,width:num,density:num}).optional(),start:num,end:num,step:num,bedOffset:num,weight:num,construction:num,axial:curve,lateral:curve,down:curve,up:curve})).max(20),
 operations:z.array(z.object({name:z.string(),pressure:num,temperature:num,fluidDensity:num})).max(12),
});
export type PermanentProfile=z.infer<typeof permanentSchema>;
export type SoilCurve=PermanentProfile['zones'][number]['axial'];
export const emptyCurve=():SoilCurve=>({source:'',points:[{displacement:0,reaction:0},{displacement:NaN,reaction:NaN}]});
export const emptyZone=():PermanentProfile['zones'][number]=>({name:'Backfill',start:0,end:1,step:1,bedOffset:NaN,weight:NaN,construction:NaN,axial:emptyCurve(),lateral:emptyCurve(),down:emptyCurve(),up:emptyCurve()});
export const defaultPermanent=():PermanentProfile=>({version:1,clampsConfirmed:false,propertiesConfirmed:false,initialSupports:'keep',release:'after',reusePositions:true,pairs:[1/3],heightMode:'fitted',heights:[],removalOrder:[],verticalTolerance:NaN,lateralTolerance:NaN,zones:[emptyZone()],operations:[]});
export function pairs(i:ServiceInput):number[]{return i.permanent.reusePositions?supportFractions(i).filter(f=>f<.5).sort((a,b)=>b-a):[...i.permanent.pairs].sort((a,b)=>b-a);}
export function validatePermanent(i:ServiceInput):string[]{
 if(i.intervention!=='permanent')return [];
 const parse=permanentSchema.safeParse(i.permanent);if(!parse.success)return ['Complete the permanent profile (version 1).'];
 const p=parse.data,errors:string[]=[];
 if(i.mode!=='direct')errors.push('Permanent assessment supports direct calculation only.');
 if(!p.clampsConfirmed)errors.push('Confirm that ideal end clamps represent the adjacent buried pipe.');
 if(!p.propertiesConfirmed)errors.push('Confirm steel properties cover every construction and operating temperature.');
 for(const k of ['verticalTolerance','lateralTolerance'] as const)if(!Number.isFinite(p[k])||p[k]<0)errors.push(`Enter a finite nonnegative ${k}.`);
 const f=supportFractions(i),ps=pairs(i);
 if(f.some(x=>!f.some(y=>Math.abs(x+y-1)<1e-12)))errors.push('Initial supports must form symmetric pairs.');
 if(!ps.length||ps.some(x=>!Number.isFinite(x)||x<=0||x>=.5)||new Set(ps).size!==ps.length)errors.push('Provide 1–10 distinct support pairs inside the span, excluding the centre.');
 if(p.heightMode==='common'&&(p.heights.length!==ps.length||p.heights.some(x=>!Number.isFinite(x))))errors.push('Provide one common height per pair.');
 if(p.removalOrder.length&&(p.removalOrder.length!==ps.length||new Set(p.removalOrder).size!==ps.length||p.removalOrder.some(x=>!Number.isInteger(x)||x<0||x>=ps.length)))errors.push('Removal order must contain each pair index exactly once.');
 if(!p.zones.length)errors.push('Provide documented backfill zones.');
 const zones=[...p.zones].sort((a,b)=>a.start-b.start);
 if(zones[0]?.start!==0||zones.at(-1)?.end!==1||zones.some((v,j)=>j>0&&Math.abs(v.start-zones[j-1].end)>1e-12))errors.push('Backfill zones must cover the full span without overlap or gaps.');
 for(const v of zones){
  if(v.loadEstimate){const q=backfillLoad(v.loadEstimate);if(!Number.isFinite(q)||!Number.isFinite(v.weight)||Math.abs(v.weight-q)>1e-12*Math.max(1,q))errors.push(`Invalid backfill weight estimate for ${v.name}: check cover, width, density and derived load.`);}
  if(!v.name.trim()||![v.start,v.end,v.step,v.bedOffset,v.weight,v.construction].every(Number.isFinite)||v.start<0||v.end>1||v.end<=v.start||!Number.isInteger(v.step)||v.step<1||v.step>20||v.bedOffset<0||v.weight<0||v.construction<0)errors.push(`Invalid zone ${v.name}: complete geometry, stage, gap and loads.`);
  for(const key of ['axial','lateral','down','up'] as const){const c=v[key];if(!c.source.trim()||c.points[0]?.displacement!==0||c.points[0]?.reaction!==0||c.points.some((x,j)=>!Number.isFinite(x.displacement)||!Number.isFinite(x.reaction)||x.displacement<0||x.reaction<0||(j>0&&(x.displacement<=c.points[j-1].displacement||x.reaction<c.points[j-1].reaction)))||!(c.points.at(-1)?.reaction>0))errors.push(`Document a monotone ${key} soil curve for ${v.name}, starting at (0,0) with positive terminal resistance.`);}
 }
 if(!p.operations.length)errors.push('Provide at least one future operating case with explicit fluid density.');
 for(const o of p.operations)if(!o.name.trim()||![o.pressure,o.temperature,o.fluidDensity].every(Number.isFinite)||o.pressure<0||o.temperature<=-273.15||o.fluidDensity<0)errors.push('Complete operating cases with nonnegative gauge pressure and density.');
 return errors;
}
