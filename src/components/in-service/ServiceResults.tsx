import {buildPdfFileName} from '@/lib/pdf/file-name';
import SagResults from './SagResults';
import PermanentResults from './PermanentResults';
import type {IdentityFields} from '@/components/ReportIdentityFields';
import { createServiceSummary } from '@/lib/in-service/report-summary';
import { currentPdfPalette } from '@/lib/in-service/pdf-theme';
import { ServiceCsaResults } from './ServiceCsa';
import SupportResults from './SupportResults';
import {selectedStage} from '@/lib/in-service/supports';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUnits } from '@/contexts/UnitContext';
import { format,STATUS } from '@/lib/in-service/display';
import { createServicePdf,phasePeaks,LIMITS } from '@/lib/in-service/report';
import type { ServiceReport,ScenarioResult,ShapePoint,Stage } from '@/lib/in-service/types';

function Shape({s,axis,D,selected}:{s:ScenarioResult;axis:'z'|'y';D:number;selected?:Stage}) {
  const {system}=useUnits();const shapes=[s.excavated.shape,s.target.shape,...(selected?[selected.shape]:[])],values=shapes.flat().map(p=>p[axis]);
  const low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1;
  const x=(v:number)=>45+v/D*530,y=(v:number)=>150-(v-low)/span*115;
  const path=(points:ShapePoint[])=>points.map((p,k)=>`${k?'L':'M'}${x(p.x)},${y(p[axis])}`).join(' ');
  return <figure><figcaption className="text-sm font-medium">{axis==='z'?'Vertical':'Lateral'} profile</figcaption><svg role="img" aria-label={`${axis==='z'?'Vertical':'Lateral'} profiles before excavation, after excavation and at target; exaggerated deflection`} viewBox="0 0 620 195" className="w-full">
    <line x1={45} y1={y(0)} x2={575} y2={y(0)} stroke="currentColor" strokeDasharray="5 4" opacity="0.5"/>
    <path d={path(shapes[0])} fill="none" stroke="#3b82f6" strokeWidth="2"/><path d={path(shapes[1])} fill="none" stroke="#f59e0b" strokeWidth="3"/>
    {selected&&<path d={path(selected.shape)} fill="none" stroke="#10b981" strokeWidth="2"/>}
    {(selected??s.target).supports?.map((v,j)=><g key={j}><path d={`M ${x(v.x)} ${y(0)+3} l -6 9 h 12 Z`} fill={v.state==='contact'?'#10b981':v.state==='detached'?'#f59e0b':'#94a3b8'}/><title>{`Support ${j+1}: ${v.state}, reaction ${format(v.reaction,'N',system)}`}</title></g>)}
    <text x="5" y="25" fill="currentColor" fontSize="18">{format(high,'mm',system)}</text><text x="5" y="165" fill="currentColor" fontSize="18">{format(low,'mm',system)}</text>
    <text x="45" y="188" fill="currentColor" fontSize="18">0</text><text x="500" y="188" fill="currentColor" fontSize="18">{format(D/1000,'m',system)}</text>
  </svg></figure>;
}
export default function ServiceResults({report:r,identity}:{report:ServiceReport;identity:IdentityFields}) {
  const {system}=useUnits();const f=(v:number|undefined,u:Parameters<typeof format>[1])=>format(v,u,system);
  const [exportError,setExportError]=useState('');
  const [selected,setSelected]=useState<Record<string,number>>({});
  if(r.input.analysis==='sag')return <SagResults report={r} identity={identity}/>;
  if(r.permanent)return <PermanentResults report={r} identity={identity}/>;
  const c=r.result;
  return <div className="space-y-4">
    <section className="border rounded-lg p-4 bg-card space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-lg">Results</h2>
      {c&&<div className="flex flex-wrap gap-2">{(['Summary','Complete'] as const).map(kind=><Button key={kind} disabled={!identity.preparedBy.trim()||!identity.projectName.trim()} variant={kind==='Summary'?'default':'outline'} onClick={()=>{try{if(!identity.preparedBy.trim()||!identity.projectName.trim())return;const meta={...identity,date:new Date()},palette=currentPdfPalette();(kind==='Summary'?createServiceSummary(r,system,palette,meta):createServicePdf(r,system,selected,palette,meta)).save(buildPdfFileName('in-serv-defl',meta.preparedBy,meta.date,kind.toLowerCase())+'.pdf');setExportError('');}catch(e){setExportError(e instanceof Error?e.message:String(e));}}}>{kind} PDF · {system}</Button>)}</div>}</div>
      <p className="text-xs text-muted-foreground">Summary: conditions and essential results, usually one page per scenario. Complete: equations, profiles and diagnostics. Both use the current app theme.</p>
      <p>{r.message}</p>{exportError&&<p role="alert">{exportError}</p>}
      {r.errors.map(e=><p key={e} role="alert" className="text-destructive">{e}</p>)}
      {c&&<><p className="text-sm">Displayed case: <strong>{f(c.halfLength/1000,'m')} each side</strong> · total {f(c.halfLength/500,'m')} · target amplitude {f(c.displacement,'mm')} · {c.supportPositions?.length??0} supports.</p>
        {r.input.mode!=='direct'&&r.candidate===undefined&&<p className="text-sm text-amber-600">The detail below is a diagnostic sample, not an admissible search candidate.</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-2">Scenario</th><th className="p-2">Status</th><th className="p-2">VM beam bound</th><th className="p-2">Utilization</th></tr></thead><tbody>{c.scenarios.map(s=><tr key={s.scenario.id} className="border-b"><td className="p-2 max-w-56 break-words">{s.scenario.name}{s.scenario.id===c.governing?' · largest computed bound':''}</td><td className={`p-2 ${s.status==='pass'?'text-emerald-600':'text-amber-600'}`}>{STATUS[s.status]}</td><td className="p-2 whitespace-nowrap">{f(s.worst?.vm,'MPa')}</td><td className="p-2">{s.utilization===undefined?'—':`${(s.utilization*100).toFixed(1)}%`}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-muted-foreground">Common custom criterion: {STATUS[c.status]}. Initial temperature and extra force remain hypotheses; only the listed scenarios were assessed.</p></>}
    </section>
    <ServiceCsaResults assessment={r.csa}/>
    {c?.scenarios.map(s=><section key={s.scenario.id} className="border rounded-lg p-4 bg-card space-y-4">
      <h3 className="font-semibold">{s.scenario.name}</h3><p className="text-sm">{s.message}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Initial wall force</dt><dd>{f(s.wall0,'N')}</dd></div><div><dt className="text-muted-foreground">Initial effective force</dt><dd>{f(s.N0,'N')}</dd></div><div><dt className="text-muted-foreground">Euler compression magnitude</dt><dd>{f(s.criticalLoad,'N')}</dd></div><div><dt className="text-muted-foreground">Reference temperature / extra force</dt><dd>{f(s.scenario.referenceTemperature,'C')} / {f(s.scenario.extraAxial,'N')}</dd></div></dl>
      {!s.target&&s.worst&&<p className="text-sm">Incomplete path: largest computed bound {f(s.worst.vm,'MPa')} during {s.worst.phase}, {(s.worst.fraction*100).toFixed(1)}%, in element {f(s.worst.element[0]/1000,'m')}–{f(s.worst.element[1]/1000,'m')}. No completed target or converged verdict.</p>}
      <SupportResults s={s} index={selected[s.scenario.id]} onSelect={index=>setSelected({...selected,[s.scenario.id]:index})}/>
      {s.target&&<>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2"><Shape s={s} axis="z" D={2*c.halfLength} selected={s.target.supports?.length?selectedStage(s,selected[s.scenario.id]):undefined}/><Shape s={s} axis="y" D={2*c.halfLength} selected={s.target.supports?.length?selectedStage(s,selected[s.scenario.id]):undefined}/></div>
        <p className="text-xs text-muted-foreground">Dashed: original · <span className="text-blue-500">Blue: excavated</span> · <span className="text-amber-500">Orange: target</span>. Deflection exaggerated; return retraces these states before support is restored.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Target / displacement quantities</th><th className="text-left p-2">Vertical</th><th className="text-left p-2">Lateral</th></tr></thead><tbody>{[
          [s.target.supports?.length?'Midpoint after excavation':'Free-sag midpoint',f(s.excavated.midZ,'mm'),f(s.excavated.midY,'mm')],['Target midpoint',f(s.target.midZ,'mm'),f(s.target.midY,'mm')],[s.target.supports?.length?'Movement from excavated state':'Movement from free sag',f(s.target.midZ-s.excavated.midZ,'mm'),f(s.target.midY-s.excavated.midY,'mm')],
          ['Actuator force',f(s.target.forceZ,'N'),f(s.target.forceY,'N')],['Left reaction',f(s.target.leftZ,'N'),f(s.target.leftY,'N')],['Right reaction',f(s.target.rightZ,'N'),f(s.target.rightY,'N')],
          ['Left end moment',f(s.target.leftMz/1e6,'kN·m'),f(s.target.leftMy/1e6,'kN·m')],['Right end moment',f(s.target.rightMz/1e6,'kN·m'),f(s.target.rightMy/1e6,'kN·m')]
        ].map(row=><tr key={row[0]} className="border-b">{row.map((v,k)=><td key={k} className="p-2">{v}</td>)}</tr>)}</tbody></table></div>
        <p className="text-sm">Target wall / effective force: {f(s.target.wall,'N')} / {f(s.target.N,'N')}. Effective axial reactions, left / right: {f(-s.target.N,'N')} / {f(s.target.N,'N')}.</p>
        <p className="text-sm">Governing phase: <strong>{s.worst.phase}</strong>, {(s.worst.fraction*100).toFixed(1)}%. Critical element: {f(s.worst.element[0]/1000,'m')}–{f(s.worst.element[1]/1000,'m')} from the left end. Normal maximum at {f(s.worst.x/1000,'m')}; shear maximum at {f(s.worst.shearX/1000,'m')}.</p>
        <details><summary className="cursor-pointer text-sm font-medium">Path peaks & numerical diagnostics</summary><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="p-2 text-left">Phase</th><th className="p-2 text-left">VM beam bound</th><th className="p-2 text-left">Effective force at peak</th></tr></thead><tbody>{phasePeaks(s.stages).map(v=><tr key={v.phase}><td className="p-2">{v.phase}</td><td className="p-2">{f(v.vm,'MPa')}</td><td className="p-2">{f(v.N,'N')}</td></tr>)}</tbody></table></div>
          <p className="text-xs">Stress uncertainty: {f(s.stressUncertainty,'MPa')}. Maximum slope: {Math.max(...s.stages.map(v=>v.maxSlope)).toPrecision(4)}. Maximum axial residual: {f(Math.max(...s.stages.map(v=>v.residual)),'N')}.</p>
          {s.refinement.map(v=><p key={v.elements} className="text-xs mt-2">{v.elements} elements / {v.increments} increments: {f(v.vm,'MPa')} · max actuator {f(v.maxForce,'N')} · sag {f(v.sag,'mm')} · change {Number.isFinite(v.change)?`${(v.change*100).toFixed(4)}%`:'first level'}</p>)}
        </details>
      </>}
    </section>)}
    {r.samples.length>0&&<details className="border rounded-lg bg-card p-4"><summary className="cursor-pointer">Exploratory search coverage · {r.samples.length} samples</summary><p className="text-xs my-3">No certification of a global minimum or maximum. Unresolved samples and unsampled regions are not verified. {r.budgetExhausted?'Time budget exhausted.':''}</p><div className="max-h-80 overflow-auto"><table className="w-full text-xs"><thead><tr><th className="text-left p-2">{r.input.mode==='supports'?'Support count':r.input.mode==='length'?'Length each side':'Amplitude'}</th><th className="text-left p-2">Status</th></tr></thead><tbody>{r.samples.map((v,k)=><tr key={k}><td className="p-2">{r.input.mode==='supports'?v.value:r.input.mode==='length'?f(v.value/1000,'m'):f(v.value,'mm')}</td><td className="p-2">{STATUS[v.status]}</td></tr>)}</tbody></table></div></details>}
    <p className="text-xs text-muted-foreground leading-relaxed">{LIMITS} Model {r.version} · {(r.elapsedMs/1000).toFixed(2)} s.</p>
  </div>;
}
