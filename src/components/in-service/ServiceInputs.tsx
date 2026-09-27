import { useId,useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUnits } from '@/contexts/UnitContext';
import PipeSizeSelect from '@/components/geometry/PipeSizeSelect';
import WallThicknessSelect from '@/components/geometry/WallThicknessSelect';
import { PIPE_SIZES,WALL_THICKNESS_BY_NPS,findNpsByOd,findScheduleByWt } from '@/lib/pipe-presets';
import { GRADES } from '@/lib/calculations';
import { display,internal,label,type ServiceUnit } from '@/lib/in-service/display';
import { type ServiceInput,type Mode,type Direction } from '@/lib/in-service/types';

export function Field({title,value,onChange,unit='scalar'}:{title:string;value:number;onChange:(v:number)=>void;unit?:ServiceUnit}) {
  const {system}=useUnits(),id=useId();
  const v=display(value,unit,system);
  return <div className="space-y-1"><label htmlFor={id} className="text-xs font-medium">{title} {unit!=='scalar'&&`(${label(unit,system)})`}</label>
    <Input id={id} type="number" step="any" value={Number.isFinite(v)?Number(v.toPrecision(12)):''} onChange={e=>onChange(e.target.value===''?NaN:internal(Number(e.target.value),unit,system))}/></div>;
}
const selectClass='w-full rounded-md border border-input bg-background p-2 text-sm';
export function ServiceInputs({input:i,onChange}:{input:ServiceInput;onChange:(i:ServiceInput)=>void}) {
  const {system}=useUnits();const [nps,setNps]=useState(findNpsByOd(i.od)),[schedule,setSchedule]=useState(findScheduleByWt(findNpsByOd(i.od),i.thickness));
  const [thresholdMode,setThresholdMode]=useState('percent');
  const update=<K extends keyof ServiceInput>(k:K,v:ServiceInput[K])=>onChange({...i,[k]:v});
  const f=(k:keyof ServiceInput,title:string,unit:ServiceUnit='scalar')=><Field title={title} value={i[k] as number} unit={unit} onChange={v=>update(k,v)}/>;
  return <div className="space-y-4">
    <section className="rounded-lg border bg-card p-4 space-y-4"><h2 className="font-semibold">Pipe & steel</h2>
      <div key={system} className="grid grid-cols-2 gap-3"><PipeSizeSelect selectedNps={nps} Do={i.od} onDoChange={v=>update('od',v)} onNpsChange={v=>{
        setNps(v);if(v==='CUSTOM'){setSchedule('Custom');return;}
        const pipe=PIPE_SIZES.find(p=>p.nps===v),wall=WALL_THICKNESS_BY_NPS[v]?.[0];
        setSchedule(wall?.schedule??'Custom');onChange({...i,od:pipe.od_mm,thickness:wall?.wt_mm??i.thickness});
      }}/>
      {nps==='CUSTOM'?f('thickness','Analysis thickness','mm'):<WallThicknessSelect selectedNps={nps} selectedSchedule={schedule} t={i.thickness} onTChange={v=>update('thickness',v)} onScheduleChange={v=>{setSchedule(v);const wall=WALL_THICKNESS_BY_NPS[nps]?.find(w=>w.schedule===v);if(wall)update('thickness',wall.wt_mm);}}/>}</div>
      <p className="text-xs text-muted-foreground">Uniform analysis thickness; local corrosion and defects are not assessed.</p>
      <label className="block text-xs">Steel yield preset<select aria-label="Steel yield preset" className={selectClass} value={GRADES.find(g=>g.smys===i.yield)?.key??'CUSTOM'} onChange={e=>{const g=GRADES.find(g=>g.key===e.target.value);if(g)update('yield',g.smys);}}><option value="CUSTOM">Custom / edit yield below</option>{GRADES.map(g=><option key={g.key} value={g.key}>{g.label}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">{f('yield','Yield strength at operating T','MPa')}{f('E',"Young's modulus",'MPa')}{f('nu',"Poisson's ratio")}{f('alpha','Thermal expansion','alpha')}</div>
      <p className="text-xs text-muted-foreground">Steel only. Enter properties applicable at the operating temperature; no automatic material derating.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Operating conditions & weight</h2>
      <div className="grid grid-cols-2 gap-3">{f('pressure','Internal gauge pressure','MPa')}{f('temperature','Operating temperature','C')}{f('steelDensity','Steel density','kg/m3')}{f('fluidDensity','Fluid density at operating P/T','kg/m3')}{f('coatingThickness','Coating thickness','mm')}{f('coatingDensity','Coating density','kg/m3')}</div>
      <p className="text-xs text-muted-foreground">Constant pressure and temperature; zero external pressure. Coating contributes weight only.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Excavation & movement</h2>
      <label className="block text-xs">Calculation<select aria-label="Calculation" className={selectClass} value={i.mode} onChange={e=>update('mode',e.target.value as Mode)}><option value="direct">Direct calculation</option><option value="length">Find excavated length</option><option value="displacement">Find displacement</option></select></label>
      {i.mode!=='length'&&<><Field title="Length on each side" value={i.halfLength/1000} unit="m" onChange={v=>update('halfLength',v*1000)}/><p className="text-xs">Total: {Number(display(i.halfLength*2/1000,'m',system).toFixed(3))} {label('m',system)}</p></>}
      {i.mode==='length'&&<div className="grid grid-cols-2 gap-3"><Field title="Min. length each side" value={i.minHalfLength/1000} unit="m" onChange={v=>update('minHalfLength',v*1000)}/><Field title="Max. length each side" value={i.maxHalfLength/1000} unit="m" onChange={v=>update('maxHalfLength',v*1000)}/></div>}
      <label className="block text-xs">Direction<select aria-label="Direction" className={selectClass} value={i.direction} onChange={e=>onChange({...i,direction:e.target.value as Direction,angle:e.target.value==='combined'?45:90})}><option value="vertical">Vertical (lateral free)</option><option value="horizontal">Horizontal (vertical free)</option><option value="combined">Combined (both controlled)</option></select></label>
      {i.direction==='combined'?f('angle','Direction angle (degrees, horizontal = 0, up = 90)'):<label className="block text-xs">Sense<select aria-label="Sense" className={selectClass} value={i.angle<0?'-1':'1'} onChange={e=>update('angle',Number(e.target.value)*90)}><option value="1">{i.direction==='vertical'?'Up':'Positive lateral'}</option><option value="-1">{i.direction==='vertical'?'Down':'Negative lateral'}</option></select></label>}
      {i.mode==='displacement'?f('maxDisplacement','Search amplitude upper bound','mm'):f('displacement','Target amplitude','mm')}
      <p className="text-xs text-muted-foreground">Targets are measured from the original straight axis. An unconstrained component remains free. The return path retraces the movement, then restores support.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Custom criterion</h2>
      <label className="block text-xs">Threshold format<select aria-label="Threshold format" className={selectClass} value={thresholdMode} onChange={e=>setThresholdMode(e.target.value)}><option value="percent">Percentage of yield</option><option value="factor">Safety factor</option></select></label>
      <Field title={thresholdMode==='percent'?'Allowable (% of yield)':'Safety factor (at least 1)'} value={thresholdMode==='percent'?i.allowablePercent:100/i.allowablePercent} onChange={v=>update('allowablePercent',thresholdMode==='percent'?v:100/v)}/>
      {Number.isFinite(i.allowablePercent)&&<p className="text-xs">{i.allowablePercent.toFixed(2)}% · factor {(100/i.allowablePercent).toFixed(3)} · allowable {display(i.yield*i.allowablePercent/100,'MPa',system).toFixed(2)} {label('MPa',system)}</p>}
      <p className="text-xs text-muted-foreground">Conservative Von Mises beam bound, including transverse shear. Choose a threshold; none is assumed safe by default.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Initial-state scenarios</h2>
      <p className="text-xs text-muted-foreground">Extra axial force: tension positive, compression negative. Excludes the pressure and thermal contributions already modeled. Zero is an explicit assumption.</p>
      {i.scenarios.map((s,k)=><div key={s.id} className="border rounded-md p-3 space-y-2">
        <label className="text-xs block">Scenario name<Input aria-label={`Scenario ${k+1} name`} value={s.name} onChange={e=>update('scenarios',i.scenarios.map((v,j)=>j===k?{...v,name:e.target.value}:v))}/></label>
        <div className="grid grid-cols-2 gap-2"><Field title="Reference temperature" value={s.referenceTemperature} unit="C" onChange={v=>update('scenarios',i.scenarios.map((s,j)=>j===k?{...s,referenceTemperature:v}:s))}/><Field title="Extra axial force" value={s.extraAxial} unit="N" onChange={v=>update('scenarios',i.scenarios.map((s,j)=>j===k?{...s,extraAxial:v}:s))}/></div>
        <Button variant="ghost" size="sm" disabled={i.scenarios.length===1} onClick={()=>update('scenarios',i.scenarios.filter((_,j)=>j!==k))}>Remove scenario</Button>
      </div>)}
      <Button variant="outline" disabled={i.scenarios.length>=12} onClick={()=>update('scenarios',[...i.scenarios,{id:crypto.randomUUID(),name:`Hypothesis ${i.scenarios.length+1}`,referenceTemperature:i.temperature,extraAxial:0}])}>Add scenario</Button>
    </section>
  </div>;
}
