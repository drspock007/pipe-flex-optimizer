import { supportPeaks,reactionPeaks } from './supports';
import { FLUIDS, effectiveFluidDensity, gasProperties } from './fluid';
import { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import { planTable } from '../pdf/pdf-measure';
import { format, STATUS } from './display';
import { COATING_LABELS } from '../coating-presets';
import { section, serviceCoating, type ServiceReport, type Stage } from './types';
import type { UnitSystem } from '../unit-conversions';
const ascii=(s:string)=>s.replace(/—/g,'-').replace(/·/g,' ').replace(/⁻/g,'-').replace(/⁶/g,'6').replace(/³/g,'3').replace(/²/g,'2').replace(/⁴/g,'4');
export const LIMITS='Steel only; temporary, symmetric excavation, ideal clamps, no ground contact. Elastic small-strain/moderate-rotation beam; uniform pressure and temperature. Conservative Von Mises beam bound, not local sling/contact stress. No assessment of support capacity, local bearing, settlement, ovalization, defects, weld concentrations, fatigue or soil failure. No normative compliance verdict. Model scope: full length / OD >= 10, resultant slope <= 0.1.';
export function phasePeaks(stages:Stage[]) {
  return ['initial','excavation','displacement','return','restoration'].flatMap(phase=>{
    const list=stages.filter(s=>s.phase===phase);return list.length?[list.reduce((a,b)=>a.vm>=b.vm?a:b)]:[];
  });
}
export function createServicePdf(r:ServiceReport,system:UnitSystem,selected:Record<string,number>={}):jsPDF {
  const doc=new jsPDF(),i=r.input,p=section(i),coat=serviceCoating(i);let y=24;
  const f=(v:number,u:Parameters<typeof format>[1],digits=3)=>ascii(format(v,u,system,digits));
  const text=(s:string,size=9)=>{
    doc.setFontSize(size);const lines=doc.splitTextToSize(ascii(s),178) as string[];
    for(const line of lines){if(y>277){doc.addPage();y=22;}doc.text(line,16,y);y+=size*0.45;}
    y+=3;
  };
  const table=(title:string,head:string[],body:string[][])=>{
    const opts:UserOptions={startY:y+8,head:[head.map(ascii)],body:body.map(row=>row.map(ascii)),margin:{left:16,right:16,top:22,bottom:18},styles:{fontSize:8,cellPadding:2.1,overflow:'linebreak'},headStyles:{fillColor:[36,55,75]},rowPageBreak:'avoid',showHead:'everyPage'};
    if(y>255){doc.addPage();y=22;opts.startY=y+8;}
    const plan=planTable(opts,30,3);
    if(plan.newPage){doc.addPage();y=22;}
    doc.setFontSize(11);doc.setTextColor(25,40,55);doc.text(ascii(title),16,y+4);
    for(let k=0;k<plan.parts.length;k++){
      if(k){doc.addPage();doc.setFontSize(11);doc.text(ascii(title+' (continued)'),16,26);}
      autoTable(doc,plan.parts[k]);
    }
    y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;
  };
  doc.setFontSize(18);doc.text('Temporary in-service pipe deflection',16,y);y+=9;
  text(`Model ${r.version} | ${system} | ${r.createdAt}`);
  text(r.message);text(LIMITS);
  table('Inputs and hypotheses',['Input','Value'],[
    ['Calculation',i.mode],['Steel OD / analysis thickness',`${f(i.od,'mm')} / ${f(i.thickness,'mm')}`],
    ['E / yield at operating temperature',`${f(i.E,'MPa')} / ${f(i.yield,'MPa')}`],['Poisson ratio / thermal expansion',`${i.nu} / ${f(i.alpha,'alpha')}`],
    ['Pressure / temperature (constant)',`${f(i.pressure,'pressure')} / ${f(i.temperature,'C')}`],
    ['Steel / fluid density',`${f(i.steelDensity,'kg/m3')} / ${f(effectiveFluidDensity(i),'kg/m3')}`],
    ['Fluid model',FLUIDS[i.fluidType??'custom'].label+(i.fluidType&&i.fluidType!=='custom'?`; M=${gasProperties(i).molarMass} g/mol; Z=${gasProperties(i).z}; Patm=${f(gasProperties(i).atmosphere,'pressure')}`:'; user-entered density.')],
    ['Coating / effective thickness / density',`${COATING_LABELS[i.coatingType??'custom']} / ${f(coat.thickness,'mm')} / ${f(coat.density,'kg/m3')}`],['Distributed weight',f(p.q,'N/mm')],
    ['Specified half / full length',`${f(i.halfLength/1000,'m')} / ${f(i.halfLength/500,'m')}`],
    ['Target direction / angle / amplitude',`${i.direction} / ${i.angle} deg / ${f(i.displacement,'mm')}`],
    ['Half-length search bounds',`${f(i.minHalfLength/1000,'m')} to ${f(i.maxHalfLength/1000,'m')}`],['Amplitude search upper bound',f(i.maxDisplacement,'mm')],
    ['Custom criterion',`${i.allowablePercent}% of yield; safety factor ${(100/i.allowablePercent).toFixed(4)}; allowable ${f(i.yield*i.allowablePercent/100,'MPa')}`],
    ['Criterion definition','Conservative Von Mises bound including transverse beam shear; not an exact local 3D peak.'],
    ['Displacement reference','Original straight axis before excavation. Horizontal-only actuation leaves vertical sag free.'],
    ['Extra axial force convention','Additional wall force excluding modeled pressure and thermal force; tension positive. Zero is an explicit hypothesis.'],
    ['Return assumption','Reverse elastic path to the excavated state, then uniform restoration of support to recover the original straight axis.'],
    ['Numerics','Meshes 16/32/64/128; path increments 4/8/16/32. Two successive changes <=0.5%, with absolute floors; no post-buckling.'],
    ['Search coverage',i.mode==='supports'?`Counts 0,2,...,${i.maxSupports??10}, with final recheck; ONE 60 s budget; no general optimum.`:'25 initial samples, at most 49 evaluations + candidate recheck, 60 s budget; exploratory, no global optimum proof.'],
    ['Reference frameworks','Custom only. CSA Z662:2023 pending documentary validation. ASME and European checks unavailable.'],
  ]);
  if(i.fluidType&&i.fluidType!=='custom')text('Gas density: rho=Pabs M/(Z R T). Z=1 assumes ideal gas; no automatic real-gas EOS. Natural gas preset assumes methane; specify mixture molar mass and operating Z.');
  if(i.mode==='supports'||(i.supports&&i.supports.kind!=='none'))text('Temporary supports: '+(i.mode==='supports'?'search equidistant pairs':i.supports?.kind??'none')+'. Rigid, fixed, frictionless, vertical upward reaction only; original axis level. No lateral restraint. Installed before uniform soil release. No local bearing/capacity/settlement check. Custom positions scale with total length.');
  table('Initial-state scenarios',['Scenario','Reference temperature','Extra axial force'],i.scenarios.map(s=>[s.name,f(s.referenceTemperature,'C'),f(s.extraAxial,'N')]));
  if(r.result){
    text(`Displayed calculation: each side ${f(r.result.halfLength/1000,'m')}; total ${f(r.result.halfLength/500,'m')}; amplitude ${f(r.result.displacement,'mm')}.`);
    if(i.mode!=='direct'&&r.candidate===undefined)text('No verified search candidate: the detailed calculation below is a diagnostic sample only.');
    if(r.result.supportPositions?.length)text('Actual support positions from left clamp: '+r.result.supportPositions.map(x=>f(x/1000,'m')).join(', '));
    table('Scenario comparison',['Scenario','Status','Beam VM bound','Utilization'],r.result.scenarios.map(s=>[s.scenario.name,STATUS[s.status],f(s.worst?.vm,'MPa'),s.utilization===undefined?'-':`${(100*s.utilization).toFixed(2)}%`]));
    for(const s of r.result.scenarios){
      doc.addPage();y=24;text(s.scenario.name,13);text(`${STATUS[s.status]}: ${s.message}`);
      table('Initial axial state',['Quantity','Value'],[['Initial wall force',f(s.wall0,'N')],['Initial effective force',f(s.N0,'N')],['Fixed-fixed Euler compression magnitude',f(s.criticalLoad,'N')],['Numerical stress uncertainty',f(s.stressUncertainty,'MPa')]]);
      const peaks=supportPeaks(s.stages),chosen=s.stages[selected[s.scenario.id]]??s.target??s.stages.at(-1);
      if(peaks.length) {
        text(`Selected stage: ${chosen.phase}, ${(chosen.fraction*100).toFixed(3)}%; VM ${f(chosen.vm,'MPa')}; actuator vertical / lateral ${f(chosen.forceZ,'N')} / ${f(chosen.forceY,'N')}.`);
        table('Support reactions and contacts',['Support / position','Selected state / gap','Selected reaction','Max reaction / phase','Target state'],peaks.map((v,j)=>[`${j+1}: ${f(v.x/1000,'m')}`,`${chosen.supports[j].state} / ${f(chosen.supports[j].gap,'mm')}`,f(chosen.supports[j].reaction,'N'),`${f(v.reaction,'N')} / ${v.phase} ${(v.fraction*100).toFixed(3)}%`,s.target?.supports[j]?.state??'Incomplete']));
        table('Peak transverse forces over intervention',['Location','Resultant','Vertical / lateral at peak','Phase'],reactionPeaks(s.stages).map(v=>[v.name,f(v.resultant,'N'),`${f(v.vertical,'N')} / ${f(v.lateral,'N')}`,`${v.phase} ${(v.fraction*100).toFixed(3)}%`]));
        table('Contact path diagnostics',['Phase / fraction','Contact / limit / detached counts','Max contact iterations'],s.stages.map(v=>[`${v.phase} / ${(v.fraction*100).toFixed(3)}%`,['contact','limit','detached'].map(state=>v.supports.filter(c=>c.state===state).length).join(' / '),String(v.contactIterations??0)]));
      }
      if(s.target){const t=s.target,w=s.worst;
        table('Displacements, forces and reactions',['Quantity','Value'],[
          [t.supports?.length?'Excavated middle vertical / lateral':'Free-sag middle vertical / lateral',`${f(s.excavated.midZ,'mm')} / ${f(s.excavated.midY,'mm')}`],
          ['Target middle vertical / lateral',`${f(t.midZ,'mm')} / ${f(t.midY,'mm')}`],
          [t.supports?.length?'Motion from excavated state vertical / lateral':'Motion from free sag vertical / lateral',`${f(t.midZ-s.excavated.midZ,'mm')} / ${f(t.midY-s.excavated.midY,'mm')}`],
          ['Target actuator vertical / lateral',`${f(t.forceZ,'N')} / ${f(t.forceY,'N')}`],
          ['Target left reactions vertical / lateral',`${f(t.leftZ,'N')} / ${f(t.leftY,'N')}`],['Target right reactions vertical / lateral',`${f(t.rightZ,'N')} / ${f(t.rightY,'N')}`],
          ['Target left moments vertical / lateral plane',`${f(t.leftMz/1e6,'kN·m')} / ${f(t.leftMy/1e6,'kN·m')}`],['Target right moments vertical / lateral plane',`${f(t.rightMz/1e6,'kN·m')} / ${f(t.rightMy/1e6,'kN·m')}`],
          ['Target axial reactions (effective, left / right)',`${f(-t.N,'N')} / ${f(t.N,'N')}`],['Target wall / effective force',`${f(t.wall,'N')} / ${f(t.N,'N')}`],
          ['Governing phase / fraction',`${w.phase} / ${w.fraction}`],['Critical element from left end',`${f(w.element[0]/1000,'m')} to ${f(w.element[1]/1000,'m')}`],
          ['Normal maximum / shear maximum abscissae',`${f(w.x/1000,'m')} / ${f(w.shearX/1000,'m')}`],
          ['Max slope / max axial residual over path',`${Math.max(...s.stages.map(v=>v.maxSlope)).toPrecision(5)} / ${f(Math.max(...s.stages.map(v=>v.residual)),'N')}`],
        ]);
        table('Intervention phase peaks',['Phase','VM beam bound','Effective force at peak','Middle vertical / lateral'],phasePeaks(s.stages).map(v=>[v.phase,f(v.vm,'MPa'),f(v.N,'N'),`${f(v.midZ,'mm')} / ${f(v.midY,'mm')}`]));
        if(y>205){doc.addPage();y=24;}
        text('Profiles: original (grey), excavated (blue), target (orange)'+(peaks.length?', selected support stage (green)':'')+'. Exaggerated deflection.');
        const shapes=[s.excavated.shape,t.shape,...(peaks.length?[chosen.shape]:[])],points=shapes.flat();
        for(const [index,axis] of (['z','y'] as const).entries()) {
          const low=Math.min(0,...points.map(v=>v[axis])),high=Math.max(0,...points.map(v=>v[axis]));
          const x0=18+index*91,y0=y+8,width=80,height=32,span=high-low||1;
          const py=(v:number)=>y0+height-(v-low)*height/span;
          doc.setTextColor(25,40,55);doc.setFontSize(9);doc.text(axis==='z'?'Vertical':'Lateral',x0,y+3);
          doc.setDrawColor(160);doc.line(x0,py(0),x0+width,py(0));
          shapes.forEach((shape,k)=>{doc.setDrawColor(...(k===2?[20,160,100]:k?[230,130,20]:[40,110,190]) as [number,number,number]);for(let j=1;j<shape.length;j++)doc.line(x0+width*shape[j-1].x/(2*r.result.halfLength),py(shape[j-1][axis]),x0+width*shape[j].x/(2*r.result.halfLength),py(shape[j][axis]));});
          chosen.supports?.forEach(v=>{const sx=x0+width*v.x/(2*r.result.halfLength);doc.setDrawColor(...(v.state==='contact'?[20,160,100]:v.state==='detached'?[230,130,20]:[140,140,140]) as [number,number,number]);doc.triangle(sx,py(0)+0.5,sx-1.2,py(0)+2.5,sx+1.2,py(0)+2.5,'S');});
          doc.setFontSize(7);doc.text(`${axis}: ${f(low,'mm')} to ${f(high,'mm')}`,x0,y0+height+6);
          doc.text(`x: 0 to ${f(r.result.halfLength/500,'m')}`,x0,y0+height+10);
        }
        y+=64;
      }
      if(!s.target && s.worst) {
        text(`Incomplete path: largest computed bound ${f(s.worst.vm,'MPa')} during ${s.worst.phase}, fraction ${s.worst.fraction}. No completed target or converged verdict.`);
        table('Available phase diagnostics',['Phase','VM beam bound','Effective force'],phasePeaks(s.stages).map(v=>[v.phase,f(v.vm,'MPa'),f(v.N,'N')]));
      }
      if(!s.refinement.length) text('No completed mesh/path refinement level.');
      else table('Mesh and path refinement',['Elements / increments','VM bound','Max actuator force','Excavated midpoint','Relative change'],s.refinement.map(v=>[`${v.elements} / ${v.increments}`,f(v.vm,'MPa'),f(v.maxForce,'N'),f(v.sag,'mm'),Number.isFinite(v.change)?`${(v.change*100).toFixed(4)}%`:'First level']));
    }
  }
  if(r.samples.length)table('Exploratory search samples',['Half-length / amplitude / count','Status','Max utilization'],r.samples.map(s=>[i.mode==='supports'?`${s.value} supports`:i.mode==='length'?f(s.value/1000,'m'):f(s.value,'mm'),STATUS[s.status],s.maxUtilization===null?'-':`${(s.maxUtilization*100).toFixed(2)}%`]));
  for(let k=1;k<=doc.getNumberOfPages();k++){doc.setPage(k);doc.setTextColor(90);doc.setFontSize(8);doc.text('GMC | Temporary steel pipe deflection | Custom criterion only',16,12);doc.text(`${r.version} | ${k} / ${doc.getNumberOfPages()}`,16,288);}
  return doc;
}
