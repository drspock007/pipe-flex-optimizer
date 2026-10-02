import fs from 'node:fs';
import {DEFAULT_SERVICE,type ServiceInput} from '../src/lib/in-service/types';
import {runService} from '../src/lib/in-service/run';
import {emptyCsa} from '../src/lib/in-service/csa';
import {createServicePdf} from '../src/lib/in-service/report';
import {createServiceSummary} from '../src/lib/in-service/report-summary';
import {LIGHT_PDF,hslRgb} from '../src/lib/in-service/pdf-theme';
const base:ServiceInput={...DEFAULT_SERVICE,analysis:'sag',sag:{version:1,boundary:'simple',confirmed:true,limit:10},pressure:0,fluidDensity:0,halfLength:3000,csa:{...emptyCsa(),enabled:true}};
const cases:Record<string,ServiceInput>={
 simple:base,
 stress:{...base,csa:undefined,od:114.3,thickness:6.02,halfLength:9000,coatingType:'fbeAro',coatingThickness:1.5,allowablePercent:30,sag:{...base.sag,limit:600}},
 clamped:{...base,sag:{version:1,boundary:'clamped',confirmed:true,limit:1},pressure:2,halfLength:5000,scenarios:[...base.scenarios,{...base.scenarios[0],id:'fail',name:'Unresolved compression scenario',extraAxial:-1e9}]},
 search:{...base,mode:'length',minHalfLength:1000,maxHalfLength:6000},
};
const identity={preparedBy:'Verification engineer',projectName:'Sag-only regression and rendering checks',date:new Date('2026-10-01T16:00:00Z')};
fs.mkdirSync('output/pdf',{recursive:true});
for(const [name,i] of Object.entries(cases)){
 const r=runService(i),palette=name==='search'?{...LIGHT_PDF,background:hslRgb('222 47% 11%'),foreground:hslRgb('210 40% 98%'),card:hslRgb('217 33% 17%'),muted:hslRgb('215 20% 65%'),border:hslRgb('217 33% 25%')}:LIGHT_PDF;
 for(const unit of ['SI','Imperial'] as const)for(const complete of [false,true]){
  const doc=complete?createServicePdf(r,unit,{},palette,identity):createServiceSummary(r,unit,palette,identity),file=`output/pdf/sag-${name}-${complete?'complete':'summary'}-${unit}.pdf`;
  fs.writeFileSync(file,Buffer.from(doc.output('arraybuffer')));console.log(file,doc.getNumberOfPages());
 }
}
