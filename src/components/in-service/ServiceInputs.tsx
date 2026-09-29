import FieldHelp from '@/components/FieldHelp';
import {fieldHelp} from '@/lib/field-help';
import { useId,useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useUnits } from '@/contexts/UnitContext';
import PipeSizeSelect from '@/components/geometry/PipeSizeSelect';
import WallThicknessSelect from '@/components/geometry/WallThicknessSelect';
import { PIPE_SIZES,WALL_THICKNESS_BY_NPS,findNpsByOd,findScheduleByWt } from '@/lib/pipe-presets';
import SteelGradeSelect from '@/components/SteelGradeSelect';
import CoatingCard from '@/components/CoatingCard';
import { FLUIDS, effectiveFluidDensity, gasProperties, type FluidType } from '@/lib/in-service/fluid';
import { GRADES } from '@/lib/calculations';
import { display,internal,label,type ServiceUnit } from '@/lib/in-service/display';
import { type ServiceInput,type Mode,type Direction } from '@/lib/in-service/types';

export function Field({title,value,onChange,unit='scalar',help}:{title:string;value:number;onChange:(v:number)=>void;unit?:ServiceUnit;help?:string}) {
  const {system}=useUnits(),id=useId();
  const v=display(value,unit,system);
  return <div className="space-y-1"><label htmlFor={id} className="text-xs font-medium">{title} {unit!=='scalar'&&`(${label(unit,system)})`}</label>{(help??fieldHelp(title))&&<FieldHelp text={(help??fieldHelp(title))!}/>}
    <Input id={id} type="number" step="any" value={Number.isFinite(v)?Number(v.toPrecision(12)):''} onChange={e=>onChange(e.target.value===''?NaN:internal(Number(e.target.value),unit,system))}/></div>;
}
const selectClass='w-full rounded-md border border-input bg-background p-2 text-sm';
export function ServiceInputs({input:i,onChange}:{input:ServiceInput;onChange:(i:ServiceInput)=>void}) {
  const gas=gasProperties(i),fluidType=i.fluidType??'custom';
  const {system}=useUnits();const [nps,setNps]=useState(findNpsByOd(i.od)),[schedule,setSchedule]=useState(findScheduleByWt(findNpsByOd(i.od),i.thickness));
  const [thresholdMode,setThresholdMode]=useState('percent');
  const [customGrade,setCustomGrade]=useState(false);
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
      <div className="space-y-1"><label className="text-xs">Steel Grade</label><SteelGradeSelect grade={customGrade?'CUSTOM':GRADES.find(g=>g.smys===i.yield)?.key??'CUSTOM'} onChange={key=>{setCustomGrade(key==='CUSTOM');const g=GRADES.find(g=>g.key===key);if(g)update('yield',g.smys);}} /></div>
      <div className="grid grid-cols-2 gap-3">{f('yield','Yield strength at operating T','MPa')}{f('E',"Young's modulus",'MPa')}{f('nu',"Poisson's ratio")}{f('alpha','Thermal expansion','alpha')}</div>
      <p className="text-xs text-muted-foreground">Steel only. Enter properties applicable at the operating temperature; no automatic material derating.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Operating conditions & weight</h2>
      <div className="grid grid-cols-2 gap-3">{f('pressure','Internal gauge pressure','pressure')}{f('temperature','Operating temperature','C')}{f('steelDensity','Steel density','kg/m3')}</div>
      <label className="block text-xs">Fluid<FieldHelp text={fieldHelp('Fluid')!}/><select aria-label="Fluid" className={selectClass} value={fluidType} onChange={e=>{const type=e.target.value as FluidType;onChange({...i,fluidType:type,gasMolarMass:FLUIDS[type].molarMass,gasZ:1});}}>{Object.entries(FLUIDS).map(([key,fluid])=><option key={key} value={key}>{fluid.label}</option>)}</select></label>
      {fluidType==='custom'?f('fluidDensity','Fluid density at operating P/T','kg/m3'):<>
        <div className="grid grid-cols-2 gap-3">
          <Field title="Molar mass (g/mol)" value={gas.molarMass} onChange={v=>update('gasMolarMass',v)}/>
          <Field title="Compressibility factor Z" value={gas.z} onChange={v=>update('gasZ',v)}/>
          <Field title="Atmospheric pressure" value={gas.atmosphere} unit="pressure" onChange={v=>update('atmosphericPressure',v)}/>
        </div>
        <p className="text-sm font-medium" aria-live="polite">Calculated density: {Number.isFinite(effectiveFluidDensity(i))?display(effectiveFluidDensity(i),'kg/m3',system).toFixed(3):'—'} {label('kg/m3',system)}</p>
        <p className="text-xs text-muted-foreground">Absolute pressure = gauge pressure + atmospheric pressure. Density uses ρ = Pabs M / (Z R T), with T in kelvin. Z = 1 assumes an ideal gas; real-gas Z is not calculated automatically. Enter Z for the selected gas at the operating pressure and temperature, or use a known custom density.</p>
        {fluidType==='naturalGas'&&<p className="text-xs text-muted-foreground">Natural gas composition varies. The initial molar mass assumes pure methane (16.04246 g/mol); replace it with the value for your gas.</p>}
      </>}
      <p className="text-xs text-muted-foreground">{i.intervention==='permanent'?'These conditions apply during construction; future operating cases are specified separately.':'Constant pressure and temperature during the intervention.'} Zero external gauge pressure. Coating contributes weight only.</p>
    </section>
    <CoatingCard coatingType={i.coatingType??'custom'} coatingThickness={i.coatingThickness} coatingDensity={i.coatingDensity} Do={i.od} nps={nps} onChange={(field,value)=>onChange({...i,[field]:value})}/>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Excavation & movement</h2>
      <label className="block text-xs">Calculation<FieldHelp text={fieldHelp('Calculation')!}/><select aria-label="Calculation" disabled={i.intervention==='permanent'} className={selectClass} value={i.mode} onChange={e=>update('mode',e.target.value as Mode)}><option value="direct">Direct calculation</option><option value="length">Find excavated length</option><option value="displacement">Find displacement</option><option value="supports">Find support count</option></select></label>
      {i.mode!=='length'&&<><Field title="Length on each side" value={i.halfLength/1000} unit="m" onChange={v=>update('halfLength',v*1000)}/><p className="text-xs">Total: {Number(display(i.halfLength*2/1000,'m',system).toFixed(3))} {label('m',system)}</p></>}
      {i.mode==='length'&&<div className="grid grid-cols-2 gap-3"><Field title="Min. length each side" value={i.minHalfLength/1000} unit="m" onChange={v=>update('minHalfLength',v*1000)}/><Field title="Max. length each side" value={i.maxHalfLength/1000} unit="m" onChange={v=>update('maxHalfLength',v*1000)}/></div>}
      <label className="block text-xs">Direction<FieldHelp text={fieldHelp('Direction')!}/><select aria-label="Direction" className={selectClass} value={i.direction} onChange={e=>onChange({...i,direction:e.target.value as Direction,angle:e.target.value==='combined'?45:90})}><option value="vertical">Vertical (lateral free)</option><option value="horizontal">Horizontal (vertical free)</option><option value="combined">Combined (both controlled)</option></select></label>
      {i.direction==='combined'?f('angle','Direction angle (degrees, horizontal = 0, up = 90)'):<label className="block text-xs">Sense<FieldHelp text={fieldHelp('Sense')!}/><select aria-label="Sense" className={selectClass} value={i.angle<0?'-1':'1'} onChange={e=>update('angle',Number(e.target.value)*90)}><option value="1">{i.direction==='vertical'?'Up':'Positive lateral'}</option><option value="-1">{i.direction==='vertical'?'Down':'Negative lateral'}</option></select></label>}
      {i.mode==='displacement'?f('maxDisplacement','Search amplitude upper bound','mm'):f('displacement','Target amplitude','mm')}
      <p className="text-xs text-muted-foreground">Targets are measured from the original straight axis. An unconstrained component remains free. {i.intervention==='permanent'?'The permanent sequence then adjusts supports and transfers load to backfill.':'The return path retraces the movement, then restores support.'}</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Temporary supports</h2>
      {i.mode==='supports'?<>
        <Field title="Support search ceiling (even, 0–20)" value={i.maxSupports??10} onChange={v=>update('maxSupports',v)}/>
        <p className="text-xs">Test 0, 2, 4… equidistant supports. Length and target amplitude stay fixed. The centre is reserved for the actuator.</p>
      </>:<>
        <label className="block text-xs">Layout<FieldHelp text={fieldHelp('Layout')!}/><select aria-label="Support layout" className={selectClass} value={i.supports?.kind??'none'} onChange={e=>update('supports',e.target.value==='none'?{kind:'none'}:e.target.value==='equidistant'?{kind:'equidistant',count:2}:{kind:'custom',fractions:[0.25,0.75]})}><option value="none">No supports</option><option value="equidistant">Equidistant pairs</option><option value="custom">Custom positions</option></select></label>
        {i.supports?.kind==='equidistant'&&<Field title="Number of supports (even, 2–20)" value={i.supports.count} onChange={count=>update('supports',{kind:'equidistant',count})}/>}
        {i.supports?.kind==='custom'&&<>
          {i.mode==='length'&&<Field title="Layout reference length on each side" value={i.halfLength/1000} unit="m" onChange={v=>update('halfLength',v*1000)}/>}
          {i.supports.fractions.map((fraction,j)=><div key={j} className="flex items-end gap-2"><Field title={`Support ${j+1} from left end`} value={fraction*2*i.halfLength/1000} unit="m" onChange={v=>{if(i.supports.kind==='custom')update('supports',{kind:'custom',fractions:i.supports.fractions.map((x,k)=>k===j?v*1000/(2*i.halfLength):x)});}}/><Button size="sm" variant="ghost" onClick={()=>{if(i.supports.kind==='custom')update('supports',{kind:'custom',fractions:i.supports.fractions.filter((_,k)=>k!==j)});}}>Remove</Button></div>)}
          <Button variant="outline" disabled={i.supports.fractions.length>=20} onClick={()=>{if(i.supports.kind==='custom'){const used=i.supports.fractions;const next=Array.from({length:41},(_,j)=>(j+1)/42).find(x=>x!==0.5&&!used.includes(x));update('supports',{kind:'custom',fractions:[...used,next]});}}}>Add support</Button>
          <p className="text-xs">Positions exclude both clamps and the central actuator. Length changes preserve x / total length, including during Find excavated length.</p>
        </>}
      </>}
      <p className="text-xs text-muted-foreground">Fixed, rigid, frictionless supports at the original pipe level. Vertical upward reaction only; lift-off, axial and horizontal sliding are free. Supports are installed before local soil release. No lateral stability restraint or support-capacity check.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Custom criterion</h2>
      <label className="block text-xs">Threshold format<FieldHelp text={fieldHelp('Threshold format')!}/><select aria-label="Threshold format" className={selectClass} value={thresholdMode} onChange={e=>setThresholdMode(e.target.value)}><option value="percent">Percentage of yield</option><option value="factor">Safety factor</option></select></label>
      <Field title={thresholdMode==='percent'?'Allowable (% of yield)':'Safety factor (at least 1)'} value={thresholdMode==='percent'?i.allowablePercent:100/i.allowablePercent} onChange={v=>update('allowablePercent',thresholdMode==='percent'?v:100/v)}/>
      {thresholdMode==='percent'&&<div className="space-y-2 pt-1">
        <Slider aria-label="Allowable percentage of yield" value={[Number.isFinite(i.allowablePercent)?Math.min(100,Math.max(10,i.allowablePercent)):10]}
          min={10} max={100} step={1} onValueChange={v=>update('allowablePercent',v[0])}/>
        <div className="flex justify-between text-xs text-muted-foreground"><span>10%</span><span>100%</span></div>
        {!Number.isFinite(i.allowablePercent)&&<p className="text-xs text-muted-foreground">Move the slider or enter a value to choose your threshold.</p>}
      </div>}
      {Number.isFinite(i.allowablePercent)&&<p className="text-xs">{i.allowablePercent.toFixed(2)}% · factor {(100/i.allowablePercent).toFixed(3)} · allowable {display(i.yield*i.allowablePercent/100,'MPa',system).toFixed(2)} {label('MPa',system)}</p>}
      <p className="text-xs text-muted-foreground">Conservative Von Mises beam bound, including transverse shear. Default threshold: 50% of yield (safety factor 2), editable for your assessment.</p>
    </section>
    <section className="rounded-lg border bg-card p-4 space-y-3"><h2 className="font-semibold">Initial-state scenarios</h2>
      <p className="text-xs text-muted-foreground">Extra axial force: tension positive, compression negative. Excludes the pressure and thermal contributions already modeled. Zero is an explicit assumption.</p>
      {i.scenarios.map((s,k)=><div key={s.id} className="border rounded-md p-3 space-y-2">
        <label className="text-xs block">Scenario name<FieldHelp text={fieldHelp('Scenario name')!}/><Input aria-label={`Scenario ${k+1} name`} value={s.name} onChange={e=>update('scenarios',i.scenarios.map((v,j)=>j===k?{...v,name:e.target.value}:v))}/></label>
        <div className="grid grid-cols-2 gap-2"><Field title="Reference temperature" value={s.referenceTemperature} unit="C" onChange={v=>update('scenarios',i.scenarios.map((s,j)=>j===k?{...s,referenceTemperature:v}:s))}/><Field title="Extra axial force" value={s.extraAxial} unit="N" onChange={v=>update('scenarios',i.scenarios.map((s,j)=>j===k?{...s,extraAxial:v}:s))}/></div>
        <Button variant="ghost" size="sm" disabled={i.scenarios.length===1} onClick={()=>update('scenarios',i.scenarios.filter((_,j)=>j!==k))}>Remove scenario</Button>
      </div>)}
      <Button variant="outline" disabled={i.scenarios.length>=12} onClick={()=>update('scenarios',[...i.scenarios,{id:crypto.randomUUID(),name:`Hypothesis ${i.scenarios.length+1}`,referenceTemperature:i.temperature,extraAxial:0}])}>Add scenario</Button>
    </section>
  </div>;
}
