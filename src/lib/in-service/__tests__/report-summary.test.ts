const identity={preparedBy:'Report tester',projectName:'Verification project',date:new Date('2026-09-27T16:30:00Z')};
import {describe,it,expect} from 'vitest';
import {runService} from '../run';
import {DEFAULT_SERVICE} from '../types';
import {createServiceSummary} from '../report-summary';
import {hslRgb,LIGHT_PDF} from '../pdf-theme';
describe('summary PDF',()=>{
 it('exports a single readable sheet in either unit system from the unchanged snapshot',()=>{
  const r=runService({...DEFAULT_SERVICE,supports:{kind:'equidistant',count:2}}),before=structuredClone(r);
  for(const u of ['SI','Imperial'] as const){const d=createServiceSummary(r,u,undefined,identity);expect(d.getNumberOfPages()).toBe(1);const text=d.output();expect(text).toContain('Calculation conditions');expect(text).toContain('Essential results');expect(text).toContain('von Mises');expect(text).toContain('How to read it');expect(text).toContain('Vertical:');expect(text).toContain('Axial + tension');expect(text).not.toContain('Maximum VM beam bound');expect(text).toContain('Support 1');expect(text).not.toContain('Mesh and path refinement');}
  expect(r).toEqual(before);
 });
 it('never presents a diagnostic search sample as a candidate',()=>{
  const r=runService(DEFAULT_SERVICE);r.input.mode='length';r.candidate=undefined;r.budgetExhausted=true;
  const text=createServiceSummary(r,'SI',undefined,identity).output();expect(text).toContain('DIAGNOSTIC SAMPLE ONLY');expect(text).toContain('Search budget exhausted');
 });
 it('uses exact CSS HSL values for the theme',()=>{expect(hslRgb('34 100% 51%')).toEqual(LIGHT_PDF.primary);expect(hslRgb('222 47% 11%')).toEqual(LIGHT_PDF.foreground);});
});
