import fs from 'node:fs';
import {backfillLoad} from '../src/lib/in-service/permanent/backfill-load';
import {runService} from '../src/lib/in-service/run';
import {permanentFixture} from '../src/lib/in-service/permanent/__tests__/fixture';
import {createPermanentPdf} from '../src/lib/in-service/permanent/report';
import {LIGHT_PDF} from '../src/lib/in-service/pdf-theme';
const input=permanentFixture();input.supports={kind:'custom',fractions:[.25,.75]};const zone=input.permanent.zones[0];zone.material='Sand and gravel mixture';zone.loadEstimate={cover:1,width:zone.weight*1000/(1800*9.80665),density:1800};zone.weight=backfillLoad(zone.loadEstimate);const r=runService(input);if(r.permanent.scenarios[0].status!=='complete')throw new Error(r.permanent.scenarios[0].message);
fs.mkdirSync('output/pdf',{recursive:true});
for(const system of ['SI','Imperial'] as const)for(const complete of [false,true]){
 const doc=createPermanentPdf(r,system,LIGHT_PDF,{preparedBy:'Verification engineer',projectName:'Permanent elastic sequence - synthetic verification case',date:new Date('2026-09-28T16:00:00Z')},complete);
 const name=`permanent-${complete?'complete':'summary'}-${system}`;fs.writeFileSync(`output/pdf/${name}.pdf`,Buffer.from(doc.output('arraybuffer')));console.log(name,doc.getNumberOfPages());
}
fs.writeFileSync('output/pdf/permanent-snapshot.json',JSON.stringify(r));
