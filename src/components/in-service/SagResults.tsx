import FormulaBlock from '@/pages/help/FormulaBlock';
import {formulaTex} from '@/lib/in-service/csa-formulas';
import {SAG_FORMULAS} from '@/lib/in-service/sag-formulas';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {IdentityFields} from '@/components/ReportIdentityFields';
import {useUnits} from '@/contexts/UnitContext';
import {currentPdfPalette} from '@/lib/in-service/pdf-theme';
import {createServicePdf} from '@/lib/in-service/report';
import {createServiceSummary} from '@/lib/in-service/report-summary';
import {sagConditions,sagResultRows} from '@/lib/in-service/sag-report-data';
import {SAG_SCOPE} from '@/lib/in-service/sag-profile';
import {format} from '@/lib/in-service/display';
import type {ServiceReport} from '@/lib/in-service/types';
import {ServiceCsaResults} from './ServiceCsa';
export default function SagResults({report:r,identity}:{report:ServiceReport;identity:IdentityFields}){
 const {system}=useUnits(),[error,setError]=useState('');
 const table=(rows:string[][])=><div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody>{rows.map(([k,v])=><tr key={k} className="border-b"><th className="p-2 font-medium">{k}</th><td className="p-2">{v}</td></tr>)}</tbody></table></div>;
 return <div className="space-y-4"><section className="border rounded-lg bg-card p-4 space-y-3"><h2 className="font-semibold text-lg">Sag only — results</h2>
 <div className="flex gap-2">{(['Summary','Complete'] as const).map(kind=><Button key={kind} variant={kind==='Summary'?'default':'outline'} disabled={!r.result||!identity.preparedBy.trim()||!identity.projectName.trim()} onClick={()=>{try{const meta={...identity,date:new Date()},p=currentPdfPalette();(kind==='Summary'?createServiceSummary(r,system,p,meta):createServicePdf(r,system,{},p,meta)).save(`sag-only-${kind.toLowerCase()}.pdf`);setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>{kind} PDF · {system}</Button>)}</div>
 {error&&<p role="alert">{error}</p>}<p>{r.message}</p>{r.errors.map(e=><p className="text-destructive" role="alert" key={e}>{e}</p>)}
 {r.input.mode==='length'&&r.candidate===undefined&&<p className="text-amber-700 dark:text-amber-400">Diagnostic sample only — no verified span candidate.</p>}
 {table(sagConditions(r,system))}
 {r.input.sag?.boundary==='simple'&&<details><summary>Analytical formulas</summary>{SAG_FORMULAS.map((parts,k)=><FormulaBlock key={k} tex={formulaTex(parts)}/>)}</details>}
 </section>
 {r.result?.scenarios.map(s=><section className="border rounded-lg bg-card p-4 space-y-3" key={s.scenario.id}><h3 className="font-semibold">{s.scenario.name}</h3><p className="text-sm">{s.message}</p>
 {r.input.sag?.boundary==='clamped'&&<p className="text-xs">Reference temperature: {format(s.scenario.referenceTemperature,'C',system)} · Extra axial force: {format(s.scenario.extraAxial,'N',system)}</p>}
 {table(sagResultRows(s,system))}
 {!['pass','fail'].includes(s.status)&&<p className="text-amber-700 dark:text-amber-400">Displayed values are diagnostic; this calculation is unresolved or outside scope.</p>}
 {s.target&&<figure><figcaption className="text-sm">Vertical profile — downward sag, exaggerated</figcaption><svg className="w-full" viewBox="0 0 620 180" role="img" aria-label="Sag profile between end supports"><path d="M35 25H585" stroke="currentColor" strokeDasharray="5 4" fill="none"/><path d={s.target.shape.map((p,k)=>`${k?'L':'M'}${35+550*p.x/(2*r.result.halfLength)},${25-110*p.z/Math.max(s.sag?.value??0,1e-9)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="3"/><text x="35" y="167" fill="currentColor" fontSize="14">0</text><text x="390" y="167" fill="currentColor" fontSize="14">L = {format(r.result.halfLength/500,'m',system)}</text></svg></figure>}
 <p className="text-xs">Sag is positive downward from the line between the end supports. Reactions act on the pipe, positive upward. 100% stress utilization equals the custom limit.</p>
 {s.refinement.length>0&&<details><summary>Refinement diagnostics</summary>{s.refinement.map(v=><p className="text-xs" key={v.elements}>{v.elements} elements / {v.increments} load increments: {format(v.vm,'MPa',system)} · sag {format(v.sag,'mm',system)} · {Number.isFinite(v.change)?`${(100*v.change).toFixed(4)}% change`:'first level'}</p>)}</details>}
 </section>)}
 <ServiceCsaResults assessment={r.csa}/>
 {!!r.samples.length&&<details className="border rounded-lg bg-card p-4"><summary>Exploratory search · {r.samples.length} samples</summary><p className="text-xs">Unresolved samples and unsampled intervals remain unverified. No global maximum certification.</p>{table(r.samples.map(v=>[format(v.value/500,'m',system),v.status==='pass'?'Stress and sag limits satisfied':v.status==='fail'?'Stress or sag limit exceeded':v.status]))}</details>}
 <p className="text-xs text-muted-foreground">{SAG_SCOPE} Model {r.version} · {(r.elapsedMs/1000).toFixed(2)} s.</p></div>;
}
