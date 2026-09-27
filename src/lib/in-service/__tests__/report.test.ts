import { describe,it,expect } from 'vitest';
import { DEFAULT_SERVICE } from '../types';
import { runService } from '../run';
import { createServicePdf } from '../report';
describe('in-service PDF snapshot',()=>{
  it('exports the calculated snapshot in both unit systems without mutating it',()=>{
    const report=runService({...structuredClone(DEFAULT_SERVICE),allowablePercent:80,displacement:50});
    const before=structuredClone(report);
    for(const system of ['SI','Imperial'] as const){
      const doc=createServicePdf(report,system);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
      const pdf=doc.output();
      expect(pdf).toContain('Custom criterion');expect(pdf).toContain('Mesh and path refinement');
      expect(pdf).toContain('Vertical');expect(pdf).toContain('Lateral');
    }
    expect(report).toEqual(before);
  });
});
