const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import { mkdirSync,writeFileSync } from 'node:fs';
import { DEFAULT_SERVICE,type ServiceInput } from '../src/lib/in-service/types';
import { runService } from '../src/lib/in-service/run';
import { createServicePdf } from '../src/lib/in-service/report';
const input:ServiceInput={...DEFAULT_SERVICE,od:219.1,thickness:8.18,halfLength:20000,pressure:2.9,temperature:10,
  scenarios:[{id:'base',name:'40 m excavation, reference temperature 10 C',referenceTemperature:10,extraAxial:0}],
  coatingType:'yellowJacket',fluidType:'naturalGas',allowablePercent:40,displacement:150,mode:'supports',maxSupports:10};
const report=runService(input);
mkdirSync('output/pdf',{recursive:true});
for(const system of ['SI','Imperial'] as const){
  const pdf=createServicePdf(report,system,{},undefined,identity);
  writeFileSync(`output/pdf/supports-${system}.pdf`,Buffer.from(pdf.output('arraybuffer')));
  console.log(system,pdf.getNumberOfPages(),'pages');
}
writeFileSync('output/pdf/supports-report.json',JSON.stringify(report,null,2));
console.log(report.message,report.samples);
console.log(report.result?.scenarios.map(s=>({status:s.status,vm:s.worst?.vm,phase:s.worst?.phase,target:s.target?.supports,levels:s.refinement})));
