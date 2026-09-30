const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import { writeFileSync } from 'node:fs';
import { DEFAULT_SERVICE } from '../src/lib/in-service/types';
import { emptyCsa } from '../src/lib/in-service/csa';
import { runService } from '../src/lib/in-service/run';
import { createServiceSummary } from '../src/lib/in-service/report-summary';
import { createServicePdf } from '../src/lib/in-service/report';
import { LIGHT_PDF,hslRgb } from '../src/lib/in-service/pdf-theme';
const r=runService({...DEFAULT_SERVICE,supports:{kind:'equidistant',count:2},csa:{...emptyCsa(),enabled:true}});
for(const theme of ['light','dark'])for(const units of ['SI','Imperial'] as const)for(const kind of ['summary','complete']){
 const p=theme==='light'?LIGHT_PDF:{...LIGHT_PDF,background:hslRgb('222 47% 11%'),foreground:hslRgb('210 40% 98%'),card:hslRgb('217 33% 17%'),muted:hslRgb('215 20% 65%'),border:hslRgb('217 33% 25%')};
 const doc=kind==='summary'?createServiceSummary(r,units,p,identity):createServicePdf(r,units,{},p,identity);
 writeFileSync(`output/pdf/review-${kind}-${theme}-${units}.pdf`,Buffer.from(doc.output('arraybuffer')));console.log(kind,theme,units,doc.getNumberOfPages());
}
