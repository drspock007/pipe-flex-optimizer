import type { ServiceInput } from './types';
import { format, type ServiceUnit } from './display';
import type { UnitSystem } from '../unit-conversions';

export interface CsaProfile {
  enabled: boolean;
  eligibleSteel: boolean;
  plainPipeline: boolean;
  anchored: boolean;
  designPressure: number;
  designTemperature: number;
  anchoringTemperature: number;
  nominalThickness: number;
  allowance: number;
  smys: number;
}
export const emptyCsa = (): CsaProfile => ({enabled:false,eligibleSteel:false,plainPipeline:false,anchored:false,designPressure:NaN,designTemperature:NaN,anchoringTemperature:NaN,nominalThickness:NaN,allowance:NaN,smys:NaN});
export type CsaStatus = 'pass' | 'fail' | 'not-applicable' | 'not-assessed';
export const CSA_STATUS: Record<CsaStatus,string> = {pass:'Satisfied',fail:'Exceeded','not-applicable':'Not applicable','not-assessed':'Not assessed'};
export const CSA_SCOPE = 'Partial checks only; lifting is not assessed under CSA. No overall CSA compliance verdict. Custom criteria alone govern searches.';
export interface CsaValue { name:string; value:number; unit:ServiceUnit }
export interface CsaCheck {
  id:string; reference:string; title:string; status:CsaStatus; formula:string; reason:string;
  values:CsaValue[]; demand?:number; limit?:number; utilization?:number; unit:ServiceUnit;
}
export interface CsaAssessment { version:'csa-z662-2023-targeted-1'; checks:CsaCheck[] }
// User-supplied CSA Z662:2023 table 4.5, plain pipeline column only.
const MIN_WALL: [number,number][] = [
  [10.3,1.7],[13.7,2.2],[17.1,2.3],[21.3,2.1],[26.7,2.1],[33.4,2.1],[42.2,2.1],[48.3,2.1],[60.3,2.1],[73,2.1],[88.9,2.1],[101.6,2.1],[114.3,2.1],[141.3,2.1],[168.3,2.1],
  [219.1,3.2],[273.1,4],[323.9,4.4],[355.6,4.8],[406.4,4.8],[457,4.8],[508,4.8],
  ...[559,610,660,711,762,813,864,914].map(d=>[d,5.6] as [number,number]),
  ...[965,1016,1067,1118,1168,1219,1270,1321,1372].map(d=>[d,6.4] as [number,number]),
  ...[1422,1473,1524,1575,1626,1677,1727,1778,1829].map(d=>[d,9.5] as [number,number]),
  ...[1880,1930,1981,2032].map(d=>[d,10.3] as [number,number]),
];
export function minimumWall(od:number):[number,number]|undefined {
  return Number.isFinite(od)&&od>=10.3 ? MIN_WALL.find(([d])=>d>=od) : undefined;
}
export function temperatureFactor(t:number):number|undefined {
  if(!Number.isFinite(t)||t<=-273.15||t>230)return undefined;
  if(t<=120)return 1;
  const rows=[[120,1],[150,.97],[180,.93],[200,.91],[230,.87]];
  const k=rows.findIndex(([temperature])=>temperature>=t),[x,y]=rows[k],[x0,y0]=rows[k-1];
  return y0+(y-y0)*(t-x0)/(x-x0);
}
export function evaluateCsa(i:ServiceInput):CsaAssessment|undefined {
  const p=i.csa;if(!p?.enabled)return undefined;
  const value=(name:string,v:number,unit:ServiceUnit):CsaValue=>({name,value:v,unit});
  const thickness:CsaCheck={id:'wall',reference:'4.3.11.2 / Table 4.5',title:'Minimum nominal wall',status:'not-assessed',formula:'t_nom >= table minimum (next larger listed OD)',reason:'Confirm eligible steel and plain pipeline scope; enter a valid nominal thickness and listed-range OD.',unit:'mm',values:[value('OD',i.od,'mm'),value('Nominal thickness',p.nominalThickness,'mm')]};
  const temp:CsaCheck={id:'temperature',reference:'4.3.9 / Table 4.4',title:'Temperature factor',status:'not-assessed',formula:'T = table value / linear interpolation',reason:'Confirm eligible steel and enter design temperature within the documented domain (<= 230 C).',unit:'scalar',values:[value('Design temperature',p.designTemperature,'C')]};
  const anchored:CsaCheck={id:'anchored',reference:'4.7.1; 4.6.5; 4.6.6',title:'Anchored design state (no lifting)',status:'not-assessed',formula:'tn = t_nom - allowance; Sh = P D / (2 tn); SL = nu Sh - E alpha (T2 - T1); Sh - SL <= 0.90 S T (calculated in mm, MPa, C)',reason:'Complete and confirm the anchored design-state inputs.',unit:'MPa',values:[value('Design pressure',p.designPressure,'pressure'),value('OD',i.od,'mm'),value('Nominal thickness',p.nominalThickness,'mm'),value('Allowance',p.allowance,'mm'),value('SMYS',p.smys,'MPa'),value('T2',p.designTemperature,'C'),value('T1',p.anchoringTemperature,'C'),value('E',207000,'MPa'),value('nu',.3,'scalar'),value('alpha',12e-6,'alpha')]};
  const row=minimumWall(i.od), T=temperatureFactor(p.designTemperature);
  if(p.eligibleSteel&&p.plainPipeline&&row&&Number.isFinite(p.nominalThickness)&&p.nominalThickness>0&&2*p.nominalThickness<i.od){
    Object.assign(thickness,{status:p.nominalThickness>=row[1]?'pass':'fail',demand:row[1],limit:p.nominalThickness,utilization:row[1]/p.nominalThickness,reason:'Minimum required / provided nominal wall. Pressure design and local defects are not assessed.'});
    thickness.values.push(value('Selected table OD',row[0],'mm'),value('Required minimum',row[1],'mm'));
  }
  if(p.eligibleSteel&&T!==undefined){temp.status='pass';temp.reason='Factor determined only; this is not a temperature suitability approval.';temp.values.push(value('T factor',T,'scalar'));}
  const problems:string[]=[];
  if(!p.eligibleSteel||!p.plainPipeline||!p.anchored)problems.push('Eligibility, plain pipeline and axial restraint must all be confirmed.');
  if(![i.od,i.pressure,i.temperature,p.designPressure,p.designTemperature,p.anchoringTemperature,p.nominalThickness,p.allowance,p.smys].every(Number.isFinite))problems.push('Required numerical inputs are missing or invalid.');
  if(!(i.od>0&&p.designPressure>=0&&p.nominalThickness>0&&2*p.nominalThickness<i.od&&p.allowance>=0&&p.allowance<p.nominalThickness&&p.smys>0))problems.push('Require valid diameter, pressure, nominal wall, allowance and SMYS; tn must be positive.');
  if(T===undefined||p.anchoringTemperature<=-273.15||p.anchoringTemperature>230)problems.push('Temperature is outside the supported material-constant domain.');
  if(p.designPressure<i.pressure||p.designTemperature<i.temperature||p.designTemperature<p.anchoringTemperature)problems.push('Design pressure/maximum temperature must cover operation; maximum temperature must cover anchoring temperature.');
  if(!i.scenarios.length||i.scenarios.some(s=>!Number.isFinite(s.extraAxial)||s.extraAxial!==0))problems.push('Additional axial force is nonzero or unknown in at least one scenario.');
  if(problems.length)anchored.reason=problems.join(' ');
  else {
    const tn=p.nominalThickness-p.allowance,sh=p.designPressure*i.od/(2*tn),sl=.3*sh-207000*12e-6*(p.designTemperature-p.anchoringTemperature),demand=sh-sl,limit=.90*p.smys*T;
    anchored.values.push(value('tn',tn,'mm'),value('Sh',sh,'MPa'),value('SL',sl,'MPa'),value('T factor',T,'scalar'));
    if(![sh,sl,demand,limit,demand/limit].every(Number.isFinite)||limit<=0)anchored.reason='Derived values are not representable; no verdict.';
    else if(sl>0){anchored.status='not-applicable';anchored.reason='SL is tensile (> 0); article 4.7.1 does not apply. Lifting remains unassessed.';}
    else Object.assign(anchored,{status:demand<=limit?'pass':'fail',demand,limit,utilization:demand/limit,reason:'Anchored pressure/temperature design state only; excludes imposed bending, additional axial loads and the intervention path.'});
  }
  const deferred=(id:string,reference:string,title:string,reason:string):CsaCheck=>({id,reference,title,reason,status:'not-assessed',formula:'Not implemented',values:[],unit:'scalar'});
  if(i.analysis==='sag'&&i.sag?.boundary==='simple'){anchored.status='not-applicable';anchored.reason='Axially free simple supports: anchored design-state check does not apply to this configuration.';delete anchored.demand;delete anchored.limit;delete anchored.utilization;}
  return {version:'csa-z662-2023-targeted-1',checks:[thickness,temp,anchored,
    deferred('bending','4.7.2','Bending and stability','Sustained-load mapping and the normative stability check are not established. The solver Euler screen is not a CSA check.'),
    deferred('annex-c','Annex C','Limit states',i.fluidType==='hydrogen'?'Hydrogen is excluded from Annex C scope. No Annex C check is implemented.':'Additional applicability, characteristic data, safety class and capacity models are required. No Annex C check is implemented.') ]};
}
export function csaDetails(c:CsaCheck,system:UnitSystem):string {
  return c.values.map(v=>`${v.name}: ${format(v.value,v.unit,system,6)}`).join('; ');
}
