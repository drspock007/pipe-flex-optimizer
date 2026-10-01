import {format,STATUS} from './display';
import {effectiveFluidDensity} from './fluid';
import {section,serviceCoating,type ServiceReport,type ScenarioResult} from './types';
import type {UnitSystem} from '../unit-conversions';
export const sagStatus=(s:ScenarioResult['sag'])=>!s?'Not evaluated':s.status==='not-requested'?'No deflection limit specified':s.status==='pass'?'Sag limit satisfied':s.status==='fail'?'Sag limit exceeded':'Sag limit unresolved';
export function weightParts(i:ServiceReport['input']){
 const p=section(i),coat=serviceCoating(i),g=9.80665e-9;
 return {steel:p.A*i.steelDensity*g,fluid:p.Ai*effectiveFluidDensity(i)*g,coating:Math.PI*coat.thickness*(i.od+coat.thickness)*coat.density*g,total:p.q};
}
export function sagConditions(r:ServiceReport,system:UnitSystem):string[][]{
 const i=r.input,w=weightParts(i),f=(v:number,u:Parameters<typeof format>[1])=>format(v,u,system);
 return [
 ['Configuration',!i.sag?'Not specified':i.sag.boundary==='simple'?'Simple supports; rotation and axial sliding free':'Both ends clamped; axial translation and rotation fixed'],
 ['Steel OD / wall',`${f(i.od,'mm')} / ${f(i.thickness,'mm')}`],
 ['Young modulus / yield strength',`${f(i.E,'MPa')} / ${f(i.yield,'MPa')}`],
 ['Pressure / temperature',`${f(i.pressure,'pressure')} / ${f(i.temperature,'C')}`],
 ['Fluid density used',f(effectiveFluidDensity(i),'kg/m3')],
 ['Weight: steel / coating / fluid',`${f(w.steel,'N/mm')} / ${f(w.coating,'N/mm')} / ${f(w.fluid,'N/mm')}`],
 ['Total distributed weight',f(w.total,'N/mm')],
 ['Full span L (displayed case)',f((r.result?.halfLength??i.halfLength)/500,'m')],
 ...(i.mode==='length'?[['Full-span search bounds',`${f(i.minHalfLength/500,'m')} to ${f(i.maxHalfLength/500,'m')}`]]:[]),
 ['Maximum admissible sag',i.sag?.limit===undefined?'Not specified':f(i.sag.limit,'mm')],
 ['Custom stress limit',`${i.allowablePercent}% of yield = ${f(i.yield*i.allowablePercent/100,'MPa')}`],
 ];
}
export function sagResultRows(s:ScenarioResult,system:UnitSystem):string[][]{
 const f=(v:number|undefined,u:Parameters<typeof format>[1])=>format(v,u,system),t=s.target;
 return [
 ['Mechanical criterion',STATUS[s.status]],['Deflection criterion',sagStatus(s.sag)],
 ['Maximum downward sag / position from left',`${f(s.sag?.value,'mm')} / ${f(s.sag?.x===undefined?undefined:s.sag.x/1000,'m')}`],
 ['Sag uncertainty',format(s.sag?.uncertainty,'mm',system,6)],
 ['Maximum von Mises beam bound',f(s.worst?.vm,'MPa')],
 ['Stress / custom limit',s.utilization===undefined?'Not evaluated':`${(100*s.utilization).toFixed(2)}%`],
 ['Left / right vertical reaction',`${f(t?.leftZ,'N')} / ${f(t?.rightZ,'N')}`],
 ['Left / right end moment',`${f(t?.leftMz===undefined?undefined:t.leftMz/1e6,'kN·m')} / ${f(t?.rightMz===undefined?undefined:t.rightMz/1e6,'kN·m')}`],
 ['Final wall / effective axial force',`${f(t?.wall,'N')} / ${f(t?.N,'N')}`],
 ];
}
