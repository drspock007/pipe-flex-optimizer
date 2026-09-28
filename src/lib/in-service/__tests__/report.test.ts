const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import { describe,it,expect } from 'vitest';
import { DEFAULT_SERVICE } from '../types';
import { runService } from '../run';
import { createServicePdf } from '../report';
describe('in-service PDF snapshot',()=>{
  it('exports the calculated snapshot in both unit systems without mutating it',()=>{
    const report=runService({...structuredClone(DEFAULT_SERVICE),allowablePercent:80,displacement:50});
    const before=structuredClone(report);
    for(const system of ['SI','Imperial'] as const){
      const doc=createServicePdf(report,system,{},undefined,identity);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
      const pdf=doc.output();
      expect(pdf).toContain('Custom criterion');expect(pdf).toContain('Mesh and path refinement');
      expect(pdf).toContain('Vertical');expect(pdf).toContain('Lateral');
    }
    expect(report).toEqual(before);
  });
  it('exports support reactions and the selected stage from the completed snapshot',()=>{
    const report=runService({...DEFAULT_SERVICE,allowablePercent:80,displacement:100,supports:{kind:'equidistant',count:2}});
    const before=structuredClone(report),id=report.input.scenarios[0].id;
    for(const system of ['SI','Imperial'] as const){
      const pdf=createServicePdf(report,system,{[id]:0},undefined,identity).output();
      expect(pdf).toContain('Support reactions and contacts');expect(pdf).toContain('Selected stage: initial');
      expect(pdf).toContain('Contact path diagnostics');
    }
    expect(report).toEqual(before);
  });

});
