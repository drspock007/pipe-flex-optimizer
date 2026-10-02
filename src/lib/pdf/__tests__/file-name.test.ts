import {describe,it,expect} from 'vitest';
import {buildPdfFileName} from '../file-name';
describe('PDF file identity',()=>{
 it('uses study, normalized initials, Rome timestamp and format',()=>{
  expect(buildPdfFileName('pipe-sag','Émile Jean-Dupont',new Date('2026-10-02T13:30:00Z'),'complete')).toBe('pipe-sag_EJD_202610021530_complete');
 });
 it('handles winter time, midnight, unsafe names and invalid dates',()=>{
  expect(buildPdfFileName('in-serv-defl','Giovanni Malagnino',new Date('2026-12-31T23:05:00Z'))).toBe('in-serv-defl_GM_202701010005');
  expect(buildPdfFileName('../study / x','../ A / B',new Date('2026-01-02T12:00:00Z'))).toBe('study-x_AB_202601021300');
  expect(()=>buildPdfFileName('pipe-sag','GM',new Date('bad'))).toThrow();
 });
});
