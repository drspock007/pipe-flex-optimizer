const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import { mkdirSync,writeFileSync } from 'node:fs';
import { DEFAULT_SERVICE } from '../src/lib/in-service/types';
import { runService } from '../src/lib/in-service/run';
import { createServicePdf } from '../src/lib/in-service/report';
const input={...structuredClone(DEFAULT_SERVICE),allowablePercent:80,scenarios:[
  {id:'ref',name:'Reference: temperature equal to current; zero extra axial force (hypotheses)',referenceTemperature:20,extraAxial:0},
  {id:'cold',name:'Lower reference temperature: 10 C, with additional compression of 5 kN',referenceTemperature:10,extraAxial:-5000},
]};
const report=runService(input);
mkdirSync('output/pdf',{recursive:true});
for(const system of ['SI','Imperial'] as const){
  const pdf=createServicePdf(report,system,{},undefined,identity);
  writeFileSync(`output/pdf/in-service-${system}.pdf`,Buffer.from(pdf.output('arraybuffer')));
  console.log(system,pdf.getNumberOfPages(),'pages');
}
writeFileSync('output/pdf/in-service-report.json',JSON.stringify(report,null,2));
console.log(report.result?.scenarios.map(s=>({name:s.scenario.name,status:s.status,vm:s.worst?.vm,refinement:s.refinement})));
