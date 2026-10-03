const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import { writeFileSync } from 'node:fs';
import { DEFAULT_SERVICE } from '../src/lib/in-service/types';
import { emptyCsa } from '../src/lib/in-service/csa';
import { runService } from '../src/lib/in-service/run';
import { createServiceSummary } from '../src/lib/in-service/report-summary';
import { createServicePdf } from '../src/lib/in-service/report';
import { printPdfPalette } from '../src/lib/in-service/pdf-theme';
const r=runService({...DEFAULT_SERVICE,supports:{kind:'equidistant',count:2},csa:{...emptyCsa(),enabled:true}});
for(const theme of ['light','dark'])for(const units of ['SI','Imperial'] as const)for(const kind of ['summary','complete']){
 const p=printPdfPalette();
 const doc=kind==='summary'?createServiceSummary(r,units,p,identity):createServicePdf(r,units,{},p,identity);
 writeFileSync(`output/pdf/review-${kind}-${theme}-${units}.pdf`,Buffer.from(doc.output('arraybuffer')));console.log(kind,theme,units,doc.getNumberOfPages());
}
