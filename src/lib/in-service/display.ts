import { fromDisplay,toDisplay,unitLabel,type UnitSystem,type UnitType } from '../unit-conversions';
import type { Status } from './types';
export type ServiceUnit=UnitType|'C'|'alpha'|'scalar'|'pressure';
export function display(v:number,u:ServiceUnit,system:UnitSystem):number {
  if(u==='pressure')return system==='SI'?v*1000:v/0.00689476;
  if(u==='scalar')return v;
  if(u==='C')return system==='SI'?v:v*9/5+32;
  if(u==='alpha')return v*1e6*(system==='SI'?1:5/9);
  return toDisplay(v,u,system);
}
export function internal(v:number,u:ServiceUnit,system:UnitSystem):number {
  if(u==='pressure')return system==='SI'?v/1000:v*0.00689476;
  if(u==='scalar')return v;
  if(u==='C')return system==='SI'?v:(v-32)*5/9;
  if(u==='alpha')return v/1e6*(system==='SI'?1:9/5);
  return fromDisplay(v,u,system);
}
export function label(u:ServiceUnit,system:UnitSystem) {
  if(u==='pressure')return system==='SI'?'kPa':'psi';
  if(u==='scalar')return '';
  if(u==='C')return system==='SI'?'°C':'°F';
  if(u==='alpha')return system==='SI'?'10⁻⁶/°C':'10⁻⁶/°F';
  return unitLabel(u,system);
}
export const format=(v:number|undefined,u:ServiceUnit,system:UnitSystem,digits=3)=>v===undefined||!Number.isFinite(v)?'—':`${Number(display(v,u,system).toFixed(digits))} ${label(u,system)}`.trim();
export const STATUS:Record<Status,string>={pass:'Custom criterion met',fail:'Custom criterion exceeded',unstable:'Instability risk', 'out-of-domain':'Outside elastic model scope','numerical-failure':'Unresolved numerical result',uncertain:'Numerically uncertain',invalid:'Invalid input'};
