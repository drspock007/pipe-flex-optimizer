const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import { mkdirSync,writeFileSync } from 'node:fs';
import { DEFAULT_SERVICE, type ServiceInput } from '../src/lib/in-service/types';
import { emptyCsa } from '../src/lib/in-service/csa';
import { runService } from '../src/lib/in-service/run';
import { createServicePdf } from '../src/lib/in-service/report';
const input:ServiceInput={...DEFAULT_SERVICE,supports:{kind:'equidistant',count:2},csa:{...emptyCsa(),enabled:true,eligibleSteel:true,plainPipeline:true,anchored:true,designPressure:2,designTemperature:40,anchoringTemperature:20,nominalThickness:7.11,allowance:0,smys:359}};
mkdirSync('output/pdf',{recursive:true});
for(const state of ['pass','fail','missing'] as const){
  const i=structuredClone(input);
  if(state==='fail'){i.csa.nominalThickness=2;i.csa.smys=50;}
  if(state==='missing'){i.csa.anchoringTemperature=NaN;i.csa.eligibleSteel=false;}
  const report=runService(i);
  for(const units of ['SI','Imperial'] as const){
    const doc=createServicePdf(report,units,{},undefined,identity);
    writeFileSync(`output/pdf/csa-${state}-${units}.pdf`,Buffer.from(doc.output('arraybuffer')));
    console.log(state,units,doc.getNumberOfPages());
  }
}
