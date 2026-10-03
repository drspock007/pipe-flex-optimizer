import {addSignature} from '../../pdf/signature';
import {finishPdfPages} from '../../pdf/theme';
import {jsPDF} from 'jspdf';
import autoTable,{type UserOptions} from 'jspdf-autotable';
import {planTable} from '../../pdf/pdf-measure';
import {requireReportIdentity,type ReportIdentity} from '../../pdf/identity';
import {themePages,type PdfPalette} from '../pdf-theme';
import {format} from '../display';
import {section,type ServiceReport} from '../types';
import {CSA_STATUS,CSA_SCOPE,csaDetails} from '../csa';
import {CSA_FORMULAS} from '../csa-formulas';
import {drawFormula} from '../csa-formulas-pdf';
import type {UnitSystem} from '../../unit-conversions';
import type {PermanentScenario,PermanentStage} from './sequence';
import {pairs} from './profile';
import {ENGINEERING_DISCLAIMER_APPROVAL,ENGINEERING_DISCLAIMER_PRELIMINARY,ENGINEERING_DISCLAIMER_TITLE} from '../../engineering-disclaimer';
export const PERMANENT_LIMITS='Elastic steel and reversible soil laws only. Ideal clamps; vertical-only temporary supports. No plastic steel, irreversible soil slip, consolidation, fatigue, weld/defect assessment, local buckling, ovalization or equipment/support capacity approval. Partial CSA checks; lifting and permanent installation are not approved by these results.';
export function milestoneRows(s:PermanentScenario){return [s.target,s.released,s.final,...s.operations].filter((v):v is PermanentStage=>!!v);}
export function permanentPeaks(s:PermanentScenario){const names=[...new Set(s.stages.map(v=>v.name))];return names.map(name=>s.stages.filter(v=>v.name===name).reduce((a,b)=>a.state.vm>=b.state.vm?a:b));}
export function governingMetrics(s:PermanentScenario){
 const definitions:{label:string;unit:'MPa'|'N'|'mm'|'N/mm';value:(st:PermanentStage)=>number}[]=[
  {label:'Von Mises beam stress bound',unit:'MPa',value:st=>st.state.vm},
  {label:'Vertical displacement magnitude',unit:'mm',value:st=>Math.max(...st.mesh.map((_,j)=>Math.abs(st.state.d[5*j+1])))},
  {label:'Lateral displacement magnitude',unit:'mm',value:st=>Math.max(...st.mesh.map((_,j)=>Math.abs(st.state.d[5*j+3])))},
  {label:'Equipment vertical force magnitude',unit:'N',value:st=>Math.abs(st.equipment[0])},
  {label:'Equipment lateral force magnitude',unit:'N',value:st=>Math.abs(st.equipment[1])},
  {label:'Individual support upward reaction',unit:'N',value:st=>Math.max(0,...st.state.contacts.map(c=>c.reaction))},
  {label:'Distributed soil reaction magnitude',unit:'N/mm',value:st=>Math.max(0,...st.state.soil.map(c=>Math.abs(c.perLength)))},
 ];
 return definitions.map(v=>{const st=s.stages.reduce<PermanentStage|undefined>((a,b)=>!a||v.value(b)>v.value(a)?b:a,undefined);return {label:v.label,unit:v.unit,value:st?v.value(st):NaN,stage:st?`${st.name} (${(100*st.fraction).toFixed(2)}%)`:'Not evaluated'};});
}
export function createPermanentPdf(r:ServiceReport,units:UnitSystem,palette:PdfPalette,identity:ReportIdentity,complete:boolean){
 const meta=requireReportIdentity(identity),doc=new jsPDF();themePages(doc,palette);let y=23;
 const f=(v:number,u:Parameters<typeof format>[1])=>format(v,u,units,3).replace(/—/g,'-').replace(/⁻/g,'-').replace(/⁶/g,'6').replace(/³/g,'3').replace(/·/g,' ');
 const line=(text:string,size=9)=>{doc.setTextColor(...palette.foreground);doc.setFontSize(size);for(const l of doc.splitTextToSize(text,178)){if(y>256){doc.addPage();y=23;}doc.text(l,16,y);y+=size*.46;}y+=2;};
 const table=(head:string[],body:string[][])=>{const opts:UserOptions={head:[head],body,startY:y,margin:{top:23,bottom:37,left:16,right:16},styles:{fontSize:9,cellPadding:1.5,textColor:palette.foreground,fillColor:palette.background,lineColor:palette.border},headStyles:{fillColor:palette.primary,textColor:palette.primaryText},alternateRowStyles:{fillColor:palette.card},rowPageBreak:'avoid'};const plan=planTable(opts,23,3);if(plan.newPage)doc.addPage();plan.parts.forEach((p,j)=>{if(j)doc.addPage();autoTable(doc,p);});y=(doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+5;};
 const i=r.input,p=i.permanent;
 r.permanent.scenarios.forEach((s,index)=>{
  if(index){doc.addPage();y=23;}line(`Permanent maintained deviation | ${complete?'Complete':'Summary'}`,16);line(`Project: ${meta.projectName} | Prepared by: ${meta.preparedBy}`);line(`Exported: ${meta.date.toLocaleString()} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,8);line(`Calculation: ${r.createdAt} | ${r.version} | ${units}`,8);
  line(s.scenario.name,12);line('Numerically benchmarked model; site applicability requires separate assessment. No permanent installation approval.');line(s.message);
  table(['Calculation conditions','Value'],[
   ['OD / analysis wall',`${f(i.od,'mm')} / ${f(i.thickness,'mm')}`],['Full span / imposed amplitude',`${f(2*i.halfLength/1000,'m')} / ${f(i.displacement,'mm')}`],['Direction / angle',`${i.direction} / ${i.angle} deg`],['Construction pressure / temperature',`${f(i.pressure,'pressure')} / ${f(i.temperature,'C')}`],['E / yield / custom limit',`${f(i.E,'MPa')} / ${f(i.yield,'MPa')} / ${i.allowablePercent}%`],['Poisson / thermal expansion',`${i.nu} / ${f(i.alpha,'alpha')}`],['Initial reference temperature / extra wall force',`${f(s.scenario.referenceTemperature,'C')} / ${f(s.scenario.extraAxial,'N')}`],['Initial distributed weight',f(section(i).q,'N/mm')],['Initial supports / release',`${p.initialSupports} / ${p.release} backfill`],['Setting / removal order',`${p.heightMode} / ${(p.removalOrder.length?p.removalOrder:pairs(i).map((_,j)=>j)).map(j=>`pair ${j+1}`).join(', ')}`],['Final centre tolerances: vertical / lateral',`${f(p.verticalTolerance,'mm')} / ${f(p.lateralTolerance,'mm')}`],['Scope confirmations',`Ideal end clamps: ${p.clampsConfirmed}; properties at all temperatures: ${p.propertiesConfirmed}`],
  ]);
  table(['Separate assessment','Result'],[['Numerical sequence',s.status],['Custom elastic stress criterion',s.mechanical],['Centre position retained in controlled directions',s.position],['Documented soil limit reached',s.soilLimited?'Yes - permanent retention not verified':'No detected limit in computed states'],['Stress uncertainty',f(s.uncertainty,'MPa')]]);
  table(['Milestone','Centre vertical / lateral','Von Mises beam bound'],milestoneRows(s).map(st=>{const m=st.mesh.indexOf(i.halfLength);return [st.name,`${f(st.state.d[5*m+1],'mm')} / ${f(st.state.d[5*m+3],'mm')}`,f(st.state.vm,'MPa')];}));
  table(['Support pair','Left position / height','Peak reaction left / right'],pairs(i).map((v,j)=>{const peak=(side:string)=>Math.max(0,...s.stages.flatMap(st=>st.state.contacts.filter(c=>c.id===`pair ${j+1} ${side}`).map(c=>c.reaction)));return [`${j+1}`,`${f(v*2*i.halfLength/1000,'m')} / ${f(s.heights[j],'mm')}`,`${f(peak('left'),'N')} / ${f(peak('right'),'N')}`];}));
  line(p.heightMode==='fitted'?'Support heights fit this scenario independently. Different scenario heights do not validate a common physical setting.':'Common support heights are used for all scenarios. Calculated positioning can introduce preload.');
  table(['Operating case','Pressure / temperature','Fluid density'],p.operations.map(o=>[o.name,`${f(o.pressure,'pressure')} / ${f(o.temperature,'C')}`,f(o.fluidDensity,'kg/m3')]));
  for(const z of p.zones){table([`Backfill: ${z.name}`,'Value'],[['Span fraction / activation',`${z.start} to ${z.end} / stage ${z.step}`],...(z.material?[['Backfill material',z.material]]:[]),...(z.loadEstimate?[['Weight estimate: cover / soil width / bulk density',`${f(z.loadEstimate.cover,'m')} / ${f(z.loadEstimate.width,'m')} / ${f(z.loadEstimate.density,'kg/m3')}`],['Weight estimate scope','q = rho g H B; g = 9.80665 m/s2. Above-water rectangular soil column only. No arching, buoyancy or compaction-force calculation. Project applicability requires review.']]:[]),['Bed gap / permanent load / construction load',`${f(z.bedOffset,'mm')} / ${f(z.weight,'N/mm')} / ${f(z.construction,'N/mm')}`],...(['axial','lateral','down','up'] as const).map(k=>[`${k} curve`,`${z[k].source}\n${z[k].points.map(pt=>`${f(pt.displacement,'mm')}: ${f(pt.reaction,'N/mm')}`).join('; ')}`])]);}
  if(complete){table(['Maximum demand','Magnitude','Governing stage'],governingMetrics(s).map(v=>[v.label,f(v.value,v.unit),v.stage]));table(['Governing state by phase','Progress','Stress bound'],permanentPeaks(s).map(st=>[st.name,`${(st.fraction*100).toFixed(2)}%`,f(st.state.vm,'MPa')]));table(['Refinement','Stress bound','Relative change'],s.refinement.map(v=>[`${v.elements} base elements / ${v.increments} increments`,f(v.stress,'MPa'),Number.isFinite(v.change)?`${(100*v.change).toFixed(4)}%`:'First level']));
   for(const st of milestoneRows(s)){line(st.name,11);table(['x','Axial / vertical / lateral displacement','Effective / wall axial force'],st.mesh.map((x,j)=>{const n=st.state.axial[Math.min(j,st.state.axial.length-1)],Ai=section(i).Ai;return [f(x/1000,'m'),`${f(st.state.d[5*j],'mm')} / ${f(st.state.d[5*j+1],'mm')} / ${f(st.state.d[5*j+3],'mm')}`,`${f(n,'N')} / ${f(n+st.pressure*Ai,'N')}`];}));const groups=new Map<string,typeof st.state.soil>();for(const v of st.state.soil){const key=`${v.zone}|${v.node}`;groups.set(key,[...(groups.get(key)??[]),v]);}line('Soil cells: force on pipe, then relative movement. LIMIT marks terminal resistance or movement domain.');table(['Zone / location','Axial','Lateral','Bearing','Uplift'],[...groups.values()].map(group=>[`${group[0].zone}\n${f(st.mesh[group[0].node]/1000,'m')}`,...['axial','lateral','bearing','uplift'].map(direction=>{const v=group.find(v=>v.direction===direction);return v?`${f(v.force,'N')}\n${f(v.displacement,'mm')}${v.limited?' LIMIT':''}`:'-';})]));}
  }
  if(r.csa){line('CSA partial checks: '+r.csa.checks.map(c=>`${c.title}: ${CSA_STATUS[c.status]}`).join('; '));if(complete){line(CSA_SCOPE);for(const c of r.csa.checks){const equations=CSA_FORMULAS[c.id];if(equations){if(y+equations.length*28+35>260){doc.addPage();y=23;}line(`${c.title} - ${c.reference}`,11);for(const eq of equations){doc.setDrawColor(...palette.foreground);drawFormula(doc,eq.parts,22,y+7);y+=16;if(eq.note)line(eq.note.replace('≤','<='));}}table(['Partial CSA check','Value'],[['Reference / status',`${c.reference} / ${CSA_STATUS[c.status]}`],['Inputs and derived values',csaDetails(c,units)||'None'],...(c.demand===undefined?[]:[['Demand / limit',`${f(c.demand,c.unit)} / ${f(c.limit,c.unit)}`],['Utilization',`${(100*c.utilization).toFixed(3)}%`]]),['Scope / reason',c.reason]]);}}}line(PERMANENT_LIMITS,8);line(ENGINEERING_DISCLAIMER_TITLE,10);line(ENGINEERING_DISCLAIMER_PRELIMINARY,8);line(ENGINEERING_DISCLAIMER_APPROVAL,8);
 });
 addSignature(doc,y,palette);
 finishPdfPages(doc,palette,r.appVersion,'GMC | Permanent elastic assessment | Qualified engineering verification required',complete?'Complete':'Summary');return doc;
}
