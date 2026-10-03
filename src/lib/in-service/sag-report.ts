import {addSignature} from '../pdf/signature';
import {finishPdfPages} from '../pdf/theme';
import {SAG_FORMULAS} from './sag-formulas';
import {drawFormula} from './csa-formulas-pdf';
import {jsPDF} from 'jspdf';
import autoTable,{type UserOptions} from 'jspdf-autotable';
import {planTable} from '../pdf/pdf-measure';
import {requireReportIdentity,type ReportIdentity} from '../pdf/identity';
import {themePages,PLOT_COLORS,type PdfPalette} from './pdf-theme';
import {format} from './display';
import {sagConditions,sagResultRows,sagStress} from './sag-report-data';
import {SAG_SCOPE} from './sag-profile';
import {CSA_STATUS,CSA_SCOPE,csaDetails} from './csa';
import type {ServiceReport} from './types';
import type {UnitSystem} from '../unit-conversions';
import {ENGINEERING_DISCLAIMER_APPROVAL,ENGINEERING_DISCLAIMER_PRELIMINARY,ENGINEERING_DISCLAIMER_TITLE} from '../engineering-disclaimer';
const clean=(s:string)=>s.replace(/—/g,'-').replace(/·/g,' ').replace(/⁻/g,'-').replace(/⁶/g,'6').replace(/³/g,'3').replace(/²/g,'2');
export function createSagPdf(r:ServiceReport,system:UnitSystem,palette:PdfPalette,identity:ReportIdentity,complete:boolean):jsPDF {
 const meta=requireReportIdentity(identity),doc=new jsPDF();themePages(doc,palette);let y=24;
 const f=(v:number|undefined,u:Parameters<typeof format>[1])=>clean(format(v,u,system));
 const line=(s:string,size=9)=>{doc.setFontSize(size);doc.setTextColor(...palette.foreground);for(const l of doc.splitTextToSize(clean(s),178)){if(y>256){doc.addPage();y=22;}doc.text(l,16,y);y+=size*.45;}y+=complete?2:.8;};
 const table=(title:string,body:string[][],head=[title,'Value'])=>{
  const opts:UserOptions={startY:y,columnStyles:head.length===2?{0:{cellWidth:65}}:undefined,head:[head.map(clean)],body:body.map(row=>row.map(clean)),margin:{top:22,bottom:37,left:16,right:16},styles:{fontSize:9,cellPadding:complete?1.2:1,textColor:palette.foreground,fillColor:palette.background,lineColor:palette.border},headStyles:{fillColor:palette.tableHeader,textColor:palette.primaryText},alternateRowStyles:{fillColor:palette.card},rowPageBreak:'avoid'};
  const plan=planTable(opts,22,3);if(plan.newPage)doc.addPage();plan.parts.forEach((part,k)=>{if(k)doc.addPage();autoTable(doc,part);});
  y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+4;
 };
 const scenarios=r.result?.scenarios??[];
 for(let j=0;j<Math.max(1,scenarios.length);j++){
  if(j){doc.addPage();y=24;}
  line(`Sag only | ${complete?'Complete':'Summary'}`,17);line(`Project: ${meta.projectName} | Prepared by: ${meta.preparedBy}`);
  line(`Exported: ${meta.date.toLocaleString()} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,8);
  line(`Calculation: ${r.createdAt} | ${r.version} | ${system}`,8);
  const s=scenarios[j];line(s?.scenario.name??'No completed scenario',11);
  if(r.input.mode==='length'&&r.candidate===undefined)line('DIAGNOSTIC SAMPLE ONLY: no verified search candidate.');
  line(r.message,8);r.errors.forEach(e=>line(e));table('Calculation conditions',sagConditions(r,system));
  if(s){
   if(r.input.sag?.boundary==='clamped')line(`Reference temperature: ${f(s.scenario.referenceTemperature,'C')} | Extra axial force: ${f(s.scenario.extraAxial,'N')}`,8);
   const stress=sagStress(s,r.input.yield);
   table('Results',[...(stress.alert?[['WARNING',stress.alert]]:[]),...sagResultRows(s,system,r.input.yield)]);line(s.message,8);
   if(!['pass','fail'].includes(s.status))line('Unresolved/out-of-scope calculation: displayed values are diagnostic, not a verified design.',8);
  }
  line('Sag is positive downward; support reactions are forces ON the pipe, positive upward. Stress is a conservative von Mises beam bound, not a local contact stress.',8);
  line(SAG_SCOPE,8);
  if(r.csa){line(CSA_SCOPE,8);line('Verifications partielles ; levage non evalue selon CSA.',8);line(r.csa.checks.map(c=>`${c.reference}: ${CSA_STATUS[c.status]}`).join('; '),8);}
  line(ENGINEERING_DISCLAIMER_TITLE,10);line(ENGINEERING_DISCLAIMER_PRELIMINARY,8);line(ENGINEERING_DISCLAIMER_APPROVAL,8);
  if(!complete)continue;
  doc.addPage();y=24;line('Model and numerical evidence',14);
  line(r.input.sag?.boundary==='simple'?'Analytical Euler-Bernoulli solution under uniformly distributed weight. Axial force and end moments are zero. No mesh-convergence claim.':'Coupled clamped elastic beam: progressive soil release only. No centre constraint, imposed movement or return. N = N0 + EA/(2L) integral(z\'^2 + y\'^2) dx; wall force = N + P Ai. Sag maximum recovered from stationary points of element polynomials.');
  line(`Poisson ratio: ${r.input.nu}; thermal expansion coefficient shown below. Steel properties are those entered for operating temperature. End-condition applicability confirmed: ${r.input.sag?.confirmed?'yes':'no'}.`);
  doc.setDrawColor(...palette.foreground);
  drawFormula(doc,[{text:'a',greek:'alpha'},{text:' = ',upright:true},{text:String(Number(((system==='SI'?r.input.alpha:r.input.alpha/1.8)*1e6).toPrecision(6))),upright:true},{text:' x 10',sup:'-6',upright:true},{text:system==='SI'?' / °C':' / °F',upright:true}],22,y+4);
  y+=10;
  line(r.input.sag?.boundary==='simple'?'Global bending and transverse-shear maxima, at different positions, are combined conservatively. Thermal expansion is free.':'Refinement: 16/32/64/128 elements and 4/8/16/32 load increments; two successive changes <= 0.5% with existing absolute floors. Sag comparison uncertainty = last sag change + 0.01 mm; stress uncertainty = last stress change + 0.01 MPa.');
  if(r.input.sag?.boundary==='simple'){for(const formula of SAG_FORMULAS){if(y+20>260){doc.addPage();y=24;}doc.setDrawColor(...palette.foreground);drawFormula(doc,formula,22,y+8);y+=16;}}
  if(s?.target){
   if(y+72>260){doc.addPage();y=24;}line('Vertical profile (deflection exaggerated)',11);
   const shape=s.target.shape,L=2*r.result.halfLength,depth=Math.max(s.sag?.value??0,1e-9),top=y;
   doc.setDrawColor(...palette.muted);doc.line(20,top,190,top);doc.setDrawColor(...PLOT_COLORS.excavated);doc.setLineWidth(.6);
   for(let k=1;k<shape.length;k++){const a=shape[k-1],b=shape[k];doc.line(20+170*a.x/L,top-42*a.z/depth,20+170*b.x/L,top-42*b.z/depth);}doc.setLineWidth(.2);
   y+=49;line(`0 at left | L = ${f(L/1000,'m')} | sag = ${f(s.sag?.value,'mm')}`);
  }
  if(s){
   line(`Initial wall / effective force: ${f(s.wall0,'N')} / ${f(s.N0,'N')}; stress uncertainty: ${f(s.stressUncertainty,'MPa')}.`);
   if(!s.stages.length)line('No equilibrium state solved.');
   else table('Load path',s.stages.map(v=>[`${(v.fraction*100).toFixed(2)}%`,f(v.sagMax,'mm'),f(v.vm,'MPa'),f(v.N,'N'),f(v.leftZ,'N'),f(v.rightZ,'N')]),['Weight released','Sag','Stress bound','Effective force','Left reaction','Right reaction']);
   if(s.refinement.length)table('Mesh refinement',s.refinement.map(v=>[`${v.elements} / ${v.increments}`,f(v.vm,'MPa'),f(v.sag,'mm'),Number.isFinite(v.change)?`${(v.change*100).toFixed(4)}%`:'First level']),['Elements / increments','Stress bound','Sag','Change']);
  }
 }
 if(complete&&r.samples.length){
  doc.addPage();y=24;line('Exploratory full-span search',14);line(`Full-span bounds: ${f(r.input.minHalfLength/500,'m')} to ${f(r.input.maxHalfLength/500,'m')}. 25 initial logarithmic samples; at most 49 evaluations plus final recheck; one 60 s budget. Budget exhausted: ${r.budgetExhausted?'yes':'no'}. Upper bound reached: ${r.boundReached?'yes':'no'}.`);
  table('Search samples',r.samples.map(v=>[f(v.value/500,'m'),v.status,v.maxUtilization===null?'-':`${(v.maxUtilization*100).toFixed(2)}%`]),['Full span L','Joint stress/sag status','Stress utilization']);
 }
 if(complete&&r.csa){doc.addPage();y=24;line('CSA targeted checks - separate assessment',14);line(CSA_SCOPE);for(const c of r.csa.checks)table(c.title,[['Reference',c.reference],['Status',CSA_STATUS[c.status]],['Data',csaDetails(c,system)],['Scope / reason',c.reason],...(c.demand===undefined?[]:[['Demand / limit',`${f(c.demand,c.unit)} / ${f(c.limit,c.unit)}`]])]);}
 addSignature(doc,y,palette);finishPdfPages(doc,palette,r.appVersion,'GMC | Sag only | Qualified engineering verification required',complete?'Complete':'Summary');
 return doc;
}
