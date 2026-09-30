import FieldHelp from '@/components/FieldHelp';
import FormulaBlock from '@/pages/help/FormulaBlock';
import { CSA_FORMULAS, formulaTex } from '@/lib/in-service/csa-formulas';
import { Button } from '@/components/ui/button';
import { useUnits } from '@/contexts/UnitContext';
import { Field } from './ServiceInputs';
import { emptyCsa, CSA_SCOPE, CSA_STATUS, csaDetails, type CsaProfile, type CsaAssessment } from '@/lib/in-service/csa';
import { format, type ServiceUnit } from '@/lib/in-service/display';
import type { ServiceInput } from '@/lib/in-service/types';

export function ServiceCsaInputs({input:i,onChange}:{input:ServiceInput;onChange:(i:ServiceInput)=>void}) {
  const p=i.csa??emptyCsa();
  const update=(v:Partial<CsaProfile>)=>onChange({...i,csa:{...p,...v}});
  const field=(key:'designPressure'|'designTemperature'|'anchoringTemperature'|'nominalThickness'|'allowance'|'smys',title:string,unit:ServiceUnit)=><Field title={title} value={p[key]} unit={unit} onChange={v=>update({[key]:v})}/>;
  return <section className="rounded-lg border bg-card p-4 space-y-3">
    <h2 className="font-semibold">CSA Z662:2023 — targeted checks</h2>
    <label className="flex gap-2 text-sm items-start"><input type="checkbox" checked={p.enabled} onChange={e=>update({enabled:e.target.checked})}/>Enable separate CSA evaluation</label><FieldHelp text="Adds independent design checks only. It does not change mechanical searches or establish CSA approval of lifting."/>
    <p className="text-xs text-muted-foreground">{CSA_SCOPE}</p>
    {p.enabled&&<>
      <p className="text-xs">Confirm applicability independently of the mechanical fluid/grade selectors. Unknown applicability must remain unchecked.</p>
      {([['eligibleSteel','Eligible carbon or high-strength low-alloy steel pipeline within CSA section 4 scope'],['plainPipeline','Plain pipeline pipe (not threaded, station or other piping)'],['anchored','Axially restrained design state; no additional loads beyond pressure and temperature']] as const).map(([key,title])=><label key={key} className="flex gap-2 text-xs items-start"><input type="checkbox" checked={p[key]} onChange={e=>update({[key]:e.target.checked})}/>{title}<FieldHelp text="Confirm this condition from the actual design documentation. Leave unchecked if unknown; affected CSA checks will remain not evaluated."/></label>)}
      <Button type="button" variant="outline" className="w-full whitespace-normal h-auto" onClick={()=>update({designPressure:i.pressure,designTemperature:i.temperature,nominalThickness:i.thickness})}>Copy operating P/T and analysis thickness</Button>
      <p className="text-xs">Copying supplies editable starting values only. Specify design maxima, nominal wall, SMYS, allowance and anchoring temperature independently. Mechanical reference temperatures are not copied.</p>
      <div className="grid grid-cols-2 gap-3">
        {field('designPressure','Design gauge pressure','pressure')}{field('designTemperature','Maximum design temperature','C')}
        {field('anchoringTemperature','Temperature at anchoring','C')}{field('nominalThickness','Nominal thickness','mm')}
        {field('allowance','Allowance (4.3.10)','mm')}{field('smys','Specified SMYS','MPa')}
      </div>
      <p className="text-xs">4.6.6 constants: E = 207000 MPa, nu = 0.3, alpha = 12 × 10⁻⁶/°C; supported temperatures up to 230 °C. These do not change the mechanical inputs. Missing CSA data affect only the relevant CSA checks.</p>
    </>}
  </section>;
}
export function ServiceCsaResults({assessment}:{assessment?:CsaAssessment}) {
  const {system}=useUnits();
  if(!assessment)return null;
  return <section className="rounded-lg border bg-card p-4 space-y-4"><h2 className="font-semibold">CSA Z662:2023 — partial evaluation</h2><p className="text-sm font-medium">{CSA_SCOPE}</p>
    {assessment.checks.map(c=><article key={c.id} className="border-t pt-3 space-y-2 text-sm">
      <h3 className="font-semibold">{c.title} · {CSA_STATUS[c.status]}</h3>
      <p>{c.reference}</p>
      {CSA_FORMULAS[c.id]?.map((eq,j)=><FormulaBlock key={j} tex={formulaTex(eq.parts)} label={eq.note}/>)}
      {c.values.length>0&&<p className="text-xs leading-relaxed">{csaDetails(c,system)}</p>}
      {c.demand!==undefined&&<p>Demand / limit: {format(c.demand,c.unit,system,6)} / {format(c.limit,c.unit,system,6)} · Utilization: {(100*c.utilization).toFixed(3)}%</p>}
      <p>{c.reason}</p>
    </article>)}
  </section>;
}
