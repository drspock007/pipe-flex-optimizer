import {addSignature} from '../pdf/signature';
import {appVersionFooter} from '../pdf/app-version-footer';
import {createSagPdf} from './sag-report';
import {createPermanentPdf} from './permanent/report';
import {requireReportIdentity,type ReportIdentity} from '../pdf/identity';
import { jsPDF } from 'jspdf';
import autoTable, {type UserOptions} from 'jspdf-autotable';
import {planTable} from '../pdf/pdf-measure';
import { format,STATUS } from './display';
import { CSA_STATUS } from './csa';
import { section,type ServiceReport } from './types';
import type { UnitSystem } from '../unit-conversions';
import { LIGHT_PDF,themePages,type PdfPalette } from './pdf-theme';
import { supportPeaks } from './supports';
/** One readable sheet per scenario in the usual case; long content flows without truncation. */
export function createServiceSummary(r:ServiceReport,system:UnitSystem,palette:PdfPalette=LIGHT_PDF,identity?:ReportIdentity):jsPDF {
  const meta=requireReportIdentity(identity);
  if(r.input.analysis==='sag')return createSagPdf(r,system,palette,meta,false);
  if(r.permanent)return createPermanentPdf(r,system,palette,meta,false);
  const doc=new jsPDF();themePages(doc,palette);
  const f=(v:number|undefined,u:Parameters<typeof format>[1])=>format(v,u,system,2).replace(/—/g,'-').replace(/⁻/g,'-').replace(/⁶/g,'6').replace(/³/g,'3').replace(/·/g,' ');
  const i=r.input,c=r.result;let y=24;
  const line=(s:string,size=9)=>{doc.setFontSize(size);for(const l of doc.splitTextToSize(s,178)){if(y>256){doc.addPage();y=22;}doc.text(l,16,y);y+=size*.45;}y+=2;};
  const table=(title:string,body:string[][],explained=false)=>{
    if(y>244){doc.addPage();y=22;}
    const opts:UserOptions={startY:y,head:[explained?[title,'Result','How to read it']:[title,'Value']],body,margin:{top:22,bottom:37,left:16,right:16},styles:{fontSize:9,cellPadding:1.25,textColor:palette.foreground,fillColor:palette.background,lineColor:palette.border},headStyles:{fillColor:palette.primary,textColor:palette.primaryText},alternateRowStyles:{fillColor:palette.card},columnStyles:explained?{0:{cellWidth:47},1:{cellWidth:53},2:{cellWidth:78}}:{0:{cellWidth:76}},rowPageBreak:'avoid'};
    const plan=planTable(opts,22,3);
    if(plan.newPage)doc.addPage();
    plan.parts.forEach((part,k)=>{if(k)doc.addPage();autoTable(doc,part);});
    y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+4;
  };
  const scenarios=c?.scenarios??[];
  for(let index=0;index<Math.max(1,scenarios.length);index++){
    if(index){doc.addPage();y=24;}
    line('In-service pipe deflection | Summary',17);
    line(`Project: ${meta.projectName} | Prepared by: ${meta.preparedBy}`,9);
    line(`Exported: ${meta.date.toLocaleString()} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,8);
    line(`${system} | ${r.createdAt} | ${r.version}`,8);
    const s=scenarios[index];
    line(s?.scenario.name??'No calculated scenario',12);
    line(`Custom criterion: ${c?STATUS[c.status]:'Not evaluated'}${s?` | Scenario: ${STATUS[s.status]}`:''}`,10);
    if(i.mode!=='direct'&&r.candidate===undefined)line('DIAGNOSTIC SAMPLE ONLY - no verified search candidate.',10);
    if(r.budgetExhausted)line('Search budget exhausted; unresolved regions remain unverified.');
    if(!s?.target)line('Incomplete calculation: no completed target. Available bounds are diagnostic only.');
    r.errors.forEach(e=>line(e));
    table('Calculation conditions',[
      ['Steel OD / analysis wall',`${f(i.od,'mm')} / ${f(i.thickness,'mm')}`],
      ['Pressure / operating temperature',`${f(i.pressure,'pressure')} / ${f(i.temperature,'C')}`],
      ['E / yield / Poisson ratio',`${f(i.E,'MPa')} / ${f(i.yield,'MPa')} / ${i.nu}`],
      ['Thermal expansion / total weight',`${f(i.alpha,'alpha')} / ${f(section(i).q,'N/mm')}`],
      ['Calculated full span / target amplitude',`${f((c?.halfLength??i.halfLength)/500,'m')} / ${f(c?.displacement??i.displacement,'mm')}`],
      ['Mode / direction / angle',`${i.mode} / ${i.direction} / ${i.angle} deg`],
      ['Supports (from left clamp)',c?.supportPositions?.length?c.supportPositions.map(x=>f(x/1000,'m')).join(', '):'None'],
      ['Custom allowable',`${i.allowablePercent}% of yield = ${f(i.yield*i.allowablePercent/100,'MPa')}`],
      ['Initial reference T / extra axial force',s?`${f(s.scenario.referenceTemperature,'C')} / ${f(s.scenario.extraAxial,'N')}`:'-'],
    ]);
    if(s){const t=s.target,w=s.worst;
      const force=(v:number|undefined)=>v===undefined||!Number.isFinite(v)?'-':system==='SI'?`${Number((v/1000).toFixed(2))} kN`:f(v,'N');
      const phases:Record<string,string>={initial:'Before excavation',excavation:'Soil release',displacement:'Imposed movement',return:'Return movement',restoration:'Soil support restored'};
      table('Essential results',[
        ['Combined stress (von Mises)',f(w?.vm,'MPa'),'Largest conservative beam stress bound over the calculated path.'],
        ['Custom limit used',s.utilization===undefined?'-':`${(s.utilization*100).toFixed(1)}%`, `Stress divided by the custom limit (${f(i.yield*i.allowablePercent/100,'MPa')}). 100% = limit; above = exceeded.`],
        ['When stress is highest',w?`${phases[w.phase]??w.phase}: ${(w.fraction*100).toFixed(1)}%`:'-','Percentage is progress through that phase, not stress utilization.'],
        ['Centre position at target',`Vertical: ${f(t?.midZ,'mm')}\nLateral: ${f(t?.midY,'mm')}`,'Relative to the original straight pipe axis, before excavation.'],
        ['Pulling force at target',`Vertical: ${force(t?.forceZ)}\nLateral: ${force(t?.forceY)}`,'Force applied by the actuator to the pipe centre; not a lifting-equipment rating.'],
        ['Left clamp reaction',`Vertical: ${force(t?.leftZ)}\nLateral: ${force(t?.leftY)}`,'Force exerted by the left fixed end on the pipe at target.'],
        ['Right clamp reaction',`Vertical: ${force(t?.rightZ)}\nLateral: ${force(t?.rightY)}`,'Force exerted by the right fixed end on the pipe at target.'],
        ['Axial force in steel wall',force(t?.wall),'Actual longitudinal force carried by the steel at target.'],
        ['Effective axial force',force(t?.N),'Wall force minus internal pressure end thrust; used for deflection and stability.'],
        ...supportPeaks(s.stages).map((v,j)=>[`Support ${j+1}: peak force`,force(v.reaction),`${phases[v.phase]??v.phase}, ${(v.fraction*100).toFixed(1)}% through phase. Upward force on pipe.`]),
      ],true);
      line('Signs: vertical + upward; lateral + along the model lateral axis, - opposite. Axial + tension, - compression. Clamp forces act ON the pipe; pipe loads on clamps are opposite. 1 kN = 1000 N. Values rounded for reading; checks use unrounded values.',8);
    }
    if(r.csa){
      const names:Record<string,string>={wall:'Wall (4.3.11.2)',temperature:'Temperature (4.3.9)',anchored:'Anchored state (4.7.1)',bending:'Bending (4.7.2)','annex-c':'Annex C'};
      line('CSA partial checks: '+r.csa.checks.map(v=>`${names[v.id]??v.title}: ${CSA_STATUS[v.status]}${v.utilization===undefined?'':` (${(v.utilization*100).toFixed(1)}%)`}`).join('; ')+'.',8);
    }
    line('Scope: symmetric elastic steel span, ideal clamps, constant pressure/temperature; frictionless upward-only supports. No lifting or support-capacity approval. CSA checks are partial. Full assumptions and diagnostics: complete report.',8);
  }
  addSignature(doc,y,palette);
  const pages=doc.getNumberOfPages();
  for(let k=1;k<=pages;k++){doc.setPage(k);doc.setTextColor(...palette.muted);doc.setFontSize(8);appVersionFooter(doc,r.appVersion);doc.text('GMC | Conditions & results | Custom criterion only',16,12);doc.text(`Summary | ${k} / ${pages}`,16,288);}
  return doc;
}
