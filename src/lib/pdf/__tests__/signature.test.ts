import {describe,it,expect} from 'vitest';
import {jsPDF} from 'jspdf';
import {addSignature} from '../signature';
describe('shared report signature space',()=>{
 it('uses the reserved signing area without adding a signature-only page',()=>{
  for(const y of [24,244,245,275]){
   const doc=new jsPDF();
   addSignature(doc,y);
   expect(doc.getNumberOfPages()).toBe(1);
   expect(doc.output().match(/\(Signature\)/g)).toHaveLength(1);
  }
 });
});
