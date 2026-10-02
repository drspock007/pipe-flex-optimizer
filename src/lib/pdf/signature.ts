import type {jsPDF} from 'jspdf';

/** Blank signing space on the final page of every report, clear of content and footers. */
export function addSignature(doc:jsPDF,_cursorY:number,colors?:{
 foreground:[number,number,number];border:[number,number,number];
},margin=16){
 // Report renderers reserve the area below 260 mm before laying out content.
 // Never append a signature-only page.
 const top=264;
 doc.setDrawColor(...(colors?.border??[120,120,120] as [number,number,number]));
 doc.setLineWidth(.3);
 doc.setTextColor(...(colors?.foreground??[30,30,30] as [number,number,number]));
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 doc.text('Signature',margin,top);
 doc.rect(margin,top+2,80,12);
}
