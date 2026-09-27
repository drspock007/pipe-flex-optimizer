import { useUnits } from '@/contexts/UnitContext';
import { format } from '@/lib/in-service/display';
import { supportPeaks,selectedStage,reactionPeaks } from '@/lib/in-service/supports';
import type { ScenarioResult } from '@/lib/in-service/types';
const contactLabel=(state:string)=>state==='limit'?'Contact limit':state==='contact'?'In contact':'Detached';

export default function SupportResults({s,index,onSelect}:{s:ScenarioResult;index?:number;onSelect:(index:number)=>void}) {
  const {system}=useUnits(),t=selectedStage(s,index),peaks=supportPeaks(s.stages);
  if(!peaks.length)return null;
  const f=(v:number,u:'N'|'mm'|'m')=>format(v,u,system);
  return <div className="space-y-3">
    <label className="text-sm block">Displayed intervention stage<select aria-label={`Intervention stage ${s.scenario.name}`} className="block w-full border rounded-md bg-background p-2" value={index??s.stages.indexOf(t)} onChange={e=>onSelect(Number(e.target.value))}>{s.stages.map((v,k)=><option key={k} value={k}>{k+1}: {v.phase} · {(v.fraction*100).toFixed(3)}%</option>)}</select></label>
    <p className="text-xs">Selected stage: VM {format(t.vm,'MPa',system)} · actuator {f(t.forceZ,'N')} vertical / {f(t.forceY,'N')} lateral. Green profile and support colours follow this stage. Grey: contact limit · green: contact · orange: detached.</p>
    <div className="overflow-auto"><table className="w-full text-xs text-left"><thead><tr><th>Support / position</th><th>Selected contact / gap</th><th>Selected reaction</th><th>Maximum reaction / phase</th><th>At target</th></tr></thead><tbody>{peaks.map((p,j)=><tr key={j} className="border-b"><td className="p-2">{j+1} · {f(p.x/1000,'m')}</td><td>{contactLabel(t.supports[j].state)} / {f(t.supports[j].gap,'mm')}</td><td>{f(t.supports[j].reaction,'N')}</td><td>{f(p.reaction,'N')} · {p.phase} {(p.fraction*100).toFixed(3)}%</td><td>{s.target?contactLabel(s.target.supports[j].state):'Incomplete path'}</td></tr>)}</tbody></table></div>
    <div className="overflow-auto"><table className="w-full text-xs text-left"><caption className="text-left font-medium">Peak transverse forces over the intervention</caption><thead><tr><th>Location</th><th>Resultant</th><th>Vertical / lateral at peak</th><th>Phase</th></tr></thead><tbody>{reactionPeaks(s.stages).map(p=><tr key={p.name} className="border-b"><td className="p-2">{p.name}</td><td>{f(p.resultant,'N')}</td><td>{f(p.vertical,'N')} / {f(p.lateral,'N')}</td><td>{p.phase} {(p.fraction*100).toFixed(3)}%</td></tr>)}</tbody></table></div>
    <p className="text-xs text-muted-foreground">Reactions are loads to use in a separate support design; capacity, local bearing stress and settlement are not checked.</p>
  </div>;
}
