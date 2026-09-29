import {Field} from './ServiceInputs';
import {Button} from '../ui/button';
import FieldHelp from '../FieldHelp';
import {useUnits} from '@/contexts/UnitContext';
import {format} from '@/lib/in-service/display';
import {backfillLoad,initialBackfillLoad,type BackfillLoadEstimate} from '@/lib/in-service/permanent/backfill-load';
import type {PermanentProfile} from '@/lib/in-service/permanent/profile';
type Zone=PermanentProfile['zones'][number];
export default function BackfillLoadInputs({zone,od,index,onChange}:{zone:Zone;od:number;index:number;onChange:(z:Zone)=>void}){
 const {system}=useUnits(),e=zone.loadEstimate;
 const update=(v:Partial<BackfillLoadEstimate>)=>onChange({...zone,loadEstimate:v,weight:backfillLoad(v)});
 return <div className="rounded border p-3 space-y-3"><label className="text-sm block">Weight of backfill on the pipe<FieldHelp text="Estimate the weight of a rectangular column of soil above the pipe, or enter a distributed load from a project study. Soil resistance curves are separate. This estimate assumes above-water conditions and does not calculate arching, buoyancy or compaction forces."/><select aria-label={`Backfill weight method zone ${index+1}`} className="w-full rounded-md border border-input bg-background p-2 text-sm" value={e?'geometry':'direct'} onChange={event=>{if(event.target.value==='geometry')update(initialBackfillLoad(od));else {const copy={...zone};delete copy.loadEstimate;onChange(copy);}}}><option value="geometry">Calculate from cover and density</option><option value="direct">Enter a known load (advanced)</option></select></label>
 {e?<><Field title="Soil cover above pipe crown" unit="m" value={e.cover} onChange={cover=>update({...e,cover})} help="Vertical distance from the TOP of the pipe to the final backfill surface at installation. Not trench depth or depth to pipe centre. Starting example: 1 m. This fixed construction load does not change with later pipe movement."/>
 <Field title="Backfill bulk density" unit="kg/m3" value={e.density} onChange={density=>update({...e,density})} help="Mass of the placed soil, including its water content, per total volume. Starting example: 1800 kg/m³, not a value established by the material menu or a compaction percentage. Use project data. This estimator is for soil and pipe above groundwater."/>
 <Field title="Soil column width carried by pipe" unit="m" value={e.width} onChange={width=>update({...e,width})} help="Width of the rectangular soil column whose weight is assigned to each metre of pipe. Initially the steel outside diameter. It is NOT automatically the trench width. Confirm the load-transfer assumption; enter a study-derived load if soil arching or trench effects matter. This width stays fixed if pipe size changes until you update it."/>
 <Button variant="outline" className="h-auto whitespace-normal" onClick={()=>update({...e,width:od/1000})}>Use current pipe outside diameter</Button>
 <p className="text-sm">Calculated downward load: <strong>{format(backfillLoad(e),'N/mm',system)}</strong></p><p className="text-xs"><var>q</var> = <var>ρ</var> × <var>g</var> × <var>H</var> × <var>B</var>. Weight of an above-water rectangular soil column only; no arching, buoyancy or compaction-force calculation. Review these assumptions for the project.</p></>:<Field title="Known downward backfill load" unit="N/mm" value={zone.weight} onChange={weight=>onChange({...zone,weight})} help="Distributed downward load established for this project. 1 N/mm = 1 kN/m. Excludes the pipe/fluid self-weight and temporary construction loads entered separately. Use this mode for a load evaluated with a suitable geotechnical method."/>}
 </div>;
}
