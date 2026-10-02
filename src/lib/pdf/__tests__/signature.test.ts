import {describe,it,expect} from 'vitest';
import {jsPDF} from 'jspdf';
import {addSignature} from '../signature';
describe('shared report signature space',()=>{
 it('keeps the box clear of the footer and starts a new page only when needed',()=>{
  for(const y of [24,244,245,275]){
   const doc=new jsPDF();
   addSignature(doc,y);
   expect(doc.getNumberOfPages()).toBe(y>244?2:1);
   expect(doc.output().match(/\(Signature\)/g)).toHaveLength(1);
  }
 });
});
