import {describe,it,expect} from 'vitest';
import {buildPdfFileName} from '../file-name';
describe('PDF file identity',()=>{
 it('uses study, normalized initials, user-local timestamp and format',()=>{
  expect(buildPdfFileName('pipe-sag','Émile Jean-Dupont',new Date(2026,9,2,15,30),'complete')).toBe('pipe-sag_EJD_202610021530_complete');
 });
 it('handles winter time, midnight, unsafe names and invalid dates',()=>{
  expect(buildPdfFileName('in-serv-defl','Giovanni Malagnino',new Date(2027,0,1,0,5))).toBe('in-serv-defl_GM_202701010005');
  expect(buildPdfFileName('../study / x','../ A / B',new Date(2026,0,2,13,0))).toBe('study-x_AB_202601021300');
  expect(()=>buildPdfFileName('pipe-sag','GM',new Date('bad'))).toThrow();
 });
});
