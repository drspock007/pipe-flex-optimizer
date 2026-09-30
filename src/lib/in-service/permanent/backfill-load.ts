/** Rectangular above-water soil column. Geometry in m, bulk density kg/m³, output N/mm. */
export interface BackfillLoadEstimate { cover:number; width:number; density:number }
export function backfillLoad(e:Partial<BackfillLoadEstimate>):number {
 if(![e.cover,e.width,e.density].every(Number.isFinite)||e.cover<0||e.width<=0||e.density<=0)return NaN;
 const q=e.density*9.80665*e.cover*e.width/1000;
 return Number.isFinite(q)?q:NaN;
}
export const initialBackfillLoad=(odMm:number):BackfillLoadEstimate=>({cover:1,width:odMm/1000,density:1800});
