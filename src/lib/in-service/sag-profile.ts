import type {ServiceInput,Status} from './types';
export interface SagProfile {version:1; boundary:'clamped'|'simple'; confirmed:boolean; limit?:number}
export interface SagAssessment {value:number; x:number; uncertainty:number; status:Status|'not-requested'}
export const defaultSag=():SagProfile=>({version:1,boundary:'clamped',confirmed:false});
export const SAG_SCOPE='One level span only; no intermediate supports, overhangs, soil or backfill. Static elastic beam assessment, not lifting approval. Inclined slings, dynamic effects, local contact, support capacity, ovalization, defects, welds and fatigue are not assessed. Full span / OD >= 10; maximum slope <= 0.1.';
export function validateSag(i:ServiceInput):string[]{
 if(i.analysis!=='sag')return [];
 const p=i.sag,errors:string[]=[];
 if(!p||p.version!==1||!['clamped','simple'].includes(p.boundary))return ['Select a valid sag-only boundary configuration.'];
 if(!p.confirmed)errors.push('Confirm that the selected sag-only boundary conditions represent the installation.');
 if(i.intervention==='permanent')errors.push('Sag only is separate from the permanent backfill sequence.');
 if(!['direct','length'].includes(i.mode))errors.push('Sag only supports fixed span and Find L only.');
 if((i.mode==='length'||p.limit!==undefined)&&!(Number.isFinite(p.limit)&&p.limit>0))errors.push('Enter a finite positive sag limit (required for Find L).');
 if(p.boundary==='simple'){
  if(i.pressure!==0)errors.push('Simple supports require zero internal gauge pressure.');
  if(i.scenarios.some(s=>s.extraAxial!==0))errors.push('Simple supports require zero extra axial force in every scenario. Axial sliding is free.');
 }
 return errors;
}
export const emptyPipe=(i:ServiceInput):ServiceInput=>({...i,fluidType:'custom',fluidDensity:0,pressure:0});
