import type {ServiceInput} from '../types';
import type {PermanentProfile} from './profile';
import {backfillLoad} from './backfill-load';
/** Editable illustrative bulk-density starters, not material specifications or Proctor results. */
export const BACKFILL_DENSITIES:Record<string,number>={
 'Sand':1800,'Sand and gravel mixture':2000,'Gravel':2000,'Crushed stone':2100,
 'Silty soil':1800,'Clayey soil':1900,'Reused excavated soil':NaN,'Other / project-specific material':NaN,
};
export function changeBackfillMaterial(zone:PermanentProfile['zones'][number],material:string){
 const loadEstimate=zone.loadEstimate?{...zone.loadEstimate,density:BACKFILL_DENSITIES[material]??NaN}:undefined;
 return {...zone,material,...(loadEstimate?{loadEstimate,weight:backfillLoad(loadEstimate)}:{})};
}
/** Input transaction: all estimated loads follow an actual OD change, never a display-unit change. */
export function syncBackfillDiameter(previous:ServiceInput,next:ServiceInput):ServiceInput{
 if(Object.is(previous.od,next.od)||!next.permanent)return next;
 return {...next,permanent:{...next.permanent,defaultsReviewed:false,zones:next.permanent.zones.map(z=>{
  if(!z.loadEstimate)return z;
  const loadEstimate={...z.loadEstimate,width:next.od/1000};return {...z,loadEstimate,weight:backfillLoad(loadEstimate)};
 })}};
}
